// pruebas/movimientos.test.js — Compras, ventas, mermas, ajustes y anulaciones.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarSistema, u, fechaDesdeHoy } = require('./ayudantes');

const { conexion, productos, movimientos } = iniciarSistema();

// Yerba: costo $3.700, precio $5.200, arranca con 10 unidades
const yerba = productos.crearProducto({
  nombre: 'Yerba mate 1 kg', unidad: 'unidad', costoCentavos: 370000, precioCentavos: 520000,
  stockMinimo: u(5), stockInicial: u(10),
}).id;
// Jamón por kg: arranca con 2 kg
const jamon = productos.crearProducto({
  nombre: 'Jamón cocido', unidad: 'kg', costoCentavos: 1100000, precioCentavos: 1600000, stockInicial: u(2),
}).id;

// Hacemos de cuenta que los productos se dieron de alta hace 10 días
conexion.obtenerDb().exec(`
  UPDATE productos SET creado_en = datetime('now', 'localtime', '-10 days');
  UPDATE movimientos SET fecha = '${fechaDesdeHoy(-10)}' WHERE tipo = 'inicial';
`);

const stock = (id) => productos.obtenerProducto(id).stock;
const mover = (datos) => movimientos.registrarMovimiento({ productoId: yerba, ...datos });

test('compra: suma stock y puede actualizar el costo', () => {
  const r = mover({ tipo: 'compra', cantidad: u(12), costoCentavos: 400000, actualizarCosto: true });
  assert.deepEqual([r.stockAnterior, r.stockNuevo], [u(10), u(22)]);
  assert.equal(stock(yerba), u(22));
  assert.equal(productos.obtenerProducto(yerba).costo_centavos, 400000);
});

test('compra sin actualizar costo: el producto conserva el suyo', () => {
  mover({ tipo: 'compra', cantidad: u(1), costoCentavos: 999900, actualizarCosto: false });
  assert.equal(productos.obtenerProducto(yerba).costo_centavos, 400000);
  mover({ tipo: 'merma', cantidad: u(1), motivo: 'Paquete roto' }); // volvemos a 22
});

test('venta: resta stock y guarda el precio cobrado', () => {
  mover({ tipo: 'venta', cantidad: u(3) });
  assert.equal(stock(yerba), u(19));
  const [ultima] = movimientos.historialDeProducto(yerba, 1);
  assert.equal(ultima.tipo, 'venta');
  assert.equal(ultima.cantidad, -u(3));
  assert.equal(ultima.precio_centavos, 520000);
});

test('una salida no puede dejar el stock en negativo', () => {
  assert.throws(() => mover({ tipo: 'venta', cantidad: u(20) }), /Solo hay 19 unidades/);
  assert.throws(() => mover({ tipo: 'merma', cantidad: u(20) }), /no podés sacar 20 unidades/);
  assert.equal(stock(yerba), u(19));
});

test('ajuste por conteo: se carga lo contado y el sistema calcula la diferencia', () => {
  const r = mover({ tipo: 'ajuste', cantidad: u(17), motivo: 'Conteo del sábado' });
  assert.equal(r.cantidad, -u(2));
  assert.equal(stock(yerba), u(17));
  assert.throws(() => mover({ tipo: 'ajuste', cantidad: u(17) }), /coincide con el sistema/);
  mover({ tipo: 'ajuste', cantidad: u(18) }); // contar de más también se puede: +1
  assert.equal(stock(yerba), u(18));
});

test('cantidades: por unidad sin decimales, por kg sí', () => {
  assert.throws(() => mover({ tipo: 'venta', cantidad: u(1.5) }), /no llevan decimales/);
  assert.throws(() => mover({ tipo: 'venta', cantidad: 0 }), /mayor a cero/);
  movimientos.registrarMovimiento({ productoId: jamon, tipo: 'venta', cantidad: u(0.35) });
  assert.equal(stock(jamon), u(1.65));
});

