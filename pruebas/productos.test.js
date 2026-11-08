// pruebas/productos.test.js — Categorías, productos y estado del stock.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarSistema, u } = require('./ayudantes');

const sistema = iniciarSistema();
const { conexion, categorias, productos } = sistema;

const lacteos = categorias.crearCategoria({ nombre: 'Lácteos' }).id;
const bebidas = categorias.crearCategoria({ nombre: 'Bebidas' }).id;
const limpieza = categorias.crearCategoria({ nombre: 'Limpieza' }).id;
const fiambreria = categorias.crearCategoria({ nombre: 'Fiambrería' }).id;

// Lo que manda el formulario a partir de un producto de la lista
function datosDe(p, cambios = {}) {
  return {
    codigo: p.codigo, nombre: p.nombre, categoriaId: p.categoria_id, unidad: p.unidad,
    costoCentavos: p.costo_centavos, precioCentavos: p.precio_centavos, stockMinimo: p.stock_minimo,
    ...cambios,
  };
}

function nuevo(datos) {
  return productos.crearProducto({
    nombre: 'Producto',
    unidad: 'unidad',
    costoCentavos: 100000,
    precioCentavos: 150000,
    ...datos,
  }).id;
}

test('la base nueva queda en la última versión y sin datos', () => {
  assert.equal(conexion.obtenerDb().pragma('user_version', { simple: true }), conexion.VERSION_BASE);
  assert.equal(productos.listarProductos().length, 0);
});

test('categorías: no se repiten (sin importar mayúsculas) y se ordenan como en el diccionario', () => {
  assert.throws(() => categorias.crearCategoria({ nombre: 'bebidas' }), {
    message: 'Ya existe una categoría con ese nombre',
  });
  assert.throws(() => categorias.crearCategoria({ nombre: '  ' }));
  assert.deepEqual(
    categorias.listarCategorias().map((c) => c.nombre),
    ['Bebidas', 'Fiambrería', 'Lácteos', 'Limpieza']
  );
  assert.ok(lacteos && limpieza);
});

test('el stock inicial queda como primer movimiento', () => {
  const id = nuevo({ nombre: 'Gaseosa cola 2,25 L', codigo: '7790895000997', categoriaId: bebidas, stockInicial: u(24), stockMinimo: u(6) });
  const producto = productos.obtenerProducto(id);
  assert.equal(producto.stock, u(24));
  assert.equal(producto.estado_stock, 'ok');
  assert.equal(producto.categoria, 'Bebidas');
  const movimientos = conexion.obtenerDb().prepare('SELECT tipo, cantidad FROM movimientos WHERE producto_id = ?').all(id);
  assert.deepEqual(movimientos, [{ tipo: 'inicial', cantidad: u(24) }]);
});

test('sin stock inicial no se crea ningún movimiento', () => {
  const id = nuevo({ nombre: 'Agua mineral 1,5 L', categoriaId: bebidas });
  assert.equal(productos.obtenerProducto(id).estado_stock, 'sin_stock');
  assert.equal(conexion.obtenerDb().prepare('SELECT COUNT(*) AS n FROM movimientos WHERE producto_id = ?').get(id).n, 0);
});

test('el código no se repite, pero puede faltar en varios productos', () => {
  assert.throws(() => nuevo({ nombre: 'Otra', codigo: '7790895000997' }), {
    message: 'Ya existe un producto con ese código',
  });
  nuevo({ nombre: 'Sin código 1', codigo: '' });
  nuevo({ nombre: 'Sin código 2' });
});

test('productos por kg aceptan decimales; por unidad, no', () => {
  const id = nuevo({ nombre: 'Jamón cocido', unidad: 'kg', categoriaId: fiambreria, stockInicial: u(1.25), stockMinimo: u(2) });
  const jamon = productos.obtenerProducto(id);
  assert.equal(jamon.stock, 1250);
  assert.equal(jamon.estado_stock, 'bajo'); // 1,250 kg con mínimo de 2 kg

  assert.throws(() => nuevo({ nombre: 'Alfajor', stockInicial: u(1.5) }), /no llevan decimales/);
  assert.throws(() => nuevo({ nombre: 'Algo', unidad: 'docena' }), /Elegí una unidad/);
});

