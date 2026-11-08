// db/reportes.js — Lo que el dueño del almacén quiere saber:
// cuánto vendió y ganó, qué se vende más, qué está parado y qué hay que pedirle al proveedor.
//
// Todo sale de la tabla movimientos. Las ventas guardaron su "foto" de precio y de costo,
// así que la ganancia de cada venta es: cantidad × (precio que se cobró − costo de ese momento).
// Las cantidades están en milésimas: por eso se divide por 1000 al final.

const { obtenerDb, fechaObligatoria } = require('./conexion');
const { CON_STOCK } = require('./productos');

// Para la lista de compras: se repone hasta llegar al TRIPLE del mínimo
// (es cuando la barrita de nivel se ve llena).
const REPONER_HASTA = 3;

const alfabetico = new Intl.Collator('es', { sensitivity: 'base' });

function validarPeriodo({ desde, hasta } = {}) {
  const periodo = {
    desde: fechaObligatoria(desde, 'Desde'),
    hasta: fechaObligatoria(hasta, 'Hasta'),
  };
  if (periodo.desde > periodo.hasta) throw new Error('La fecha "desde" es posterior a "hasta"');
  return periodo;
}

// Ventas del período, ya multiplicadas: vendido y costo en "centavos × milésimas"
const VENTAS = `
  ventas AS (
    SELECT m.producto_id,
           -m.cantidad AS cantidad,
           -m.cantidad * m.precio_centavos AS vendido,
           -m.cantidad * COALESCE(m.costo_centavos, 0) AS costo
      FROM movimientos m
     WHERE m.tipo = 'venta' AND m.anulado = 0
       AND m.fecha BETWEEN @desde AND @hasta
  )`;

// "centavos × milésimas" → centavos
const aCentavos = (valor) => Math.round((valor ?? 0) / 1000);

// ---------- Resumen: vendido, costo y ganancia ----------
function resumenVentas(periodo) {
  const fila = obtenerDb()
    .prepare(
      `WITH ${VENTAS}
       SELECT COUNT(*) AS renglones,
              COALESCE(SUM(vendido), 0) AS vendido,
              COALESCE(SUM(costo), 0) AS costo
         FROM ventas`
    )
    .get(periodo);
  return {
    renglones: fila.renglones,
    vendidoCentavos: aCentavos(fila.vendido),
    costoCentavos: aCentavos(fila.costo),
    gananciaCentavos: aCentavos(fila.vendido - fila.costo),
  };
}

// ---------- Los más vendidos (por plata) ----------
function masVendidos(periodo, limite = 10) {
  return obtenerDb()
    .prepare(
      `WITH ${VENTAS}
       SELECT p.id, p.nombre, p.unidad,
              SUM(v.cantidad) AS cantidad,
              SUM(v.vendido) AS vendido,
              SUM(v.vendido - v.costo) AS ganancia
         FROM ventas v
         JOIN productos p ON p.id = v.producto_id
        GROUP BY p.id
        ORDER BY vendido DESC
        LIMIT @limite`
    )
    .all({ ...periodo, limite })
    .map((f) => ({
      id: f.id,
      nombre: f.nombre,
      unidad: f.unidad,
      cantidad: f.cantidad,
      vendidoCentavos: aCentavos(f.vendido),
      gananciaCentavos: aCentavos(f.ganancia),
    }));
}

// ---------- Ganancia por categoría ----------
function porCategoria(periodo) {
  return obtenerDb()
    .prepare(
      `WITH ${VENTAS}
       SELECT COALESCE(c.nombre, 'Sin categoría') AS categoria,
              SUM(v.vendido) AS vendido,
              SUM(v.costo) AS costo
         FROM ventas v
         JOIN productos p ON p.id = v.producto_id
         LEFT JOIN categorias c ON c.id = p.categoria_id
        GROUP BY categoria
        ORDER BY vendido DESC`
    )
    .all(periodo)
    .map((f) => ({
      categoria: f.categoria,
      vendidoCentavos: aCentavos(f.vendido),
      costoCentavos: aCentavos(f.costo),
      gananciaCentavos: aCentavos(f.vendido - f.costo),
    }));
}

