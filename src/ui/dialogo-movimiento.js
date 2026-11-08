// ui/dialogo-movimiento.js — El formulario para registrar un movimiento.
// Lo usan la ficha del producto (botones Entrada / Salida / Contar) y la vista Movimientos.
//
// Uso: abrirMovimiento({ producto, grupo, alGuardar })
//   producto: el producto ya elegido, o null para buscarlo (con el lector o escribiendo)
//   grupo: 'entrada' | 'salida' | 'ajuste' | 'todos'
//   alGuardar: función que se llama después de guardar (para recargar la pantalla)

const abrirMovimiento = (() => {
  const dialogo = document.getElementById('dialogo-movimiento');
  const form = document.getElementById('form-movimiento');
  const titulo = document.getElementById('titulo-movimiento');
  const contenedorTipos = document.getElementById('movimiento-tipos');
  const explicacion = document.getElementById('movimiento-explicacion');
  const bloqueBuscar = document.getElementById('movimiento-buscar-bloque');
  const buscador = document.getElementById('movimiento-buscar');
  const resultados = document.getElementById('movimiento-resultados');
  const bloqueProducto = document.getElementById('movimiento-producto');
  const nombreProducto = document.getElementById('movimiento-producto-nombre');
  const stockProducto = document.getElementById('movimiento-producto-stock');
  const btnCambiar = document.getElementById('movimiento-cambiar');
  const etiquetaCantidad = document.getElementById('etiqueta-cantidad');
  const bloqueCosto = document.getElementById('bloque-costo');
  const etiquetaCosto = document.getElementById('etiqueta-costo');
  const bloquePrecio = document.getElementById('bloque-precio');
  const etiquetaPrecio = document.getElementById('etiqueta-precio');
  const vistaPrevia = document.getElementById('movimiento-vista-previa');
  const error = document.getElementById('error-movimiento');
  const btnCancelar = document.getElementById('btn-cancelar-movimiento');

  const TITULOS = {
    entrada: 'Registrar entrada',
    salida: 'Registrar salida',
    ajuste: 'Ajustar por conteo',
    todos: 'Registrar movimiento',
  };

  let producto = null; // el producto elegido
  let alGuardar = null;

  const tipoElegido = () => form.elements.tipo?.value ?? null;

  // ---------- Tipos: botones tipo "segmento" ----------
  function armarTipos(grupo) {
    const tipos = Object.entries(TIPOS_MOVIMIENTO).filter(
      ([clave, info]) => clave !== 'inicial' && (grupo === 'todos' || info.grupo === grupo)
    );
    contenedorTipos.replaceChildren(
      ...tipos.map(([clave, info], indice) => {
        const radio = crear('input', { tipo: 'radio', valor: clave });
        radio.name = 'tipo';
        radio.checked = indice === 0;
        radio.addEventListener('change', actualizarTipo);
        return crear('label', { clase: 'segmento' }, [radio, crear('span', { texto: info.nombre })]);
      })
    );
    // Si hay un solo tipo posible (ajuste), no hace falta mostrar los botones
    contenedorTipos.hidden = tipos.length === 1;
  }

  // Cada tipo muestra sus campos y textos
  function actualizarTipo() {
    const tipo = tipoElegido();
    const info = TIPOS_MOVIMIENTO[tipo];
    explicacion.textContent = info.explicacion;
    form.elements.motivo.placeholder = info.nota;
    bloqueCosto.hidden = tipo !== 'compra';
    bloquePrecio.hidden = tipo !== 'venta';
    actualizarEtiquetas();
    actualizarVistaPrevia();
  }

  function actualizarEtiquetas() {
    const tipo = tipoElegido();
    const unidad = producto ? UNIDADES[producto.unidad] : UNIDADES.unidad;
    etiquetaCantidad.textContent = `${TIPOS_MOVIMIENTO[tipo].cantidad} (${unidad.plural})`;
    const porUnidad = producto && producto.unidad !== 'unidad' ? `por ${unidad.singular}` : 'por unidad';
    etiquetaCosto.textContent = `Costo ${porUnidad} ($)`;
    etiquetaPrecio.textContent = `Precio cobrado ${porUnidad} ($)`;
  }

  // ---------- Producto ----------
  function elegirProducto(elegido) {
    producto = elegido;
    resultados.hidden = true;
    bloqueBuscar.hidden = true;
    bloqueProducto.hidden = false;
    nombreProducto.textContent = producto.nombre;
    stockProducto.textContent = `Hay ${cantidadConUnidad(producto.stock, producto.unidad)}`;
    // Proponemos el costo y el precio actuales (se pueden cambiar)
    form.elements.costo.value = producto.costo_centavos ? centavosATexto(producto.costo_centavos) : '';
    form.elements.precio.value = centavosATexto(producto.precio_centavos);
    actualizarEtiquetas();
    actualizarVistaPrevia();
    form.elements.cantidad.focus();
  }

  function cambiarProducto() {
    producto = null;
    bloqueProducto.hidden = true;
    bloqueBuscar.hidden = false;
    buscador.value = '';
    resultados.hidden = true;
    actualizarVistaPrevia();
    buscador.focus();
  }

  let encontrados = [];
  async function buscar() {
    const texto = buscador.value.trim();
    if (!texto) {
      resultados.hidden = true;
      encontrados = [];
      return;
    }
    const lista = await pedir(window.api.listarProductos({ busqueda: texto, mostrar: 'activos' }), error);
    if (lista === null) return;
    encontrados = lista;
    resultados.replaceChildren(
      ...lista.slice(0, 6).map((p) =>
        crear('li', {}, [
          crear('button', { tipo: 'button', alClick: () => elegirProducto(p) }, [
            crear('strong', { texto: p.nombre }),
            crear('span', { texto: `${p.codigo ? `${p.codigo} · ` : ''}hay ${cantidadCorta(p.stock, p.unidad)}` }),
          ]),
        ])
      ),
      ...(lista.length === 0 ? [crear('li', { clase: 'sin-resultados', texto: 'No hay productos con ese nombre o código' })] : [])
    );
    resultados.hidden = false;
  }

  let esperaBusqueda;
  buscador.addEventListener('input', () => {
    clearTimeout(esperaBusqueda);
    esperaBusqueda = setTimeout(buscar, 150);
  });

  // El lector "escribe" el código y aprieta Enter: elegimos ese producto
  buscador.addEventListener('keydown', async (evento) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault(); // que no se envíe el formulario
    clearTimeout(esperaBusqueda);
    await buscar();
    const texto = buscador.value.trim().toLowerCase();
    const exacto = encontrados.find((p) => p.codigo && p.codigo.toLowerCase() === texto);
    const elegido = exacto ?? (encontrados.length === 1 ? encontrados[0] : null);
    if (elegido) elegirProducto(elegido);
  });

  btnCambiar.addEventListener('click', cambiarProducto);

  // ---------- Vista previa: cómo queda el stock ----------
  function actualizarVistaPrevia() {
    vistaPrevia.className = 'vista-previa';
    vistaPrevia.textContent = '';
    if (!producto) return;

    const tipo = tipoElegido();
    const cantidad = parsearCantidad(form.elements.cantidad.value, producto.unidad);
    if (!cantidad && tipo !== 'ajuste') return;
    if (cantidad === null) return;
    if (tipo === 'ajuste' && form.elements.cantidad.value.trim() === '') return;

    const actual = producto.stock;
    const conUnidad = (m) => cantidadConUnidad(m, producto.unidad);

    if (tipo === 'ajuste') {
      const diferencia = cantidad - actual;
      if (diferencia === 0) {
        vistaPrevia.textContent = 'Coincide con el sistema: no hace falta ajustar.';
      } else {
        vistaPrevia.textContent =
          `El sistema dice ${conUnidad(actual)} y contaste ${conUnidad(cantidad)}: ` +
          `${diferencia > 0 ? 'se suman' : 'se descuentan'} ${conUnidad(Math.abs(diferencia))}.`;
      }
      return;
    }

    const signo = TIPOS_MOVIMIENTO[tipo].grupo === 'salida' ? -1 : 1;
    const nuevo = actual + signo * cantidad;
    if (nuevo < 0) {
      vistaPrevia.textContent = `No alcanza: hay ${conUnidad(actual)}.`;
      vistaPrevia.classList.add('alerta');
      return;
    }

    let texto = `Stock: ${numeroCantidad(actual)} → ${conUnidad(nuevo)}`;
    const plata =
      tipo === 'compra' ? parsearImporte(form.elements.costo.value) :
      tipo === 'venta' ? parsearImporte(form.elements.precio.value) : null;
    if (plata) texto += ` · Total ${pesos(Math.round((cantidad * plata) / 1000))}`;
    vistaPrevia.textContent = texto;
  }

  for (const nombre of ['cantidad', 'costo', 'precio']) {
    form.elements[nombre].addEventListener('input', actualizarVistaPrevia);
  }
  form.addEventListener('input', () => (error.textContent = ''));

  // ---------- Guardar ----------
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    error.textContent = '';
    if (!producto) {
      error.textContent = 'Elegí un producto';
      buscador.focus();
      return;
    }

    const tipo = tipoElegido();
    const cantidad = parsearCantidad(form.elements.cantidad.value, producto.unidad);
    const ejemplo = producto.unidad === 'unidad' ? 'sin decimales, por ejemplo 12' : 'por ejemplo 1,250';
    if (cantidad === null || (tipo !== 'ajuste' && cantidad === 0) || form.elements.cantidad.value.trim() === '') {
      error.textContent = `Ingresá la cantidad (${ejemplo})`;
      form.elements.cantidad.focus();
      return;
    }

    const datos = {
      productoId: producto.id,
      tipo,
      cantidad,
      fecha: form.elements.fecha.value,
      motivo: form.elements.motivo.value,
    };
    if (tipo === 'compra') {
      const costo = parsearImporte(form.elements.costo.value);
      if (costo === null && form.elements.costo.value.trim() !== '') {
        error.textContent = 'Ingresá un costo válido, por ejemplo 3.700';
        return;
      }
      datos.costoCentavos = costo;
      datos.actualizarCosto = form.elements.actualizarCosto.checked;
    }
    if (tipo === 'venta') {
      const precio = parsearImporte(form.elements.precio.value);
      if (precio === null) {
        error.textContent = 'Ingresá el precio cobrado, por ejemplo 5.200';
        return;
      }
      datos.precioCentavos = precio;
    }

    const resultado = await pedir(window.api.registrarMovimiento(datos), error);
    if (resultado === null) return;

    dialogo.close();
    mostrarMensaje(
      `${TIPOS_MOVIMIENTO[tipo].registrado} · ${producto.nombre}: ` +
        cantidadConUnidad(resultado.stockNuevo, producto.unidad)
    );
    refrescarAvisoReponer();
    alGuardar?.();
  });

  btnCancelar.addEventListener('click', () => dialogo.close());

  // ---------- Abrir ----------
  return function abrir({ producto: elegido = null, grupo = 'todos', alGuardar: despues = null } = {}) {
    alGuardar = despues;
    titulo.textContent = TITULOS[grupo] ?? TITULOS.todos;
    error.textContent = '';
    form.reset();
    form.elements.fecha.value = hoyISO();
    form.elements.fecha.max = hoyISO(); // el calendario no deja elegir días futuros
    armarTipos(grupo);

    dialogo.showModal();
    if (elegido) {
      elegirProducto(elegido);
    } else {
      cambiarProducto();
    }
    actualizarTipo();
  };
})();
