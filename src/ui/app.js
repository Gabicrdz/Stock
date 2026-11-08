// ui/app.js — Lo que comparte toda la interfaz: navegación, mensajes y pedidos al main.

// Cada vista-*.js se registra acá. Ejemplo: vistas.productos = { alMostrar: cargar }
const vistas = {};

// Ajustes del negocio (se cargan al arrancar; Ajustes los actualiza)
let configuracion = { nombre_negocio: 'Mi Almacén' };

// ---------- Navegación ----------
function mostrarVista(nombre) {
  for (const seccion of document.querySelectorAll('.vista')) {
    seccion.hidden = seccion.id !== `vista-${nombre}`;
  }
  for (const boton of document.querySelectorAll('[data-vista]')) {
    boton.classList.toggle('activo', boton.dataset.vista === nombre);
  }
  // Cada vez que se entra a una vista, recarga sus datos
  vistas[nombre]?.alMostrar?.();
}

for (const boton of document.querySelectorAll('[data-vista]')) {
  boton.addEventListener('click', () => mostrarVista(boton.dataset.vista));
}

// ---------- Mensajes flotantes ----------
const mensaje = document.getElementById('mensaje');
let temporizadorMensaje;

function mostrarMensaje(texto, tipo = 'exito') {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo} visible`;
  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(() => mensaje.classList.remove('visible'), 3000);
}

// ---------- Pedidos al main ----------
// Si sale bien devuelve los datos. Si falla, muestra el error y devuelve null.
// errorEn (opcional): elemento donde mostrar el error, por ejemplo dentro de un diálogo.
async function pedir(promesa, errorEn) {
  const respuesta = await promesa;
  if (respuesta.ok) return respuesta.datos;

  if (errorEn) errorEn.textContent = respuesta.error;
  else mostrarMensaje(respuesta.error, 'error');
  return null;
}

async function confirmar(opciones) {
  const respuesta = await window.api.confirmar(opciones);
  return respuesta.ok && respuesta.datos === true;
}

// ---------- Aviso de reposición en la pestaña "Productos" ----------
// Recibe el resumen (lo pide la vista de productos) y muestra cuántos hay que reponer
function actualizarAvisoReponer(resumen) {
  const aviso = document.getElementById('aviso-reponer');
  const cantidad = resumen.bajo + resumen.sinStock;
  aviso.textContent = cantidad;
  aviso.hidden = cantidad === 0;
}

// Pide el resumen y actualiza el aviso (después de registrar o anular un movimiento)
async function refrescarAvisoReponer() {
  const resumen = await pedir(window.api.resumenStock());
  if (resumen !== null) actualizarAvisoReponer(resumen);
}

// ---------- Saltar de una pantalla a otra ----------
// Abre Productos filtrado por una categoría (desde la pantalla de Categorías)
function irAProductosDeCategoria(categoriaId) {
  vistas.productos.filtrarPorCategoria(categoriaId);
  mostrarVista('productos');
}

// Abre la ficha de un producto (por ejemplo, desde Reportes)
function irAProducto(id) {
  vistas.productos.mostrarProducto(id);
  mostrarVista('productos');
}

// Abre Movimientos con los de un solo producto (desde su ficha)
function irAMovimientosDeProducto(producto) {
  vistas.movimientos.filtrarPorProducto(producto);
  mostrarVista('movimientos');
}

// ---------- Nombre del negocio ----------
// En el menú y en la barra de Windows
function aplicarMarca() {
  document.getElementById('marca-nombre').textContent = configuracion.nombre_negocio;
  document.title = `${configuracion.nombre_negocio} — Control de stock`;
}

async function cargarConfiguracion() {
  const datos = await pedir(window.api.obtenerConfiguracion());
  if (datos === null) return;
  configuracion = datos;
  aplicarMarca();
}

// Al arrancar: el nombre del negocio y la lista de productos
document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracion();
  mostrarVista('productos');
});
