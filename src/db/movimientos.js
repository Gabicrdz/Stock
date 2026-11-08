// db/movimientos.js — Todo lo que entra y sale del almacén.
//
// Cada movimiento suma o resta stock. El stock de un producto es la SUMA de sus
// movimientos no anulados (ver db/productos.js). Por eso acá nunca se "escribe" el
// stock: se agrega un renglón nuevo, como en el cuaderno.

const { obtenerDb, texto, validarId, hoy, fechaObligatoria, normalizar, escaparLike } =
  require('./conexion');
const { validarCantidad, UNIDADES } = require('./unidades');
const { obtenerProducto } = require('./productos');

// Cómo afecta cada tipo al stock: +1 entra mercadería, −1 sale.
// El ajuste es especial: se carga lo que se CONTÓ y la diferencia la calcula el sistema.
const TIPOS = {
  compra: { signo: 1, nombre: 'Compra' },
  devolucion: { signo: 1, nombre: 'Devolución' },
  venta: { signo: -1, nombre: 'Venta' },
  merma: { signo: -1, nombre: 'Merma' },
  ajuste: { signo: 0, nombre: 'Ajuste' },
};

const PLATA_MAXIMA = 100_000_000_000;

// "12,5 kg" para los mensajes de error
function textoCantidad(milesimas, unidad) {
  const numero = String(milesimas / 1000).replace('.', ',');
  const info = UNIDADES[unidad];
  return `${numero} ${milesimas === 1000 ? info.nombre : info.plural}`;
}

function validarPlataOpcional(valor, nombreCampo) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (!Number.isInteger(valor) || valor < 0 || valor > PLATA_MAXIMA) {
    throw new Error(`${nombreCampo}: ingresá un importe válido`);
  }
  return valor;
}