// ---------- Mercadería parada: hay stock, pero no se vendió nada en el período ----------
// Es plata quieta en el estante. Ordenada por cuánto costó lo que está parado.
function sinMovimiento(periodo) {
  return obtenerDb()
    .prepare(
      `${CON_STOCK},
       ultimas_ventas AS (
         SELECT producto_id, MAX(fecha) AS ultima
           FROM movimientos
          WHERE tipo = 'venta' AND anulado = 0
          GROUP BY producto_id
       )
       SELECT p.id, p.nombre, p.unidad, p.stock, p.costo_centavos, u.ultima AS ultima_venta,
              p.stock * p.costo_centavos AS valor
         FROM productos_con_stock p
         LEFT JOIN ultimas_ventas u ON u.producto_id = p.id
        WHERE p.activo = 1 AND p.stock > 0
          AND NOT EXISTS (
            SELECT 1 FROM movimientos m
             WHERE m.producto_id = p.id AND m.tipo = 'venta' AND m.anulado = 0
               AND m.fecha BETWEEN @desde AND @hasta
          )
        ORDER BY valor DESC, p.orden`
    )
    .all(periodo)
    .map((f) => ({
      id: f.id,
      nombre: f.nombre,
      unidad: f.unidad,
      stock: f.stock,
      ultimaVenta: f.ultima_venta,
      valorCentavos: aCentavos(f.valor),
    }));
}

// ---------- Lista de compras: lo que llegó al mínimo, y cuánto pedir ----------
// Sugerido = (mínimo × 3) − stock. Redondeado hacia arriba: a unidades enteras,
// o a medio kilo / medio litro.
function cantidadSugerida(producto) {
  if (producto.stock_minimo <= 0) return null; // sin mínimo no sabemos cuánto pedir
  const falta = producto.stock_minimo * REPONER_HASTA - Math.max(producto.stock, 0);
  if (falta <= 0) return null;
  const paso = producto.unidad === 'unidad' ? 1000 : 500;
  return Math.ceil(falta / paso) * paso;
}

function listaDeCompras() {
  return obtenerDb()
    .prepare(
      `${CON_STOCK}
       SELECT id, nombre, codigo, categoria, unidad, stock, stock_minimo, costo_centavos, estado_stock
         FROM productos_con_stock
        WHERE activo = 1 AND estado_stock <> 'ok'
        ORDER BY orden`
    )
    .all()
    .map((p) => {
      const sugerido = cantidadSugerida(p);
      return {
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        categoria: p.categoria ?? 'Sin categoría',
        unidad: p.unidad,
        stock: p.stock,
        stockMinimo: p.stock_minimo,
        estado: p.estado_stock,
        costoCentavos: p.costo_centavos,
        sugerido,
      };
    })
    // Agrupada por categoría, como se recorre el depósito (y "Sin categoría" al final)
    .sort((a, b) => {
      if (a.categoria === b.categoria) return 0; // ya vienen ordenados por nombre
      if (a.categoria === 'Sin categoría') return 1;
      if (b.categoria === 'Sin categoría') return -1;
      return alfabetico.compare(a.categoria, b.categoria);
    });
}

// ---------- Todo junto, para la pantalla ----------
function obtenerReportes(filtros) {
  const periodo = validarPeriodo(filtros);
  return {
    resumen: resumenVentas(periodo),
    masVendidos: masVendidos(periodo),
    porCategoria: porCategoria(periodo),
    sinMovimiento: sinMovimiento(periodo),
    listaDeCompras: listaDeCompras(),
  };
}

module.exports = {
  REPONER_HASTA,
  obtenerReportes,
  resumenVentas,
  masVendidos,
  porCategoria,
  sinMovimiento,
  listaDeCompras,
  cantidadSugerida,
};
