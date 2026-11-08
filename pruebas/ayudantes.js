// pruebas/ayudantes.js — Funciones comunes para todas las pruebas.

const { carpeta, DatabaseSync } = require('./entorno'); // SIEMPRE primero
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'src');
const cargar = (modulo) => require(path.join(SRC, modulo));

// Abre una base nueva (con todas las migraciones) y devuelve los módulos del sistema
function iniciarSistema() {
  const conexion = cargar('db/conexion');
  conexion.iniciarBaseDeDatos();
  return {
    conexion,
    categorias: cargar('db/categorias'),
    productos: cargar('db/productos'),
  };
}

// Cantidades: 1 unidad = 1000 milésimas
const u = (cantidad) => Math.round(cantidad * 1000);

module.exports = { carpeta, DatabaseSync, cargar, iniciarSistema, u };
