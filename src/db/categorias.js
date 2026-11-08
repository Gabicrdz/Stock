// db/categorias.js — Categorías de productos (Bebidas, Limpieza, Lácteos...).

const { obtenerDb, texto, validarId } = require('./conexion');

// Ordena como en el diccionario: "Lácteos" antes que "Limpieza".
// (SQLite, por su cuenta, pone las letras con tilde al final.)
const alfabetico = new Intl.Collator('es', { sensitivity: 'base' });

function listarCategorias({ incluirInactivas = false } = {}) {
  const categorias = obtenerDb()
    .prepare(
      `SELECT c.id, c.nombre, c.activo,
              (SELECT COUNT(*) FROM productos p
                WHERE p.categoria_id = c.id AND p.activo = 1) AS cantidad_productos
         FROM categorias c
        WHERE @todas = 1 OR c.activo = 1`
    )
    .all({ todas: incluirInactivas ? 1 : 0 });
  return categorias.sort((a, b) => alfabetico.compare(a.nombre, b.nombre));
}

function validarNombre(nombre) {
  const limpio = texto(nombre, 40);
  if (!limpio) throw new Error('El nombre de la categoría es obligatorio');
  return limpio;
}

// El nombre es UNIQUE: si se repite, SQLite tira un error con este código
function traducirError(error) {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return new Error('Ya existe una categoría con ese nombre');
  }
  return error;
}

function crearCategoria({ nombre }) {
  try {
    const resultado = obtenerDb()
      .prepare('INSERT INTO categorias (nombre) VALUES (?)')
      .run(validarNombre(nombre));
    return { id: Number(resultado.lastInsertRowid) };
  } catch (error) {
    throw traducirError(error);
  }
}

function renombrarCategoria(id, { nombre }) {
  validarId(id, 'Categoría');
  try {
    const resultado = obtenerDb()
      .prepare('UPDATE categorias SET nombre = ? WHERE id = ?')
      .run(validarNombre(nombre), id);
    if (resultado.changes === 0) throw new Error('La categoría no existe');
    return true;
  } catch (error) {
    throw traducirError(error);
  }
}

// Baja lógica: los productos la conservan, pero no se puede elegir para productos nuevos
function cambiarEstadoCategoria(id, activa) {
  validarId(id, 'Categoría');
  const resultado = obtenerDb()
    .prepare('UPDATE categorias SET activo = ? WHERE id = ?')
    .run(activa ? 1 : 0, id);
  if (resultado.changes === 0) throw new Error('La categoría no existe');
  return true;
}

module.exports = { listarCategorias, crearCategoria, renombrarCategoria, cambiarEstadoCategoria };
