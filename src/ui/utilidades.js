// ui/utilidades.js — Funciones de ayuda para toda la interfaz.

// ---------- Crear elementos HTML ----------
// crear('td', { clase: 'derecha', texto: '$ 25.000' })
// crear('div', { clase: 'tarjeta' }, [hijo1, hijo2])
function crear(etiqueta, opciones = {}, hijos = []) {
  const elemento = document.createElement(etiqueta);
  if (opciones.clase) elemento.className = opciones.clase;
  if (opciones.texto !== undefined && opciones.texto !== null) {
    elemento.textContent = opciones.texto; // siempre textContent: seguro
  }
  if (opciones.valor !== undefined) elemento.value = opciones.valor;
  if (opciones.titulo) elemento.title = opciones.titulo;
  if (opciones.tipo) elemento.type = opciones.tipo;
  if (opciones.alClick) elemento.addEventListener('click', opciones.alClick);
  elemento.append(...hijos);
  return elemento;
}

// ---------- Plata (en centavos) ----------
const formatoPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

function pesos(centavos) {
  return formatoPesos.format(centavos / 100);
}

// Sin centavos, para los números grandes de arriba: "$ 1.268.560"
const formatoPesosRedondo = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function pesosRedondo(centavos) {
  return formatoPesosRedondo.format(Math.round(centavos / 100));
}

// Lee un número escrito "a la argentina": la coma es decimal y el punto separa miles.
// "1.250,5" → 1250.5 · "1250,5" → 1250.5 · "1250.5" → 1250.5 · "1.250" → 1250
// Con puntoEsDecimal (para kilos y litros), "0.250" o "1.250" son decimales:
// nadie vende 1.250 kilos en un almacén, pero sí un kilo y cuarto.
// Devuelve null si no es un número.
function leerNumero(texto, puntoEsDecimal = false) {
  let limpio = String(texto ?? '').replace(/[$\s%]/g, '');
  if (limpio === '') return null;
  if (limpio.includes(',')) {
    limpio = limpio.replace(/\./g, '').replace(',', '.');
  } else if (!puntoEsDecimal && /^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    limpio = limpio.replace(/\./g, ''); // "1.250" o "12.500.000": puntos de miles
  }
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return null;
  return Number(limpio);
}

// Importe en pesos → centavos. Acepta cero (por ejemplo, un costo que no sabemos).
function parsearImporte(texto) {
  const numero = leerNumero(texto);
  if (numero === null || numero < 0) return null;
  return Math.round(numero * 100);
}

function centavosATexto(centavos) {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

// ---------- Cantidades (en milésimas) ----------
// Igual que la plata: se guardan enteras. 1 unidad = 1000, 1,25 kg = 1250.
const UNIDADES = {
  unidad: { singular: 'unidad', plural: 'unidades', corta: 'u.', decimales: false },
  kg: { singular: 'kg', plural: 'kg', corta: 'kg', decimales: true },
  litro: { singular: 'litro', plural: 'litros', corta: 'l', decimales: true },
};

const formatoCantidad = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 });

// 24000 → "24" · 1250 → "1,25"
function numeroCantidad(milesimas) {
  return formatoCantidad.format(milesimas / 1000);
}

// (24000, 'unidad') → "24 unidades" · (1250, 'kg') → "1,25 kg"
function cantidadConUnidad(milesimas, unidad) {
  const info = UNIDADES[unidad] ?? UNIDADES.unidad;
  const nombre = milesimas === 1000 ? info.singular : info.plural;
  return `${numeroCantidad(milesimas)} ${nombre}`;
}

// Versión corta para las tablas: "24 u." · "1,25 kg"
function cantidadCorta(milesimas, unidad) {
  const info = UNIDADES[unidad] ?? UNIDADES.unidad;
  return `${numeroCantidad(milesimas)} ${info.corta}`;
}

// "1,25" → 1250. Devuelve null si no es válida para esa unidad.
function parsearCantidad(texto, unidad) {
  if (String(texto ?? '').trim() === '') return 0; // vacío = cero
  const numero = leerNumero(texto, UNIDADES[unidad].decimales);
  if (numero === null || numero < 0) return null;
  const milesimas = Math.round(numero * 1000);
  if (!UNIDADES[unidad].decimales && milesimas % 1000 !== 0) return null;
  return milesimas;
}

// Para mostrar una cantidad dentro de un campo de texto: 1250 → "1,25"
function cantidadATexto(milesimas) {
  return String(milesimas / 1000).replace('.', ',');
}

