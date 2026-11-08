// db/conexion.js — Abre la base de datos, aplica las migraciones
// y tiene ayudantes que usan los demás archivos de /db.
// (Es el mismo esquema que el del gimnasio: lo que funciona, se reutiliza.)

const Database = require('better-sqlite3');
const path = require('node:path');
const { app } = require('electron');

let db = null;
let rutaActual = null;

// ---------- Migraciones ----------
// Cada función de la lista es una versión de la base (posición 0 = versión 1).
// REGLA DE ORO: nunca modificar una migración que ya se ejecutó en la compu
// de un cliente. Para cambiar algo, se agrega una función NUEVA al final.
const MIGRACIONES = [
  // ===== Versión 1 (etapa 1): categorías, productos y movimientos =====
  () => {
    db.exec(`
      CREATE TABLE categorias (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL COLLATE NOCASE UNIQUE,
        activo INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE productos (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        -- Código de barras o código interno. Puede faltar (NULL), pero no repetirse.
        codigo         TEXT COLLATE NOCASE UNIQUE,
        nombre         TEXT NOT NULL,
        categoria_id   INTEGER REFERENCES categorias(id) ON DELETE RESTRICT,
        unidad         TEXT NOT NULL CHECK (unidad IN ('unidad', 'kg', 'litro')),
        -- Plata en centavos, por unidad / por kg / por litro
        costo_centavos  INTEGER NOT NULL DEFAULT 0 CHECK (costo_centavos >= 0),
        precio_centavos INTEGER NOT NULL CHECK (precio_centavos >= 0),
        -- Cantidades en MILÉSIMAS (como los centavos, pero para cantidades):
        -- 1 unidad = 1000 · 1,250 kg = 1250 · 0,5 litros = 500
        stock_minimo   INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
        activo         INTEGER NOT NULL DEFAULT 1,
        busqueda       TEXT NOT NULL DEFAULT '',  -- nombre y código sin acentos, para buscar
        orden          TEXT NOT NULL DEFAULT '',  -- nombre sin acentos, para ordenar
        creado_en      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX idx_productos_orden ON productos(orden);
      CREATE INDEX idx_productos_categoria ON productos(categoria_id);

      -- El stock NO se guarda en productos: es la SUMA de sus movimientos.
      -- Como un extracto del banco: el saldo sale de las operaciones.
      CREATE TABLE movimientos (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_id    INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
        tipo           TEXT NOT NULL
                       CHECK (tipo IN ('inicial', 'compra', 'venta', 'merma', 'devolucion', 'ajuste')),
        -- Positiva si entra mercadería, negativa si sale. En milésimas.
        cantidad       INTEGER NOT NULL CHECK (cantidad <> 0),
        -- "Foto" del costo en ese momento (para saber cuánto valía lo que entró)
        costo_centavos INTEGER,
        motivo         TEXT,
        fecha          TEXT NOT NULL,   -- "AAAA-MM-DD"
        creado_en      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX idx_movimientos_producto ON movimientos(producto_id);
      CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
    `);
  },

  // ===== Versión 2 (etapa 2): anular movimientos y precio de venta =====
  () => {
    db.exec(`
      -- Un movimiento cargado por error no se borra: se ANULA y deja de sumar al stock
      ALTER TABLE movimientos ADD COLUMN anulado INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE movimientos ADD COLUMN anulado_en TEXT;

      -- "Foto" del precio al que se vendió (para los reportes de la etapa 3)
      ALTER TABLE movimientos ADD COLUMN precio_centavos INTEGER;

      CREATE INDEX idx_movimientos_producto_fecha ON movimientos(producto_id, fecha);
    `);
  },

  // ===== Versión 3 (etapa 4): ajustes del sistema =====
  // Pares clave → valor: agregar un ajuste nuevo no necesita cambiar la tabla.
  () => {
    db.exec(`
      CREATE TABLE configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
      INSERT INTO configuracion (clave, valor) VALUES ('nombre_negocio', 'Mi Almacén');
    `);
  },

  // Las próximas migraciones van acá abajo.
];

function migrar() {
  const versionActual = db.pragma('user_version', { simple: true });

  MIGRACIONES.forEach((migracion, indice) => {
    const version = indice + 1;
    if (version <= versionActual) return; // ya estaba aplicada

    // Cada migración en su transacción: o se aplica completa o no se aplica
    const aplicar = db.transaction(() => {
      migracion();
      db.pragma(`user_version = ${version}`);
    });
    aplicar();
    console.log(`Migración ${version} aplicada`);
  });
}

// ---------- Abrir y cerrar ----------
function rutaBaseDeDatos() {
  return rutaActual ?? path.join(app.getPath('userData'), 'stock.db');
}

function iniciarBaseDeDatos() {
  const ruta = rutaBaseDeDatos();
  rutaActual = ruta;
  db = new Database(ruta);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrar();
  console.log('Base de datos lista en:', ruta);
}

// Los demás módulos piden la base con esta función (y no con una variable)
// porque cuando hacen el require, la base todavía no está abierta.
function obtenerDb() {
  if (!db) throw new Error('La base de datos no está iniciada');
  return db;
}

function cerrarBaseDeDatos() {
  if (db) db.close();
  db = null;
}

function baseAbierta() {
  return db !== null;
}

const VERSION_BASE = MIGRACIONES.length;

// ---------- Ayudantes para validar ----------
// Convierte a texto, saca espacios de los bordes y recorta al máximo permitido
function texto(valor, maximo) {
  return String(valor ?? '').trim().slice(0, maximo);
}

function validarId(id, nombre = 'ID') {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${nombre} inválido`);
  }
}

// Fecha de hoy en la compu, como "AAAA-MM-DD"
function hoy() {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// Hora de la compu como "HH:MM"
function horaActual() {
  const fecha = new Date();
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

// "2026-02-31" tiene buen formato pero no existe. SQLite no avisa:
// lo convierte en silencio a "2026-03-03". Por eso lo verificamos acá.
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaReal(valor) {
  if (!FECHA_VALIDA.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

function fechaObligatoria(valor, nombreCampo = 'Fecha') {
  const limpio = String(valor ?? '').trim();
  if (!esFechaReal(limpio)) throw new Error(`${nombreCampo}: fecha inválida`);
  return limpio;
}

// "Azúcar" → "azucar": sin acentos y en minúscula, para buscar y ordenar bien.
function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// En LIKE, "%" y "_" son comodines. Si el usuario los escribe, los buscamos como texto.
function escaparLike(valor) {
  return valor.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

module.exports = {
  iniciarBaseDeDatos,
  obtenerDb,
  cerrarBaseDeDatos,
  baseAbierta,
  rutaBaseDeDatos,
  VERSION_BASE,
  texto,
  validarId,
  hoy,
  horaActual,
  normalizar,
  escaparLike,
  fechaObligatoria,
};
