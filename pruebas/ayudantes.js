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
    movimientos: cargar('db/movimientos'),
    reportes: cargar('db/reportes'),
  };
}

// Cantidades: 1 unidad = 1000 milésimas
const u = (cantidad) => Math.round(cantidad * 1000);

// Fecha "AAAA-MM-DD" a X días de hoy (negativo = en el pasado), calculada igual que el sistema
function fechaDesdeHoy(dias) {
  const fecha = new Date();
  fecha.setHours(12, 0, 0, 0);
  fecha.setDate(fecha.getDate() + dias);
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

module.exports = { carpeta, DatabaseSync, cargar, iniciarSistema, u, fechaDesdeHoy };
