-- Datos de prueba — Sistema de stock, etapa 1 (almacén / kiosco)
-- Cómo usarlo en DB Browser for SQLite:
--   1. Open Database → %APPDATA%\stock\stock.db  (con el sistema CERRADO)
--   2. Pestaña "Execute SQL" → pegar todo este archivo → ▶ (Execute all)
--   3. Write Changes (Ctrl + S)  ← ¡si no, no se guarda nada!
-- Se puede correr más de una vez: no duplica nada.
-- Precios de ejemplo (noviembre 2026): el costo es el precio dividido 1,4 (40 % de ganancia).

BEGIN;

-- Categorías
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Bebidas');
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Almacén');
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Lácteos');
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Fiambrería');
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Limpieza');
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Golosinas');
INSERT OR IGNORE INTO categorias (nombre) VALUES ('Panadería');

-- Productos (cantidades en milésimas: 1 unidad = 1000, 1,25 kg = 1250)
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790895000997', 'Gaseosa cola 2,25 L', (SELECT id FROM categorias WHERE nombre = 'Bebidas'), 'unidad', 300000, 420000, 6000, 'gaseosa cola 2,25 l 7790895000997', 'gaseosa cola 2,25 l'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Gaseosa cola 2,25 L');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790895001017', 'Gaseosa lima limón 2,25 L', (SELECT id FROM categorias WHERE nombre = 'Bebidas'), 'unidad', 285700, 400000, 6000, 'gaseosa lima limon 2,25 l 7790895001017', 'gaseosa lima limon 2,25 l'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Gaseosa lima limón 2,25 L');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7798062540017', 'Agua mineral 1,5 L', (SELECT id FROM categorias WHERE nombre = 'Bebidas'), 'unidad', 114300, 160000, 12000, 'agua mineral 1,5 l 7798062540017', 'agua mineral 1,5 l'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Agua mineral 1,5 L');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7792798007394', 'Cerveza rubia lata 473 ml', (SELECT id FROM categorias WHERE nombre = 'Bebidas'), 'unidad', 157100, 220000, 24000, 'cerveza rubia lata 473 ml 7792798007394', 'cerveza rubia lata 473 ml'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Cerveza rubia lata 473 ml');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790240093018', 'Vino tinto Malbec 750 ml', (SELECT id FROM categorias WHERE nombre = 'Bebidas'), 'unidad', 392900, 550000, 6000, 'vino tinto malbec 750 ml 7790240093018', 'vino tinto malbec 750 ml'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Vino tinto Malbec 750 ml');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7622300862589', 'Jugo en polvo naranja', (SELECT id FROM categorias WHERE nombre = 'Bebidas'), 'unidad', 32100, 45000, 20000, 'jugo en polvo naranja 7622300862589', 'jugo en polvo naranja'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Jugo en polvo naranja');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790387013104', 'Yerba mate 1 kg', (SELECT id FROM categorias WHERE nombre = 'Almacén'), 'unidad', 371400, 520000, 10000, 'yerba mate 1 kg 7790387013104', 'yerba mate 1 kg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Yerba mate 1 kg');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790150100011', 'Azúcar 1 kg', (SELECT id FROM categorias WHERE nombre = 'Almacén'), 'unidad', 100000, 140000, 10000, 'azucar 1 kg 7790150100011', 'azucar 1 kg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Azúcar 1 kg');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790070318305', 'Arroz largo fino 1 kg', (SELECT id FROM categorias WHERE nombre = 'Almacén'), 'unidad', 135700, 190000, 8000, 'arroz largo fino 1 kg 7790070318305', 'arroz largo fino 1 kg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Arroz largo fino 1 kg');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790070411716', 'Fideos spaghetti 500 g', (SELECT id FROM categorias WHERE nombre = 'Almacén'), 'unidad', 107100, 150000, 10000, 'fideos spaghetti 500 g 7790070411716', 'fideos spaghetti 500 g'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Fideos spaghetti 500 g');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790060234059', 'Aceite de girasol 1,5 L', (SELECT id FROM categorias WHERE nombre = 'Almacén'), 'unidad', 292900, 410000, 6000, 'aceite de girasol 1,5 l 7790060234059', 'aceite de girasol 1,5 l'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Aceite de girasol 1,5 L');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7792180001603', 'Harina 000 1 kg', (SELECT id FROM categorias WHERE nombre = 'Almacén'), 'unidad', 78600, 110000, 8000, 'harina 000 1 kg 7792180001603', 'harina 000 1 kg'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Harina 000 1 kg');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790036001289', 'Puré de tomate 520 g', (SELECT id FROM categorias WHERE nombre = 'Almacén'), 'unidad', 75000, 105000, 8000, 'pure de tomate 520 g 7790036001289', 'pure de tomate 520 g'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Puré de tomate 520 g');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790040613485', 'Galletitas de agua', (SELECT id FROM categorias WHERE nombre = 'Almacén'), 'unidad', 103600, 145000, 6000, 'galletitas de agua 7790040613485', 'galletitas de agua'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Galletitas de agua');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790742300015', 'Leche entera 1 L', (SELECT id FROM categorias WHERE nombre = 'Lácteos'), 'unidad', 117900, 165000, 12000, 'leche entera 1 l 7790742300015', 'leche entera 1 l'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Leche entera 1 L');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790080072389', 'Yogur bebible frutilla 1 L', (SELECT id FROM categorias WHERE nombre = 'Lácteos'), 'unidad', 207100, 290000, 6000, 'yogur bebible frutilla 1 l 7790080072389', 'yogur bebible frutilla 1 l'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Yogur bebible frutilla 1 L');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790742103807', 'Manteca 200 g', (SELECT id FROM categorias WHERE nombre = 'Lácteos'), 'unidad', 235700, 330000, 4000, 'manteca 200 g 7790742103807', 'manteca 200 g'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Manteca 200 g');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT NULL, 'Queso cremoso', (SELECT id FROM categorias WHERE nombre = 'Lácteos'), 'kg', 892900, 1250000, 2000, 'queso cremoso', 'queso cremoso'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Queso cremoso');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT NULL, 'Jamón cocido', (SELECT id FROM categorias WHERE nombre = 'Fiambrería'), 'kg', 1142900, 1600000, 2000, 'jamon cocido', 'jamon cocido'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Jamón cocido');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT NULL, 'Salame tandilero', (SELECT id FROM categorias WHERE nombre = 'Fiambrería'), 'kg', 1357100, 1900000, 1000, 'salame tandilero', 'salame tandilero'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Salame tandilero');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT NULL, 'Queso de máquina', (SELECT id FROM categorias WHERE nombre = 'Fiambrería'), 'kg', 964300, 1350000, 1500, 'queso de maquina', 'queso de maquina'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Queso de máquina');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790990585580', 'Lavandina 1 L', (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'unidad', 92900, 130000, 6000, 'lavandina 1 l 7790990585580', 'lavandina 1 l'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lavandina 1 L');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT NULL, 'Lavandina suelta', (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'litro', 64300, 90000, 5000, 'lavandina suelta', 'lavandina suelta'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Lavandina suelta');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7791290786226', 'Detergente 750 ml', (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'unidad', 150000, 210000, 5000, 'detergente 750 ml 7791290786226', 'detergente 750 ml'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Detergente 750 ml');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790250096375', 'Papel higiénico x4', (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'unidad', 228600, 320000, 6000, 'papel higienico x4 7790250096375', 'papel higienico x4'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Papel higiénico x4');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7791290012813', 'Jabón en polvo 800 g', (SELECT id FROM categorias WHERE nombre = 'Limpieza'), 'unidad', 307100, 430000, 4000, 'jabon en polvo 800 g 7791290012813', 'jabon en polvo 800 g'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Jabón en polvo 800 g');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790580116307', 'Alfajor triple chocolate', (SELECT id FROM categorias WHERE nombre = 'Golosinas'), 'unidad', 92900, 130000, 12000, 'alfajor triple chocolate 7790580116307', 'alfajor triple chocolate'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Alfajor triple chocolate');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7795184001233', 'Chicles menta', (SELECT id FROM categorias WHERE nombre = 'Golosinas'), 'unidad', 42900, 60000, 15000, 'chicles menta 7795184001233', 'chicles menta'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Chicles menta');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT '7790580508805', 'Chocolate con leche 100 g', (SELECT id FROM categorias WHERE nombre = 'Golosinas'), 'unidad', 271400, 380000, 5000, 'chocolate con leche 100 g 7790580508805', 'chocolate con leche 100 g'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Chocolate con leche 100 g');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT NULL, 'Caramelos surtidos', (SELECT id FROM categorias WHERE nombre = 'Golosinas'), 'kg', 571400, 800000, 1000, 'caramelos surtidos', 'caramelos surtidos'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Caramelos surtidos');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT NULL, 'Pan francés', (SELECT id FROM categorias WHERE nombre = 'Panadería'), 'kg', 228600, 320000, 3000, 'pan frances', 'pan frances'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Pan francés');
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden)
SELECT NULL, 'Medialunas', (SELECT id FROM categorias WHERE nombre = 'Panadería'), 'unidad', 46400, 65000, 12000, 'medialunas', 'medialunas'
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Medialunas');