test('estado del stock: llegar justo al mínimo ya es "bajo"', () => {
  const id = nuevo({ nombre: 'Yerba mate 1 kg', stockInicial: u(5), stockMinimo: u(5) });
  assert.equal(productos.obtenerProducto(id).estado_stock, 'bajo');
});

test('filtros: estado, alerta, categoría y búsqueda sin tildes', () => {
  const nombres = (filtros) => productos.listarProductos(filtros).map((p) => p.nombre);

  assert.deepEqual(nombres({ estado: 'bajo' }), ['Jamón cocido', 'Yerba mate 1 kg']);
  assert.ok(nombres({ estado: 'alerta' }).includes('Agua mineral 1,5 L'));
  assert.deepEqual(nombres({ categoriaId: fiambreria }), ['Jamón cocido']);
  assert.deepEqual(nombres({ busqueda: 'jamon' }), ['Jamón cocido']);
  assert.deepEqual(nombres({ busqueda: '7790895' }), ['Gaseosa cola 2,25 L']); // por código
  assert.deepEqual(nombres({ busqueda: '%' }), []);
});

test('editar no cambia el stock', () => {
  const [gaseosa] = productos.listarProductos({ busqueda: 'gaseosa' });
  productos.actualizarProducto(gaseosa.id, datosDe(gaseosa, { costoCentavos: 120000, precioCentavos: 180000, stockMinimo: u(30) }));
  const editada = productos.obtenerProducto(gaseosa.id);
  assert.equal(editada.stock, u(24));
  assert.equal(editada.precio_centavos, 180000);
  assert.equal(editada.estado_stock, 'bajo'); // ahora el mínimo es 30
});

test('no se puede pasar a "unidad" si hay movimientos con decimales', () => {
  const [jamon] = productos.listarProductos({ busqueda: 'jamon' });
  assert.throws(
    () => productos.actualizarProducto(jamon.id, datosDe(jamon, { unidad: 'unidad', stockMinimo: 0 })),
    /tiene movimientos con decimales/
  );
});

test('categoría desactivada: no se elige para productos nuevos', () => {
  categorias.cambiarEstadoCategoria(fiambreria, false);
  assert.throws(() => nuevo({ nombre: 'Salame', unidad: 'kg', categoriaId: fiambreria }), {
    message: 'Esa categoría está desactivada',
  });
  // pero el jamón, que ya la tenía, se puede seguir editando
  const [jamon] = productos.listarProductos({ busqueda: 'jamon' });
  productos.actualizarProducto(jamon.id, datosDe(jamon, { stockMinimo: u(1) }));
  categorias.cambiarEstadoCategoria(fiambreria, true);
});

test('dar de baja oculta el producto de la lista de activos', () => {
  const [agua] = productos.listarProductos({ busqueda: 'agua' });
  productos.cambiarEstadoProducto(agua.id, false);
  assert.equal(productos.listarProductos({ busqueda: 'agua' }).length, 0);
  assert.equal(productos.listarProductos({ busqueda: 'agua', mostrar: 'bajas' }).length, 1);
});

test('resumen: contadores y valor del inventario al costo', () => {
  const resumen = productos.resumenStock();
  const activos = productos.listarProductos();
  assert.equal(resumen.activos, activos.length);
  assert.equal(resumen.bajo, activos.filter((p) => p.estado_stock === 'bajo').length);
  assert.equal(resumen.sinStock, activos.filter((p) => p.estado_stock === 'sin_stock').length);
  // 24 gaseosas × $1.200 + 1,25 kg de jamón × $1.000 + 5 yerbas × $1.000
  assert.equal(resumen.valorInventarioCentavos, 24 * 120000 + 125000 + 5 * 100000);
});