test('fecha: se puede cargar algo de días anteriores, pero no del futuro', () => {
  mover({ tipo: 'devolucion', cantidad: u(1), fecha: fechaDesdeHoy(-3) });
  assert.equal(stock(yerba), u(19));
  assert.throws(() => mover({ tipo: 'compra', cantidad: u(1), fecha: fechaDesdeHoy(1) }), /no puede ser futura/);
  assert.throws(() => mover({ tipo: 'compra', cantidad: u(1), fecha: '2026-02-30' }), /fecha inválida/);
  assert.throws(() => mover({ tipo: 'compra', cantidad: u(1), fecha: fechaDesdeHoy(-11) }), /anterior al alta/);
  assert.throws(() => mover({ tipo: 'regalo', cantidad: u(1) }), /Elegí el tipo/);
});

test('el historial trae el saldo después de cada movimiento', () => {
  const historial = movimientos.historialDeProducto(yerba);
  // El más nuevo primero, y su saldo es el stock actual
  assert.equal(historial[0].saldo, stock(yerba));
  // El más viejo es el stock inicial
  const primero = historial[historial.length - 1];
  assert.equal(primero.tipo, 'inicial');
  assert.equal(primero.saldo, u(10));
});

test('anular: el movimiento queda, pero deja de sumar', () => {
  const { id } = mover({ tipo: 'venta', cantidad: u(4) });
  assert.equal(stock(yerba), u(15));
  movimientos.anularMovimiento(id);
  assert.equal(stock(yerba), u(19));
  assert.equal(movimientos.historialDeProducto(yerba)[0].anulado, 1);
  assert.throws(() => movimientos.anularMovimiento(id), /ya estaba anulado/);
});

test('no se puede anular una entrada que ya se vendió', () => {
  const { id } = mover({ tipo: 'compra', cantidad: u(10) }); // 29
  mover({ tipo: 'venta', cantidad: u(25) });                // 4
  assert.throws(() => movimientos.anularMovimiento(id), /el stock quedaría en -6 unidades/);
  assert.equal(stock(yerba), u(4));
});

test('un producto dado de baja no se mueve', () => {
  productos.cambiarEstadoProducto(jamon, false);
  assert.throws(
    () => movimientos.registrarMovimiento({ productoId: jamon, tipo: 'compra', cantidad: u(1) }),
    /dado de baja/
  );
  productos.cambiarEstadoProducto(jamon, true);
});

test('listar: filtra por período y tipo, y suma la plata sin los anulados', () => {
  const periodo = { desde: fechaDesdeHoy(-30), hasta: fechaDesdeHoy(0) };
  const { movimientos: lista, totales } = movimientos.listarMovimientos(periodo);
  assert.ok(lista.length > 10);
  assert.ok(lista.every((m) => m.fecha >= periodo.desde && m.fecha <= periodo.hasta));

  // Compras: 12 × $4.000 + 1 × $9.999 + 10 × $4.000
  assert.equal(totales.comprasCentavos, 12 * 400000 + 999900 + 10 * 400000);
  // Ventas (la de 4 está anulada): 3 + 25 yerbas a $5.200 + 0,35 kg de jamón a $16.000
  assert.equal(totales.ventasCentavos, 28 * 520000 + 560000);

  const soloVentas = movimientos.listarMovimientos({ ...periodo, tipo: 'venta' }).movimientos;
  assert.ok(soloVentas.every((m) => m.tipo === 'venta'));
  assert.equal(movimientos.listarMovimientos({ ...periodo, busqueda: 'jamon' }).movimientos.length, 2);

  // Hace 3 días solo hubo la devolución
  const haceTres = movimientos.listarMovimientos({ desde: fechaDesdeHoy(-3), hasta: fechaDesdeHoy(-3) });
  assert.deepEqual(haceTres.movimientos.map((m) => m.tipo), ['devolucion']);
  assert.throws(() => movimientos.listarMovimientos({ desde: fechaDesdeHoy(0), hasta: fechaDesdeHoy(-1) }), /posterior/);
});