-- Stock inicial: un movimiento "inicial" por producto (solo si todavía no tiene movimientos)
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 18000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Gaseosa cola 2,25 L' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 4000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Gaseosa lima limón 2,25 L' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 30000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Agua mineral 1,5 L' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 48000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Cerveza rubia lata 473 ml' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 9000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Vino tinto Malbec 750 ml' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 7000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Yerba mate 1 kg' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 25000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Azúcar 1 kg' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 14000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Arroz largo fino 1 kg' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 22000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Fideos spaghetti 500 g' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 3000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Aceite de girasol 1,5 L' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 16000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Harina 000 1 kg' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 20000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Puré de tomate 520 g' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 20000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Leche entera 1 L' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 6000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Yogur bebible frutilla 1 L' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 8000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Manteca 200 g' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 3400, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Queso cremoso' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 1250, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Jamón cocido' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 2800, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Salame tandilero' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 15000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Lavandina 1 L' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 12500, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Lavandina suelta' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 10000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Detergente 750 ml' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 5000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Papel higiénico x4' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 7000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Jabón en polvo 800 g' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 36000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Alfajor triple chocolate' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 40000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Chicles menta' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 10000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Chocolate con leche 100 g' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 800, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Caramelos surtidos' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 6000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Pan francés' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT id, 'inicial', 24000, costo_centavos, 'Stock inicial', date('now', 'localtime')
FROM productos WHERE nombre = 'Medialunas' AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = productos.id);

COMMIT;
