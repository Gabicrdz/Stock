// pruebas/copias.test.js — Ajustes y copias de seguridad: hacer, listar, validar y restaurar.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { iniciarSistema, carpeta, DatabaseSync, u } = require('./ayudantes');

const { conexion, productos, configuracion, copias } = iniciarSistema();
const nuevo = (nombre) => productos.crearProducto({ nombre, unidad: 'unidad', precioCentavos: 100000, stockInicial: u(5) });

test('configuración: nombre por defecto, se guarda limpio y no acepta vacío', () => {
  assert.equal(configuracion.obtenerConfiguracion().nombre_negocio, 'Mi Almacén');
  assert.equal(configuracion.guardarConfiguracion({ nombre_negocio: '  Almacén Don Pepe ' }).nombre_negocio, 'Almacén Don Pepe');
  assert.throws(() => configuracion.guardarConfiguracion({ nombre_negocio: '   ' }), /obligatorio/);
});

test('copia manual en Documentos\\Copias del stock', () => {
  nuevo('Yerba mate');
  const { nombre } = copias.hacerCopia('manual');
  assert.match(nombre, /^stock-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}_manual\.db$/);
  const lista = copias.listarCopias();
  assert.equal(lista.carpeta, path.join(carpeta, 'Documentos', 'Copias del stock'));
  assert.equal(lista.copias.length, 1);
});

test('la copia automática se hace una sola vez por día al abrir', () => {
  copias.copiaAutomatica({ soloSiNoHayDeHoy: true });
  copias.copiaAutomatica({ soloSiNoHayDeHoy: true });
  assert.equal(copias.listarCopias().copias.filter((c) => c.tipo === 'automatica').length, 1);
});

test('guarda solo las últimas 30 copias automáticas', () => {
  const { carpeta: carpetaCopias, copias: lista } = copias.listarCopias();
  const original = lista.find((c) => c.tipo === 'automatica').nombre;
  for (let dia = 1; dia <= 31; dia++) {
    fs.copyFileSync(path.join(carpetaCopias, original), path.join(carpetaCopias, `stock-2020-01-${String(dia).padStart(2, '0')}.db`));
  }
  copias.hacerCopia('automatica');
  const automaticas = copias.listarCopias().copias.filter((c) => c.tipo === 'automatica');
  assert.equal(automaticas.length, 30);
  assert.ok(!automaticas.some((c) => c.nombre === 'stock-2020-01-01.db'));
});

test('solo acepta nombres de copias, nunca rutas', () => {
  assert.throws(() => copias.rutaDeCopia('..\\..\\Windows\\algo.db'));
  assert.throws(() => copias.rutaDeCopia('gimnasio-2026-11-08.db'));
});

test('rechaza archivos que no son copias de este sistema', () => {
  const falso = path.join(carpeta, 'falso.db');
  fs.writeFileSync(falso, 'esto no es una base de datos');
  assert.throws(() => copias.validarArchivoDeCopia(falso));

  // Una base del gimnasio (otras tablas)
  const otra = path.join(carpeta, 'gimnasio.db');
  const base = new DatabaseSync(otra);
  base.exec('CREATE TABLE socios (id INTEGER); CREATE TABLE planes (id INTEGER);');
  base.close();
  assert.throws(() => copias.validarArchivoDeCopia(otra), { message: 'El archivo no es una copia de seguridad de este sistema.' });

  // Una copia de una versión más nueva del programa
  const futura = path.join(carpeta, 'futura.db');
  const manual = copias.listarCopias().copias.find((c) => c.tipo === 'manual').nombre;
  fs.copyFileSync(path.join(copias.listarCopias().carpeta, manual), futura);
  const vieja = new DatabaseSync(futura);
  vieja.exec(`PRAGMA user_version = ${conexion.VERSION_BASE + 1}`);
  vieja.close();
  assert.throws(() => copias.validarArchivoDeCopia(futura), /más nueva/);
});

test('restaurar vuelve los datos atrás y guarda un respaldo antes', () => {
  const manual = copias.listarCopias().copias.find((c) => c.tipo === 'manual').nombre;
  nuevo('Azúcar');
  assert.equal(productos.listarProductos().length, 2);

  const resultado = copias.restaurarCopia(copias.rutaDeCopia(manual));
  assert.equal(resultado.productos, 1);
  assert.match(resultado.respaldo, /antes-de-restaurar/);
  assert.equal(conexion.baseAbierta(), false); // la app se reinicia después de restaurar

  conexion.iniciarBaseDeDatos();
  assert.deepEqual(productos.listarProductos().map((p) => p.nombre), ['Yerba mate']);
  assert.equal(productos.listarProductos()[0].stock, u(5));
});