// ---------- Ganancia ----------
// Porcentaje que se le suma al costo. Costo $1.000 y precio $1.400 → 40 %
function porcentajeGanancia(costoCentavos, precioCentavos) {
  if (!costoCentavos) return null;
  return ((precioCentavos - costoCentavos) / costoCentavos) * 100;
}

const formatoPorcentaje = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

function textoPorcentaje(numero) {
  return `${formatoPorcentaje.format(numero)} %`;
}

// ---------- Fechas ----------
// "2026-11-03" o "2026-11-03 20:15:00" → "03/11/2026"
function fechaCorta(iso) {
  if (!iso) return '—';
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

// ---------- Estado del stock ----------
const ESTADOS_STOCK = {
  ok: { texto: 'Con stock', corto: 'Con stock', clase: 'verde' },
  bajo: { texto: 'Stock bajo', corto: 'Bajo', clase: 'amarilla' },
  sin_stock: { texto: 'Sin stock', corto: 'Sin stock', clase: 'roja' },
};

// corto = true para las tablas, donde el espacio es poco
function insigniaStock(estado, corto = false) {
  const info = ESTADOS_STOCK[estado] ?? ESTADOS_STOCK.ok;
  return crear('span', { clase: `insignia ${info.clase}`, texto: corto ? info.corto : info.texto });
}

// Barrita de nivel (como el medidor de nafta). Está llena cuando hay el triple del
// mínimo o más; si el producto no tiene mínimo, llena si hay algo y vacía si no.
function nivelStock(producto) {
  const { stock, stock_minimo: minimo } = producto;
  let porcentaje;
  if (stock <= 0) porcentaje = 0;
  else if (minimo > 0) porcentaje = Math.min(100, (stock / (minimo * 3)) * 100);
  else porcentaje = 100;

  const clase = producto.activo ? ESTADOS_STOCK[producto.estado_stock].clase : 'gris';
  const relleno = crear('span');
  // Un poquito de barra aunque quede poco, para que se vea que algo hay
  relleno.style.width = `${stock > 0 ? Math.max(porcentaje, 6) : 0}%`;
  return crear('span', { clase: `nivel ${clase}`, titulo: 'Nivel de stock respecto del mínimo' }, [relleno]);
}

// ---------- Movimientos ----------
// grupo: de qué lado del mostrador está. Explicación y textos para el formulario.
const TIPOS_MOVIMIENTO = {
  compra: {
    nombre: 'Compra',
    registrado: 'Compra registrada',
    grupo: 'entrada',
    explicacion: 'Entra mercadería que le compraste a un proveedor.',
    cantidad: 'Cantidad que entra',
    nota: 'Proveedor, número de factura…',
  },
  devolucion: {
    nombre: 'Devolución',
    registrado: 'Devolución registrada',
    grupo: 'entrada',
    explicacion: 'Un cliente devolvió mercadería y vuelve al estante.',
    cantidad: 'Cantidad que vuelve',
    nota: 'Por qué la devolvió…',
  },
  venta: {
    nombre: 'Venta',
    registrado: 'Venta registrada',
    grupo: 'salida',
    explicacion: 'Sale mercadería que se vendió.',
    cantidad: 'Cantidad vendida',
    nota: 'Cliente, forma de pago…',
  },
  merma: {
    nombre: 'Merma',
    registrado: 'Merma registrada',
    grupo: 'salida',
    explicacion: 'Sale mercadería que se rompió, se venció o se perdió.',
    cantidad: 'Cantidad que se pierde',
    nota: 'Se rompió, se venció…',
  },
  ajuste: {
    nombre: 'Ajuste por conteo',
    registrado: 'Stock ajustado',
    grupo: 'ajuste',
    explicacion:
      'Contaste el estante y no coincide con el sistema: cargá lo que contaste y el sistema corrige la diferencia.',
    cantidad: 'Cantidad contada',
    nota: 'Conteo de inventario',
  },
  inicial: { nombre: 'Stock inicial', grupo: 'entrada' },
};

// 12000 → "+12 u." · -3000 → "−3 u." (con el signo menos de verdad, que es más largo)
function cantidadConSigno(milesimas, unidad) {
  const signo = milesimas > 0 ? '+' : '−';
  return `${signo}${cantidadCorta(Math.abs(milesimas), unidad)}`;
}

// Fecha de hoy (de la compu) como "AAAA-MM-DD"
function hoyISO() {
  const fecha = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

// Primer día del mes actual: "AAAA-MM-01"
function primerDiaDelMes() {
  return `${hoyISO().slice(0, 7)}-01`;
}
