// db/configuracion.js — Ajustes del sistema (por ahora, el nombre del negocio).
// Se guardan como pares clave → valor en la tabla configuracion.

const { obtenerDb, texto } = require('./conexion');

// Valores por defecto si una clave todavía no existe en la base
const POR_DEFECTO = {
  nombre_negocio: 'Mi Almacén',
};

function obtenerConfiguracion() {
  const filas = obtenerDb().prepare('SELECT clave, valor FROM configuracion').all();
  const configuracion = { ...POR_DEFECTO };
  for (const fila of filas) configuracion[fila.clave] = fila.valor;
  return configuracion;
}

function guardarConfiguracion(datos) {
  const nombre = texto(datos?.nombre_negocio, 40);
  if (!nombre) throw new Error('El nombre del negocio es obligatorio');

  // INSERT ... ON CONFLICT: si la clave ya existe, actualiza su valor ("upsert")
  obtenerDb()
    .prepare(
      `INSERT INTO configuracion (clave, valor) VALUES ('nombre_negocio', ?)
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
    )
    .run(nombre);

  return obtenerConfiguracion();
}

module.exports = { obtenerConfiguracion, guardarConfiguracion };
