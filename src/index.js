// index.js — Proceso MAIN del sistema de stock.
// Abre la ventana, la base de datos, y atiende los pedidos de la ventana (IPC).

const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('node:path');
const conexion = require('./db/conexion');
const categorias = require('./db/categorias');
const productos = require('./db/productos');
const movimientos = require('./db/movimientos');
const reportes = require('./db/reportes');
const configuracion = require('./db/configuracion');
const copias = require('./db/copias');

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

// ---------- Ajustes ----------
manejar('configuracion:obtener', () => configuracion.obtenerConfiguracion());
manejar('configuracion:guardar', (datos) => configuracion.guardarConfiguracion(datos));

// ---------- Copias de seguridad ----------
manejar('copias:listar', () => copias.listarCopias());
manejar('copias:hacer', () => copias.hacerCopia('manual'));

manejar('copias:elegir-carpeta', async () => {
  const resultado = await dialog.showOpenDialog(ventana, {
    title: 'Elegí dónde guardar las copias de seguridad',
    defaultPath: copias.carpetaDeCopias(),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (resultado.canceled || resultado.filePaths.length === 0) return null;
  return copias.cambiarCarpeta(resultado.filePaths[0]);
});

// Restaurar: la ventana manda el nombre de una copia de la lista,
// o null para elegir un archivo con el explorador de Windows.
manejar('copias:restaurar', async (nombre) => {
  let ruta;
  if (nombre) {
    ruta = copias.rutaDeCopia(nombre);
  } else {
    const resultado = await dialog.showOpenDialog(ventana, {
      title: 'Elegí la copia de seguridad a restaurar',
      defaultPath: copias.carpetaDeCopias(),
      properties: ['openFile'],
      filters: [{ name: 'Copias de seguridad', extensions: ['db'] }],
    });
    if (resultado.canceled || resultado.filePaths.length === 0) return { cancelado: true };
    ruta = resultado.filePaths[0];
  }

  // La confirmación la pide el main: es una acción que reemplaza TODOS los datos
  const info = copias.validarArchivoDeCopia(ruta);
  const { response } = await dialog.showMessageBox(ventana, {
    type: 'warning',
    title: 'Restaurar copia de seguridad',
    message: '¿Reemplazar TODOS los datos actuales por los de esta copia?',
    detail:
      `La copia tiene ${info.productos} productos. Antes de reemplazar se guarda una copia ` +
      'de cómo está todo ahora, por si te arrepentís. El programa se va a reiniciar.',
    buttons: ['Restaurar', 'Cancelar'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });
  if (response !== 0) return { cancelado: true };

  const resultado = copias.restaurarCopia(ruta);

  // Reiniciamos para abrir la base restaurada (y aplicarle las migraciones que falten).
  // El pequeño retraso deja que la respuesta llegue a la ventana.
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 400);
  return { ...resultado, reiniciando: true };
});

manejar('sistema:info', () => ({
  versionPrograma: app.getVersion(),
  versionBase: conexion.VERSION_BASE,
  carpetaDatos: app.getPath('userData'),
}));

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
    icon: path.join(__dirname, '..', 'assets', 'icono.png'),
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
  copias.copiaAutomatica({ soloSiNoHayDeHoy: true }); // si falla, avisa en Ajustes
  crearVentana();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Al cerrar: actualiza la copia del día con todo lo que se hizo hoy
app.on('will-quit', () => {
  if (!conexion.baseAbierta()) return; // por ejemplo, justo después de restaurar
  copias.copiaAutomatica({ soloSiNoHayDeHoy: false });
  conexion.cerrarBaseDeDatos();
});
