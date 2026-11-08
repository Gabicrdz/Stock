// ui/vista-movimientos.js — Todos los movimientos de un período, con totales y filtros.

(() => {
  const desde = document.getElementById('mov-desde');
  const hasta = document.getElementById('mov-hasta');
  const filtroTipo = document.getElementById('mov-tipo');
  const buscador = document.getElementById('mov-buscador');
  const filtroProducto = document.getElementById('mov-filtro-producto');
  const nombreFiltroProducto = document.getElementById('mov-filtro-producto-nombre');
  const btnQuitarProducto = document.getElementById('mov-quitar-producto');
  const contador = document.getElementById('contador-movimientos');
  const tabla = document.getElementById('tabla-movimientos');
  const vacio = document.getElementById('movimientos-vacio');
  const btnNuevo = document.getElementById('btn-nuevo-movimiento');

  let productoFiltrado = null; // { id, nombre } cuando se llega desde una ficha

  // Por defecto: desde el primer día del mes hasta hoy
  function periodoPorDefecto() {
    desde.value = primerDiaDelMes();
    hasta.value = hoyISO();
  }
  periodoPorDefecto();

  // ---------- Lista ----------
  async function cargar() {
    const respuesta = await pedir(
      window.api.listarMovimientos({
        desde: desde.value,
        hasta: hasta.value,
        tipo: filtroTipo.value,
        busqueda: buscador.value,
        productoId: productoFiltrado?.id ?? null,
      })
    );
    if (respuesta === null) return;

    const { movimientos, totales } = respuesta;
    document.getElementById('mov-ventas').textContent = pesosRedondo(totales.ventasCentavos);
    document.getElementById('mov-compras').textContent = pesosRedondo(totales.comprasCentavos);
    document.getElementById('mov-mermas').textContent = pesosRedondo(totales.mermasCentavos);
    document.getElementById('mov-cantidad').textContent = totales.cantidad;

    renderTabla(movimientos);
  }

  // Importe de cada renglón: compras y mermas al costo, ventas al precio cobrado
  function importe(m) {
    const valor =
      m.tipo === 'venta' ? m.precio_centavos :
      m.tipo === 'compra' || m.tipo === 'merma' ? m.costo_centavos : null;
    if (valor === null || valor === undefined) return '—';
    return pesos(Math.round((Math.abs(m.cantidad) * valor) / 1000));
  }

  function renderTabla(movimientos) {
    tabla.replaceChildren(
      ...movimientos.map((m) =>
        crear('tr', { clase: m.anulado ? 'anulado' : '' }, [
          crear('td', { texto: fechaCorta(m.fecha) }),
          crear('td', {}, [crear('strong', { texto: m.producto })]),
          crear('td', { texto: m.anulado ? `${TIPOS_MOVIMIENTO[m.tipo].nombre} (anulado)` : TIPOS_MOVIMIENTO[m.tipo].nombre }),
          crear('td', {
            clase: `derecha cantidad-mov ${m.cantidad > 0 ? 'entra' : 'sale'}`,
            texto: cantidadConSigno(m.cantidad, m.unidad),
          }),
          crear('td', { clase: 'derecha', texto: importe(m) }),
          crear('td', { clase: 'nota', texto: m.motivo ?? '', titulo: m.motivo ?? '' }),
          crear('td', { clase: 'acciones-fila' }, [
            m.anulado
              ? ''
              : crear('button', {
                  tipo: 'button',
                  clase: 'boton-texto',
                  texto: 'Anular',
                  alClick: () => anular(m),
                }),
          ]),
        ])
      )
    );

    const hayFiltro =
      filtroTipo.value !== 'todos' || buscador.value.trim() !== '' || productoFiltrado !== null;
    vacio.textContent = hayFiltro
      ? 'No hay movimientos que coincidan con el filtro.'
      : 'No hubo movimientos en este período.';
    vacio.hidden = movimientos.length > 0;
    contador.textContent =
      movimientos.length === 500
        ? 'Se muestran los últimos 500'
        : `${movimientos.length} ${movimientos.length === 1 ? 'renglón' : 'renglones'}`;
  }

  // ---------- Anular ----------
  async function anular(m) {
    const confirmado = await confirmar({
      titulo: 'Anular movimiento',
      mensaje: `¿Anular "${TIPOS_MOVIMIENTO[m.tipo].nombre}" de ${m.producto} (${cantidadConSigno(m.cantidad, m.unidad)}) del ${fechaCorta(m.fecha)}?`,
      detalle:
        'No se borra: queda tachado en la lista y deja de contar en el stock y en los totales.',
      boton: 'Anular',
    });
    if (!confirmado) return;

    const resultado = await pedir(window.api.anularMovimiento(m.id));
    if (resultado === null) return;

    mostrarMensaje('Movimiento anulado');
    refrescarAvisoReponer();
    cargar();
  }

  // ---------- Filtros ----------
  let esperaBusqueda;
  buscador.addEventListener('input', () => {
    clearTimeout(esperaBusqueda);
    esperaBusqueda = setTimeout(cargar, 200);
  });

  for (const campo of [desde, hasta, filtroTipo]) {
    campo.addEventListener('change', () => {
      // Si se borra una fecha, volvemos al período del mes
      if (!desde.value || !hasta.value) periodoPorDefecto();
      cargar();
    });
  }

  function mostrarFiltroProducto() {
    filtroProducto.hidden = productoFiltrado === null;
    buscador.hidden = productoFiltrado !== null;
    nombreFiltroProducto.textContent = productoFiltrado?.nombre ?? '';
  }

  btnQuitarProducto.addEventListener('click', () => {
    productoFiltrado = null;
    periodoPorDefecto(); // volvemos al mes actual
    mostrarFiltroProducto();
    cargar();
  });

  btnNuevo.addEventListener('click', () => abrirMovimiento({ grupo: 'todos', alGuardar: cargar }));

  // ---------- Lo que la vista ofrece a las demás ----------
  vistas.movimientos = {
    alMostrar: () => {
      mostrarFiltroProducto();
      cargar();
    },
    // Desde la ficha: solo los movimientos de ese producto, desde que se dio de alta
    filtrarPorProducto: (producto) => {
      productoFiltrado = { id: producto.id, nombre: producto.nombre };
      buscador.value = '';
      filtroTipo.value = 'todos';
      desde.value = producto.creado_en.slice(0, 10);
      hasta.value = hoyISO();
    },
  };
})();
