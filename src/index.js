// index.js — Proceso MAIN del sistema de stock.
// Abre la ventana, la base de datos, y atiende los pedidos de la ventana (IPC).

const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('node:path');
const conexion = require('./db/conexion');
const categorias = require('./db/categorias');
const productos = require('./db/productos');
const movimientos = require('./db/movimientos');
const reportes = require('./db/reportes');

if (require('electron-squirrel-startup')) {
  app.quit();
}

// Idioma de la app: fechas y números en español de Argentina,
// aunque la compu del cliente tenga Windows en inglés.
app.commandLine.appendSwitch('lang', 'es-AR');

// Carpeta de datos FIJA (...\AppData\Roaming\stock), así no cambia si algún día
// le cambiamos el nombre al programa. Lo aprendimos en el gimnasio.
app.setPath('userData', path.join(app.getPath('appData'), 'stock'));

let ventana = null;

// Siempre responde { ok: true, datos } o { ok: false, error }
function manejar(canal, funcion) {
  ipcMain.handle(canal, async (evento, ...argumentos) => {
    try {
      const datos = await funcion(...argumentos);
      return { ok: true, datos };
    } catch (error) {
      console.error(`[${canal}]`, error);
      return { ok: false, error: error.message };
    }
  });
}

// ---------- Categorías ----------
manejar('categorias:listar', (opciones) => categorias.listarCategorias(opciones));
manejar('categorias:crear', (datos) => categorias.crearCategoria(datos));
manejar('categorias:renombrar', (id, datos) => categorias.renombrarCategoria(id, datos));
manejar('categorias:cambiar-estado', (id, activa) => categorias.cambiarEstadoCategoria(id, activa));

// ---------- Productos ----------
manejar('productos:listar', (filtros) => productos.listarProductos(filtros));
manejar('productos:obtener', (id) => productos.obtenerProducto(id));
manejar('productos:resumen', () => productos.resumenStock());
manejar('productos:crear', (datos) => productos.crearProducto(datos));
manejar('productos:actualizar', (id, datos) => productos.actualizarProducto(id, datos));
manejar('productos:cambiar-estado', (id, activo) => productos.cambiarEstadoProducto(id, activo));

// ---------- Movimientos (compras, ventas, mermas, devoluciones, ajustes) ----------
manejar('movimientos:registrar', (datos) => movimientos.registrarMovimiento(datos));
manejar('movimientos:anular', (id) => movimientos.anularMovimiento(id));
manejar('movimientos:de-producto', (productoId, limite) => movimientos.historialDeProducto(productoId, limite));
manejar('movimientos:listar', (filtros) => movimientos.listarMovimientos(filtros));

// ---------- Reportes ----------
manejar('reportes:obtener', (filtros) => reportes.obtenerReportes(filtros));

// ---------- Compartir la lista de compras ----------
// Solo aceptamos TEXTO. La dirección de WhatsApp la arma el main:
// la ventana nunca decide qué página se abre.
function textoParaCompartir(texto) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) throw new Error('No hay nada para compartir');
  if (limpio.length > 6000) throw new Error('La lista es demasiado larga para mandarla de una vez');
  return limpio;
}

manejar('sistema:copiar', (texto) => {
  clipboard.writeText(textoParaCompartir(texto));
  return true;
});

// wa.me sin número: WhatsApp se abre y pregunta a qué contacto mandarlo
manejar('sistema:whatsapp', async (texto) => {
  await shell.openExternal(`https://wa.me/?text=${encodeURIComponent(textoParaCompartir(texto))}`);
  return true;
});

// ---------- Confirmación genérica ----------
manejar('dialogo:confirmar', async (opciones) => {
  const { titulo = 'Confirmar', mensaje = '¿Seguro?', detalle = '', boton = 'Aceptar' } =
    opciones ?? {};

  const { response } = await dialog.showMessageBox(ventana, {
    type: 'warning',
    title: String(titulo),
    message: String(mensaje),
    detail: String(detalle),
    buttons: [String(boton), 'Cancelar'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });
  return response === 0;
});

// ---------- Ventana ----------
function crearVentana() {
  ventana = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 1000,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  ventana.loadFile(path.join(__dirname, 'index.html'));

  // SEGURIDAD: la ventana no puede irse a otra página ni abrir ventanas nuevas
  ventana.webContents.on('will-navigate', (evento) => evento.preventDefault());
  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // ventana.webContents.openDevTools();

  ventana.on('closed', () => {
    ventana = null;
  });
}

app.whenReady().then(() => {
  conexion.iniciarBaseDeDatos();
  crearVentana();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  conexion.cerrarBaseDeDatos();
});
