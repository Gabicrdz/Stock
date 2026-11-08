// db/productos.js — Productos: alta, edición, búsqueda y estado del stock.

const { obtenerDb, texto, validarId, hoy, normalizar, escaparLike } = require('./conexion');
const { validarUnidad, validarCantidad } = require('./unidades');

const PRECIO_MAXIMO = 100_000_000_000; // mil millones de pesos, en centavos

// ---------- Consulta base ----------
// El stock de cada producto se CALCULA sumando sus movimientos (no se guarda).
// El estado sale de comparar ese stock con el mínimo:
//   sin_stock → no queda nada   ·   bajo → llegó al mínimo   ·   ok → hay de sobra
// WITH arma "tablas temporales" con nombre, que después se usan como una tabla más.
const CON_STOCK = `
  WITH existencias AS (
    SELECT producto_id, SUM(cantidad) AS stock
      FROM movimientos
     GROUP BY producto_id
  ),
  productos_con_stock AS (
    SELECT p.id, p.codigo, p.nombre, p.categoria_id, c.nombre AS categoria,
           p.unidad, p.costo_centavos, p.precio_centavos, p.stock_minimo,
           p.activo, p.creado_en, p.busqueda, p.orden,
           COALESCE(e.stock, 0) AS stock,
           CASE
             WHEN COALESCE(e.stock, 0) <= 0 THEN 'sin_stock'
             WHEN COALESCE(e.stock, 0) <= p.stock_minimo THEN 'bajo'
             ELSE 'ok'
           END AS estado_stock
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN existencias e ON e.producto_id = p.id
  )`;

// No mandamos a la ventana las columnas internas de búsqueda
function limpiar({ busqueda, orden, ...producto }) {
  return producto;
}

// ---------- Listar ----------
// estado: 'todos' | 'ok' | 'bajo' | 'sin_stock' | 'alerta' (bajo + sin stock)
// mostrar: 'activos' | 'bajas' | 'todos'
function listarProductos({ busqueda = '', categoriaId = null, estado = 'todos', mostrar = 'activos' } = {}) {
  const termino = normalizar(texto(busqueda, 60));
  const filas = obtenerDb()
    .prepare(
      `${CON_STOCK}
       SELECT * FROM productos_con_stock
       WHERE (@mostrar = 'todos'
              OR (@mostrar = 'activos' AND activo = 1)
              OR (@mostrar = 'bajas' AND activo = 0))
         AND (@categoriaId IS NULL OR categoria_id = @categoriaId)
         AND (@estado = 'todos'
              OR estado_stock = @estado
              OR (@estado = 'alerta' AND estado_stock <> 'ok'))
         AND (@patron IS NULL OR busqueda LIKE @patron ESCAPE '\\')
       ORDER BY orden`
    )
    .all({
      mostrar: ['activos', 'bajas', 'todos'].includes(mostrar) ? mostrar : 'activos',
      categoriaId: Number.isInteger(categoriaId) ? categoriaId : null,
      estado: ['todos', 'ok', 'bajo', 'sin_stock', 'alerta'].includes(estado) ? estado : 'todos',
      patron: termino ? `%${escaparLike(termino)}%` : null,
    });
  return filas.map(limpiar);
}

function obtenerProducto(id) {
  validarId(id, 'Producto');
  const producto = obtenerDb().prepare(`${CON_STOCK} SELECT * FROM productos_con_stock WHERE id = ?`).get(id);
  if (!producto) throw new Error('El producto no existe');
  return limpiar(producto);
}

// ---------- Resumen para las tarjetas de arriba ----------
function resumenStock() {
  const fila = obtenerDb()
    .prepare(
      `${CON_STOCK}
       SELECT COUNT(*) AS activos,
              COALESCE(SUM(estado_stock = 'bajo'), 0) AS bajo,
              COALESCE(SUM(estado_stock = 'sin_stock'), 0) AS sin_stock,
              -- Lo que costó la mercadería que hay: stock (milésimas) × costo (centavos)
              COALESCE(SUM(CASE WHEN stock > 0 THEN stock * costo_centavos END), 0) AS valor_milesimas
         FROM productos_con_stock
        WHERE activo = 1`
    )
    .get();
  return {
    activos: fila.activos,
    bajo: fila.bajo,
    sinStock: fila.sin_stock,
    // Dividimos por 1000 porque el stock está en milésimas
    valorInventarioCentavos: Math.round(fila.valor_milesimas / 1000),
  };
}

// ---------- Validar lo que llega del formulario ----------
function validarPlata(valor, nombreCampo) {
  if (!Number.isInteger(valor) || valor < 0 || valor > PRECIO_MAXIMO) {
    throw new Error(`${nombreCampo}: ingresá un importe válido`);
  }
  return valor;
}

