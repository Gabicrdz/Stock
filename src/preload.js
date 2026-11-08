// preload.js — Lo que la ventana puede pedirle al main. Nada más.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Categorías
  listarCategorias: (opciones) => ipcRenderer.invoke('categorias:listar', opciones),
  crearCategoria: (datos) => ipcRenderer.invoke('categorias:crear', datos),
  renombrarCategoria: (id, datos) => ipcRenderer.invoke('categorias:renombrar', id, datos),
  cambiarEstadoCategoria: (id, activa) => ipcRenderer.invoke('categorias:cambiar-estado', id, activa),

  // Productos
  listarProductos: (filtros) => ipcRenderer.invoke('productos:listar', filtros),
  obtenerProducto: (id) => ipcRenderer.invoke('productos:obtener', id),
  resumenStock: () => ipcRenderer.invoke('productos:resumen'),
  crearProducto: (datos) => ipcRenderer.invoke('productos:crear', datos),
  actualizarProducto: (id, datos) => ipcRenderer.invoke('productos:actualizar', id, datos),
  cambiarEstadoProducto: (id, activo) => ipcRenderer.invoke('productos:cambiar-estado', id, activo),

  // Movimientos
  registrarMovimiento: (datos) => ipcRenderer.invoke('movimientos:registrar', datos),
  anularMovimiento: (id) => ipcRenderer.invoke('movimientos:anular', id),
  historialDeProducto: (productoId, limite) =>
    ipcRenderer.invoke('movimientos:de-producto', productoId, limite),
  listarMovimientos: (filtros) => ipcRenderer.invoke('movimientos:listar', filtros),

  // Reportes
  obtenerReportes: (filtros) => ipcRenderer.invoke('reportes:obtener', filtros),

  // Compartir
  copiarTexto: (texto) => ipcRenderer.invoke('sistema:copiar', texto),
  enviarPorWhatsApp: (texto) => ipcRenderer.invoke('sistema:whatsapp', texto),

  // Diálogos
  confirmar: (opciones) => ipcRenderer.invoke('dialogo:confirmar', opciones),
});
