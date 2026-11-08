// pruebas/reportes.test.js — Ventas, ganancia, más vendidos, mercadería parada y lista de compras.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarSistema, u, fechaDesdeHoy } = require('./ayudantes');

const { conexion, categorias, productos, movimientos, reportes } = iniciarSistema();

const bebidas = categorias.crearCategoria({ nombre: 'Bebidas' }).id;
const almacen = categorias.crearCategoria({ nombre: 'Almacén' }).id;

const nuevo = (datos) => productos.crearProducto({ unidad: 'unidad', ...datos }).id;
// Gaseosa: costo $3.000, precio $4.200 · Yerba: costo $3.700, precio $5.200
const gaseosa = nuevo({ nombre: 'Gaseosa cola', categoriaId: bebidas, costoCentavos: 300000, precioCentavos: 420000, stockMinimo: u(6), stockInicial: u(30) });
const yerba = nuevo({ nombre: 'Yerba mate', categoriaId: almacen, costoCentavos: 370000, precioCentavos: 520000, stockMinimo: u(10), stockInicial: u(20) });
const jamon = nuevo({ nombre: 'Jamón cocido', unidad: 'kg', costoCentavos: 1100000, precioCentavos: 1600000, stockMinimo: u(2), stockInicial: u(3) });
const fernet = nuevo({ nombre: 'Fernet', categoriaId: bebidas, costoCentavos: 900000, precioCentavos: 1250000, stockMinimo: 0, stockInicial: u(4) });

// Todos dados de alta hace 40 días
conexion.obtenerDb().exec(`
  UPDATE productos SET creado_en = datetime('now', 'localtime', '-40 days');
  UPDATE movimientos SET fecha = '${fechaDesdeHoy(-40)}' WHERE tipo = 'inicial';
`);

const vender = (productoId, cantidad, dias) =>
  movimientos.registrarMovimiento({ productoId, tipo: 'venta', cantidad, fecha: fechaDesdeHoy(dias) });

vender(gaseosa, u(10), -2);   // $42.000, ganancia $12.000
vender(yerba, u(12), -5);     // $62.400, ganancia $18.000
vender(jamon, u(1.5), -1);    // $24.000, ganancia $7.500
vender(fernet, u(1), -35);    // fuera del período de 30 días
const anulada = vender(gaseosa, u(5), -3).id;
movimientos.anularMovimiento(anulada); // no cuenta

const ultimos30 = { desde: fechaDesdeHoy(-30), hasta: fechaDesdeHoy(0) };

test('resumen: vendido, costo y ganancia del período (sin anuladas)', () => {
  const r = reportes.resumenVentas(ultimos30);
  assert.equal(r.renglones, 3);
  assert.equal(r.vendidoCentavos, 4200000 + 6240000 + 2400000);
  assert.equal(r.gananciaCentavos, 1200000 + 1800000 + 750000);
  assert.equal(r.costoCentavos, r.vendidoCentavos - r.gananciaCentavos);
});

test('la ganancia usa el costo del momento de la venta', () => {
  // Sube el costo de la gaseosa: las ventas viejas no cambian su ganancia
  movimientos.registrarMovimiento({ productoId: gaseosa, tipo: 'compra', cantidad: u(6), costoCentavos: 350000, actualizarCosto: true });
  assert.equal(reportes.resumenVentas(ultimos30).gananciaCentavos, 1200000 + 1800000 + 750000);
});

test('más vendidos: ordenados por plata', () => {
  const lista = reportes.masVendidos(ultimos30);
  assert.deepEqual(lista.map((p) => p.nombre), ['Yerba mate', 'Gaseosa cola', 'Jamón cocido']);
  assert.equal(lista[2].cantidad, u(1.5));
});

test('por categoría: los productos sin categoría también aparecen', () => {
  const lista = reportes.porCategoria(ultimos30);
  assert.deepEqual(
    lista.map((c) => [c.categoria, c.vendidoCentavos, c.gananciaCentavos]),
    [['Almacén', 6240000, 1800000], ['Bebidas', 4200000, 1200000], ['Sin categoría', 2400000, 750000]]
  );
});

test('mercadería parada: tiene stock y no se vendió en el período', () => {
  const parados = reportes.sinMovimiento(ultimos30);
  assert.deepEqual(parados.map((p) => p.nombre), ['Fernet']);
  assert.equal(parados[0].stock, u(3));
  assert.equal(parados[0].ultimaVenta, fechaDesdeHoy(-35));
  assert.equal(parados[0].valorCentavos, 3 * 900000);
  // En los últimos 40 días el fernet sí se vendió
  assert.equal(reportes.sinMovimiento({ desde: fechaDesdeHoy(-40), hasta: fechaDesdeHoy(0) }).length, 0);
});

test('lista de compras: lo que está en el mínimo, con cuánto pedir para llegar al triple', () => {
  // Yerba: quedan 8, mínimo 10 → pedir 30 − 8 = 22
  // Jamón: quedan 1,5 kg, mínimo 2 → 6 − 1,5 = 4,5 kg
  const lista = reportes.listaDeCompras();
  const ver = Object.fromEntries(lista.map((p) => [p.nombre, p.sugerido]));
  assert.deepEqual(ver, { 'Yerba mate': u(22), 'Jamón cocido': u(4.5) });
  // Agrupada por categoría y "Sin categoría" al final
  assert.deepEqual(lista.map((p) => p.categoria), ['Almacén', 'Sin categoría']);
});

test('sugerido: redondea hacia arriba (unidades enteras, medio kilo)', () => {
  const s = (unidad, stock, minimo) => reportes.cantidadSugerida({ unidad, stock, stock_minimo: minimo });
  assert.equal(s('kg', u(0.3), u(1)), u(3));   // 2,7 → 3 kg
  assert.equal(s('kg', u(0.8), u(1)), u(2.5)); // 2,2 → 2,5 kg
  assert.equal(s('unidad', u(0), u(5)), u(15));
  assert.equal(s('unidad', u(-2), u(5)), u(15)); // nunca cuenta stock negativo
  assert.equal(s('unidad', u(0), 0), null);      // sin mínimo, no sugiere
});

test('período inválido', () => {
  assert.throws(() => reportes.obtenerReportes({ desde: fechaDesdeHoy(0), hasta: fechaDesdeHoy(-1) }), /posterior/);
  assert.throws(() => reportes.obtenerReportes({ desde: 'ayer', hasta: fechaDesdeHoy(0) }), /fecha inválida/);
});
