-- Datos de prueba — Sistema de stock, etapa 3 (mercadería parada)
-- Agrega 4 productos que están en el estante y casi no se venden, para ver el reporte
-- "Mercadería parada". Necesita los datos de la etapa 1 y 2.
-- DB Browser: Execute SQL → pegar todo → ▶ → Write Changes (Ctrl + S).
-- Se puede correr más de una vez: no duplica nada.
-- (Sin BEGIN/COMMIT: DB Browser ya abre su propia transacción.)

INSERT OR IGNORE INTO categorias (nombre) VALUES ('Bazar');

-- Productos dados de alta hace 50 días
INSERT INTO productos (codigo, nombre, categoria_id, unidad, costo_centavos, precio_centavos, stock_minimo, busqueda, orden, creado_en)
SELECT v.column1, v.column2, (SELECT id FROM categorias WHERE nombre = v.column3), 'unidad',
       v.column4, v.column5, v.column6, v.column7, v.column8, datetime('now', 'localtime', '-50 days')
FROM (VALUES
  ('7790580660015', 'Aceitunas verdes 500 g', 'Almacén', 280000, 390000, 3000, 'aceitunas verdes 500 g 7790580660015', 'aceitunas verdes 500 g'),
  ('7792900000303', 'Vinagre de alcohol 1 L', 'Almacén', 85000, 120000, 2000, 'vinagre de alcohol 1 l 7792900000303', 'vinagre de alcohol 1 l'),
  ('7795500100024', 'Pilas AA x4', 'Bazar', 460000, 650000, 2000, 'pilas aa x4 7795500100024', 'pilas aa x4'),
  ('7790150540088', 'Té en saquitos x25', 'Almacén', 110000, 155000, 3000, 'te en saquitos x25 7790150540088', 'te en saquitos x25')
) AS v
WHERE NOT EXISTS (SELECT 1 FROM productos p WHERE p.nombre = v.column2);

-- Stock inicial (hace 50 días)
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, motivo, fecha)
SELECT p.id, 'inicial', v.column2, p.costo_centavos, 'Stock inicial', date('now', 'localtime', '-50 days')
FROM (VALUES
  ('Aceitunas verdes 500 g', 14000),
  ('Vinagre de alcohol 1 L', 10000),
  ('Pilas AA x4', 8000),
  ('Té en saquitos x25', 12000)
) AS v
JOIN productos p ON p.nombre = v.column1
WHERE NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = p.id);

-- El té se vendió una sola vez, hace 40 días
INSERT INTO movimientos (producto_id, tipo, cantidad, costo_centavos, precio_centavos, fecha)
SELECT p.id, 'venta', -2000, p.costo_centavos, p.precio_centavos, date('now', 'localtime', '-40 days')
FROM productos p
WHERE p.nombre = 'Té en saquitos x25'
  AND NOT EXISTS (SELECT 1 FROM movimientos m WHERE m.producto_id = p.id AND m.tipo = 'venta');