function validarCategoria(categoriaId, categoriaActual = null) {
  if (categoriaId === null || categoriaId === undefined || categoriaId === '') return null;
  validarId(categoriaId, 'Categoría');
  const categoria = obtenerDb().prepare('SELECT activo FROM categorias WHERE id = ?').get(categoriaId);
  if (!categoria) throw new Error('La categoría no existe');
  // Una categoría desactivada solo se acepta si el producto ya la tenía
  if (!categoria.activo && categoriaId !== categoriaActual) {
    throw new Error('Esa categoría está desactivada');
  }
  return categoriaId;
}

function validarProducto(datos, actual = null) {
  const nombre = texto(datos.nombre, 80);
  if (!nombre) throw new Error('El nombre del producto es obligatorio');

  const codigo = texto(datos.codigo, 40) || null; // vacío = sin código
  const unidad = validarUnidad(datos.unidad);

  return {
    codigo,
    nombre,
    categoriaId: validarCategoria(datos.categoriaId, actual?.categoria_id ?? null),
    unidad,
    costoCentavos: validarPlata(datos.costoCentavos ?? 0, 'Costo'),
    precioCentavos: validarPlata(datos.precioCentavos, 'Precio de venta'),
    stockMinimo: validarCantidad(datos.stockMinimo ?? 0, unidad, 'Stock mínimo'),
    busqueda: normalizar(`${nombre} ${codigo ?? ''}`),
    orden: normalizar(nombre),
  };
}

function traducirError(error) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return new Error('Ya existe un producto con ese código');
  }
  return error;
}

// ---------- Crear ----------
// El stock inicial se guarda como el PRIMER MOVIMIENTO del producto, no como un número
// suelto. Producto y movimiento van en una transacción: se guardan los dos o ninguno.
function crearProducto(datos) {
  const producto = validarProducto(datos);
  const stockInicial = validarCantidad(datos.stockInicial ?? 0, producto.unidad, 'Stock inicial');
  const db = obtenerDb();

  const crear = db.transaction(() => {
    const resultado = db
      .prepare(
        `INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos,
                                precio_centavos, stock_minimo, busqueda, orden)
         VALUES (@codigo, @nombre, @categoriaId, @unidad, @costoCentavos,
                 @precioCentavos, @stockMinimo, @busqueda, @orden)`
      )
      .run(producto);
    const id = Number(resultado.lastInsertRowid);

    if (stockInicial > 0) {
      db.prepare(
        `INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
         VALUES (?, 'inicial', ?, ?, 'Stock inicial', ?)`
      ).run(id, stockInicial, producto.costoCentavos, hoy());
    }
    return { id };
  });

  try {
    return crear();
  } catch (error) {
    throw traducirError(error);
  }
}

// ---------- Editar ----------
// Acá NO se toca el stock: el stock cambia solo con movimientos (etapa 2).
function actualizarProducto(id, datos) {
  validarId(id, 'Producto');
  const db = obtenerDb();
  const actual = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
  if (!actual) throw new Error('El producto no existe');

  const producto = validarProducto(datos, actual);

  // Pasar de kg/litro a "unidad" solo se puede si ningún movimiento tiene decimales
  if (producto.unidad === 'unidad' && actual.unidad !== 'unidad') {
    const conDecimales = db
      .prepare('SELECT COUNT(*) AS n FROM movimientos WHERE producto_id = ? AND cantidad % 1000 <> 0')
      .get(id).n;
    if (conDecimales > 0) {
      throw new Error('No se puede pasar a "unidad": el producto tiene movimientos con decimales');
    }
  }

  try {
    db.prepare(
      `UPDATE productos
          SET codigo = @codigo, nombre = @nombre, categoria_id = @categoriaId, unidad = @unidad,
              costo_centavos = @costoCentavos, precio_centavos = @precioCentavos,
              stock_minimo = @stockMinimo, busqueda = @busqueda, orden = @orden
        WHERE id = @id`
    ).run({ ...producto, id });
  } catch (error) {
    throw traducirError(error);
  }
  return true;
}

// ---------- Baja lógica ----------
// No se borra: tiene movimientos que cuentan la historia del stock.
function cambiarEstadoProducto(id, activo) {
  validarId(id, 'Producto');
  const resultado = obtenerDb()
    .prepare('UPDATE productos SET activo = ? WHERE id = ?')
    .run(activo ? 1 : 0, id);
  if (resultado.changes === 0) throw new Error('El producto no existe');
  return true;
}

module.exports = {
  listarProductos,
  obtenerProducto,
  resumenStock,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
};
