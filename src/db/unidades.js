// db/unidades.js — Cómo se mide cada producto y cómo validar sus cantidades.
//
// Las cantidades se guardan en MILÉSIMAS, enteras. Es la misma idea que los centavos:
// las computadoras se equivocan con los decimales (0.1 + 0.2 = 0.30000000000000004),
// así que guardamos números enteros y recién al mostrarlos los dividimos por 1000.
//   1 unidad   → 1000
//   1,250 kg   → 1250  (un kilo y cuarto)
//   0,5 litros → 500

const UNIDADES = {
  unidad: { nombre: 'unidad', plural: 'unidades', abreviatura: 'u.', decimales: false },
  kg: { nombre: 'kg', plural: 'kg', abreviatura: 'kg', decimales: true },
  litro: { nombre: 'litro', plural: 'litros', abreviatura: 'l', decimales: true },
};

function validarUnidad(unidad) {
  if (!Object.hasOwn(UNIDADES, unidad)) throw new Error('Elegí una unidad: unidad, kg o litro');
  return unidad;
}

// Valida una cantidad en milésimas. "nombreCampo" se usa en el mensaje de error.
function validarCantidad(milesimas, unidad, nombreCampo, { permitirCero = true } = {}) {
  if (!Number.isInteger(milesimas) || milesimas < 0) {
    throw new Error(`${nombreCampo}: ingresá una cantidad válida`);
  }
  if (!permitirCero && milesimas === 0) {
    throw new Error(`${nombreCampo}: tiene que ser mayor a cero`);
  }
  if (!UNIDADES[unidad].decimales && milesimas % 1000 !== 0) {
    throw new Error(`${nombreCampo}: los productos por unidad no llevan decimales`);
  }
  if (milesimas > 1e12) throw new Error(`${nombreCampo}: la cantidad es demasiado grande`);
  return milesimas;
}

module.exports = { UNIDADES, validarUnidad, validarCantidad };