// ---------- Registrar ----------
// datos: { productoId, tipo, cantidad (milésimas), costoCentavos?, actualizarCosto?,
//          precioCentavos?, motivo?, fecha? }
// Para el ajuste, "cantidad" es lo que se contó en el estante.
function registrarMovimiento(datos) {
  const db = obtenerDb();
  validarId(datos.productoId, 'Producto');
  const tipo = String(datos.tipo ?? '');
  if (!Object.hasOwn(TIPOS, tipo)) throw new Error('Elegí el tipo de movimiento');

  const fecha = fechaObligatoria(datos.fecha || hoy());
  if (fecha > hoy()) throw new Error('La fecha no puede ser futura');
  const motivo = texto(datos.motivo, 120) || null;

  // Todo dentro de una transacción: leemos el stock y escribimos el movimiento
  // sin que nada pueda pasar en el medio.
  const registrar = db.transaction(() => {
    const producto = obtenerProducto(datos.productoId);
    if (!producto.activo) throw new Error('El producto está dado de baja: reactivalo para moverle stock');

    // Nada puede pasar antes de que el producto exista (si no, el historial no cierra)
    const alta = producto.creado_en.slice(0, 10);
    if (fecha < alta) {
      const [anio, mes, dia] = alta.split('-');
      throw new Error(`La fecha no puede ser anterior al alta del producto (${dia}/${mes}/${anio})`);
    }

    let cantidad;
    if (tipo === 'ajuste') {
      const contado = validarCantidad(datos.cantidad, producto.unidad, 'Cantidad contada');
      cantidad = contado - producto.stock;
      if (cantidad === 0) {
        throw new Error('Lo que contaste coincide con el sistema: no hace falta ajustar');
      }
    } else {
      const valor = validarCantidad(datos.cantidad, producto.unidad, 'Cantidad', { permitirCero: false });
      cantidad = valor * TIPOS[tipo].signo;
    }

    // Una salida no puede dejar el stock en negativo
    if (cantidad < 0 && producto.stock + cantidad < 0) {
      throw new Error(
        `Solo hay ${textoCantidad(Math.max(producto.stock, 0), producto.unidad)}: ` +
          `no podés sacar ${textoCantidad(-cantidad, producto.unidad)}. ` +
          'Si el stock real es otro, hacé un ajuste por conteo.'
      );
    }

    // Costo: en una compra se carga el que se pagó; en el resto, el del producto
    let costo = producto.costo_centavos;
    if (tipo === 'compra') {
      costo = validarPlataOpcional(datos.costoCentavos, 'Costo') ?? producto.costo_centavos;
      if (datos.actualizarCosto && costo !== producto.costo_centavos) {
        db.prepare('UPDATE productos SET costo_centavos = ? WHERE id = ?').run(costo, producto.id);
      }
    }

    // Precio: solo las ventas lo guardan (el que se cobró)
    const precio =
      tipo === 'venta'
        ? validarPlataOpcional(datos.precioCentavos, 'Precio') ?? producto.precio_centavos
        : null;

    const resultado = db
      .prepare(
        `INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, precio_centavos, motivo, fecha)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(producto.id, tipo, cantidad, costo, precio, motivo, fecha);

    return {
      id: Number(resultado.lastInsertRowid),
      cantidad,
      stockAnterior: producto.stock,
      stockNuevo: producto.stock + cantidad,
    };
  });

  return registrar();
}

// ---------- Anular ----------
// No se borra: queda marcado como anulado y deja de sumar al stock.
function anularMovimiento(id) {
  validarId(id, 'Movimiento');
  const db = obtenerDb();

  const anular = db.transaction(() => {
    const movimiento = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(id);
    if (!movimiento) throw new Error('El movimiento no existe');
    if (movimiento.anulado) throw new Error('Ese movimiento ya estaba anulado');

    // Si anulamos una entrada que ya se vendió, el stock quedaría negativo
    const producto = obtenerProducto(movimiento.producto_id);
    const stockNuevo = producto.stock - movimiento.cantidad;
    if (stockNuevo < 0) {
      throw new Error(
        `No se puede anular: el stock quedaría en ${textoCantidad(stockNuevo, producto.unidad)}. ` +
          'Esa mercadería ya salió; si hubo un error, corregilo con un ajuste por conteo.'
      );
    }

    db.prepare(
      `UPDATE movimientos SET anulado = 1, anulado_en = datetime('now', 'localtime') WHERE id = ?`
    ).run(id);
    return { stockNuevo };
  });

  return anular();
}

// ---------- Historial de un producto (con el saldo después de cada movimiento) ----------
// SUM(...) OVER (...) es una "función de ventana": para cada renglón suma todos los
// anteriores, como la columna "saldo" de un extracto bancario.
function historialDeProducto(productoId, limite = 50) {
  validarId(productoId, 'Producto');
  return obtenerDb()
    .prepare(
      `SELECT * FROM (
         SELECT id, tipo, cantidad, costo_centavos, precio_centavos, motivo, fecha,
                anulado, creado_en,
                SUM(CASE WHEN anulado = 0 THEN cantidad ELSE 0 END)
                  OVER (ORDER BY fecha, id ROWS UNBOUNDED PRECEDING) AS saldo
           FROM movimientos
          WHERE producto_id = ?
       )
       ORDER BY fecha DESC, id DESC
       LIMIT ?`
    )
    .all(productoId, Math.min(Math.max(Number(limite) || 50, 1), 500));
}

// ---------- Todos los movimientos de un período, con totales ----------
// filtros: { desde, hasta, tipo ('todos' o un tipo), busqueda, productoId }
function listarMovimientos({ desde, hasta, tipo = 'todos', busqueda = '', productoId = null } = {}) {
  const fechaDesde = fechaObligatoria(desde, 'Desde');
  const fechaHasta = fechaObligatoria(hasta, 'Hasta');
  if (fechaDesde > fechaHasta) throw new Error('La fecha "desde" es posterior a "hasta"');

  const termino = normalizar(texto(busqueda, 60));
  const parametros = {
    desde: fechaDesde,
    hasta: fechaHasta,
    tipo: Object.hasOwn(TIPOS, tipo) || tipo === 'inicial' ? tipo : 'todos',
    productoId: Number.isInteger(productoId) ? productoId : null,
    patron: termino ? `%${escaparLike(termino)}%` : null,
  };

  const filtro = `
    FROM movimientos m
    JOIN productos p ON p.id = m.producto_id
   WHERE m.fecha BETWEEN @desde AND @hasta
     AND (@tipo = 'todos' OR m.tipo = @tipo)
     AND (@productoId IS NULL OR m.producto_id = @productoId)
     AND (@patron IS NULL OR p.busqueda LIKE @patron ESCAPE '\\')`;

  const db = obtenerDb();
  const movimientos = db
    .prepare(
      `SELECT m.id, m.producto_id, p.nombre AS producto, p.unidad, m.tipo, m.cantidad,
              m.costo_centavos, m.precio_centavos, m.motivo, m.fecha, m.anulado
       ${filtro}
       ORDER BY m.fecha DESC, m.id DESC
       LIMIT 500`
    )
    .all(parametros);

  // Totales en plata (sin los anulados). Cantidad en milésimas × precio en centavos ÷ 1000.
  const totales = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN m.tipo = 'compra' THEN m.cantidad * m.costo_centavos END), 0) AS compras,
         COALESCE(SUM(CASE WHEN m.tipo = 'venta' THEN -m.cantidad * m.precio_centavos END), 0) AS ventas,
         COALESCE(SUM(CASE WHEN m.tipo = 'merma' THEN -m.cantidad * m.costo_centavos END), 0) AS mermas,
         COUNT(*) AS cantidad
       ${filtro}
       AND m.anulado = 0`
    )
    .get(parametros);

  return {
    movimientos,
    totales: {
      comprasCentavos: Math.round(totales.compras / 1000),
      ventasCentavos: Math.round(totales.ventas / 1000),
      mermasCentavos: Math.round(totales.mermas / 1000),
      cantidad: totales.cantidad,
    },
  };
}

module.exports = {
  TIPOS,
  registrarMovimiento,
  anularMovimiento,
  historialDeProducto,
  listarMovimientos,
};
