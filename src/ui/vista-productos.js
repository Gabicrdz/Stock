// ui/vista-productos.js — Productos: tarjetas, lista con filtros, ficha y formulario.
// Todo va dentro de (() => { ... })() para que sus variables no choquen con otras vistas.

(() => {
  // ---------- Elementos: lista y ficha ----------
  const buscador = document.getElementById('buscador-productos');
  const filtroCategoria = document.getElementById('filtro-categoria');
  const filtroEstado = document.getElementById('filtro-estado-stock');
  const filtroMostrar = document.getElementById('filtro-mostrar-productos');
  const contador = document.getElementById('contador-productos');
  const tabla = document.getElementById('tabla-productos');
  const vacio = document.getElementById('productos-vacio');
  const detalle = document.getElementById('detalle-producto');
  const btnNuevo = document.getElementById('btn-nuevo-producto');
  const tarjetasFiltro = document.querySelectorAll('[data-filtro-estado]');

  // ---------- Elementos: formulario ----------
  const dialogo = document.getElementById('dialogo-producto');
  const form = document.getElementById('form-producto');
  const titulo = document.getElementById('titulo-producto');
  const error = document.getElementById('error-producto');
  const btnCancelar = document.getElementById('btn-cancelar-producto');
  const selectCategoria = document.getElementById('producto-categoria');
  const campoStockInicial = document.getElementById('campo-stock-inicial');

  const NOMBRES_UNIDAD = { unidad: 'Unidad', kg: 'Kilo', litro: 'Litro' };

  let idSeleccionado = null; // producto cuya ficha se ve a la derecha
  let idEditando = null;     // null = producto nuevo
  let productosVisibles = []; // lo que muestra la tabla ahora

  // ---------- Filtro de categorías ----------
  async function cargarCategoriasFiltro() {
    const categorias = await pedir(window.api.listarCategorias({ incluirInactivas: true }));
    if (categorias === null) return;
    const elegida = filtroCategoria.value;
    filtroCategoria.replaceChildren(
      crear('option', { valor: '', texto: 'Todas las categorías' }),
      ...categorias.map((c) =>
        crear('option', { valor: c.id, texto: c.activo ? c.nombre : `${c.nombre} (desactivada)` })
      )
    );
    // Si la categoría elegida ya no existe en la lista, vuelve a "Todas"
    filtroCategoria.value = categorias.some((c) => String(c.id) === elegida) ? elegida : '';
  }

  // ---------- Lista ----------
  async function cargar() {
    // Pedimos la lista y el resumen AL MISMO TIEMPO
    const [productos, resumen] = await Promise.all([
      pedir(
        window.api.listarProductos({
          busqueda: buscador.value,
          categoriaId: filtroCategoria.value ? Number(filtroCategoria.value) : null,
          estado: filtroEstado.value,
          mostrar: filtroMostrar.value,
        })
      ),
      pedir(window.api.resumenStock()),
    ]);
    if (productos === null || resumen === null) return;

    productosVisibles = productos;
    renderResumen(resumen);
    renderTabla(productos);

    if (idSeleccionado !== null) mostrarDetalle(idSeleccionado);
    else renderDetalleVacio();
  }

  function renderResumen(resumen) {
    document.getElementById('res-activos').textContent = resumen.activos;
    document.getElementById('res-bajo').textContent = resumen.bajo;
    document.getElementById('res-sin-stock').textContent = resumen.sinStock;
    document.getElementById('res-valor').textContent = pesosRedondo(resumen.valorInventarioCentavos);
    actualizarAvisoReponer(resumen);

    // Los números de alerta se pintan solo si hay algo que avisar
    document.querySelector('.indicador.bajo').classList.toggle('hay', resumen.bajo > 0);
    document.querySelector('.indicador.sin').classList.toggle('hay', resumen.sinStock > 0);

    // Marca el indicador del filtro que está aplicado
    for (const tarjeta of tarjetasFiltro) {
      tarjeta.classList.toggle('activa', tarjeta.dataset.filtroEstado === filtroEstado.value);
    }
  }

  // Precio con su unidad: "$ 16.000,00 /kg"
  function textoPrecio(producto) {
    return producto.unidad === 'unidad'
      ? pesos(producto.precio_centavos)
      : `${pesos(producto.precio_centavos)} /${UNIDADES[producto.unidad].corta}`;
  }

  function renderTabla(productos) {
    tabla.replaceChildren(
      ...productos.map((producto) => {
        const clases = [];
        if (producto.id === idSeleccionado) clases.push('seleccionada');
        if (!producto.activo) clases.push('inactivo');
        const estado = ESTADOS_STOCK[producto.estado_stock];

        const fila = crear('tr', { clase: clases.join(' ') }, [
          // Nombre arriba; código y categoría abajo, en gris
          crear('td', { clase: 'celda-producto' }, [
            crear('strong', { texto: producto.nombre }),
            crear('span', {
              clase: 'codigo',
              texto: [producto.codigo, producto.categoria].filter(Boolean).join('  ·  ') || 'Sin código',
            }),
          ]),
          crear('td', { clase: 'derecha' }, [
            crear('span', { clase: 'celda-stock' }, [
              crear('span', {
                clase: `cantidad ${producto.activo ? estado.clase : ''}`,
                texto: cantidadCorta(producto.stock, producto.unidad),
              }),
              nivelStock(producto),
            ]),
          ]),
          crear('td', {
            clase: 'derecha',
            texto: producto.stock_minimo ? cantidadCorta(producto.stock_minimo, producto.unidad) : '—',
          }),
          crear('td', { clase: 'derecha', texto: textoPrecio(producto) }),
          crear('td', {}, [
            producto.activo
              ? insigniaStock(producto.estado_stock, true)
              : crear('span', { clase: 'insignia gris', texto: 'De baja' }),
          ]),
        ]);
        fila.dataset.id = producto.id;
        fila.addEventListener('click', () => seleccionar(producto.id));

        // También con teclado: Tab para llegar a la fila, Enter o Espacio para abrirla
        fila.tabIndex = 0;
        fila.addEventListener('keydown', (evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            seleccionar(producto.id);
          }
        });
        return fila;
      })
    );

    const hayFiltro =
      buscador.value.trim() !== '' || filtroCategoria.value !== '' || filtroEstado.value !== 'todos';
    vacio.textContent = hayFiltro
      ? 'No hay productos que coincidan con el filtro.'
      : 'Todavía no hay productos. Cargá el primero con "Nuevo producto".';
    vacio.hidden = productos.length > 0;
    contador.textContent = `${productos.length} producto${productos.length === 1 ? '' : 's'}`;
  }

  function seleccionar(id) {
    idSeleccionado = id;
    for (const fila of tabla.rows) {
      fila.classList.toggle('seleccionada', Number(fila.dataset.id) === id);
    }
    mostrarDetalle(id);
  }

  // ---------- Ficha del producto ----------
  function renderDetalleVacio() {
    detalle.replaceChildren(
      crear('p', { clase: 'vacio', texto: 'Elegí un producto de la lista para ver su ficha.' })
    );
  }

  // Frase que explica el stock: "Llegó al mínimo (6 unidades). Conviene reponer."
  function textoExistencia(producto) {
    const minimo = cantidadConUnidad(producto.stock_minimo, producto.unidad);
    if (producto.estado_stock === 'sin_stock') return 'No queda stock. Hay que reponer.';
    if (producto.estado_stock === 'bajo') return `Llegó al mínimo (${minimo}). Conviene reponer.`;
    return producto.stock_minimo ? `El mínimo es ${minimo}` : 'No tiene stock mínimo cargado';
  }

  // Últimos movimientos del producto, con el saldo después de cada uno
  function renderHistorial(producto, historial) {
    if (historial.length === 0) {
      return crear('p', { clase: 'texto-tenue', texto: 'Todavía no tiene movimientos.' });
    }
    return crear(
      'ul',
      { clase: 'historial' },
      historial.map((m) =>
        crear('li', { clase: m.anulado ? 'anulado' : '' }, [
          crear('span', { clase: 'historial-tipo' }, [
            crear('strong', { texto: TIPOS_MOVIMIENTO[m.tipo].nombre }),
            crear('span', { texto: m.anulado ? `${fechaCorta(m.fecha)} · anulado` : fechaCorta(m.fecha) }),
          ]),
          crear('span', {
            clase: `historial-cantidad ${m.cantidad > 0 ? 'entra' : 'sale'}`,
            texto: cantidadConSigno(m.cantidad, producto.unidad),
          }),
          crear('span', {
            clase: 'historial-saldo',
            titulo: 'Stock después de este movimiento',
            texto: m.anulado ? '' : numeroCantidad(m.saldo),
          }),
        ])
      )
    );
  }

  async function mostrarDetalle(id) {
    // Pedimos el producto y sus movimientos AL MISMO TIEMPO
    const [producto, historial] = await Promise.all([
      pedir(window.api.obtenerProducto(id)),
      pedir(window.api.historialDeProducto(id, 6)),
    ]);
    if (producto === null || historial === null) {
      idSeleccionado = null;
      renderDetalleVacio();
      return;
    }

    const estado = ESTADOS_STOCK[producto.estado_stock];
    const ganancia = porcentajeGanancia(producto.costo_centavos, producto.precio_centavos);
    const unidad = UNIDADES[producto.unidad];

    // Cada dato es un renglón: <div><dt>etiqueta</dt><dd>valor</dd></div>
    const dato = (etiqueta, valor, clase = '') =>
      crear('div', {}, [crear('dt', { texto: etiqueta }), crear('dd', { clase, texto: valor || '—' })]);

    detalle.replaceChildren(
      crear('div', { clase: 'detalle-cabecera' }, [
        crear('h2', { texto: producto.nombre }),
        crear('p', {
          clase: 'subtitulo',
          texto: [producto.codigo ? `Código ${producto.codigo}` : 'Sin código', producto.categoria]
            .filter(Boolean)
            .join(' · '),
        }),
      ]),

      // Cuánto queda: el número protagonista, con su barrita de nivel
      crear('div', { clase: `existencia ${producto.activo ? estado.clase : 'gris'}` }, [
        crear('div', { clase: 'existencia-numero' }, [
          crear('span', { clase: 'numero-stock', texto: numeroCantidad(producto.stock) }),
          crear('span', {
            clase: 'unidad-stock',
            texto: producto.stock === 1000 ? unidad.singular : unidad.plural,
          }),
        ]),
        nivelStock(producto),
        producto.activo
          ? insigniaStock(producto.estado_stock)
          : crear('span', { clase: 'insignia gris', texto: 'Dado de baja' }),
        crear('p', { clase: 'existencia-texto', texto: textoExistencia(producto) }),
      ]),

      // Mover stock: lo que más se usa en el día a día
      producto.activo
        ? crear('div', { clase: 'botones-movimiento' }, [
            crear('button', {
              tipo: 'button',
              clase: 'boton boton-primario',
              texto: 'Entrada',
              titulo: 'Compra o devolución',
              alClick: () => abrirMovimiento({ producto, grupo: 'entrada', alGuardar: cargar }),
            }),
            crear('button', {
              tipo: 'button',
              clase: 'boton boton-secundario',
              texto: 'Salida',
              titulo: 'Venta o merma',
              alClick: () => abrirMovimiento({ producto, grupo: 'salida', alGuardar: cargar }),
            }),
            crear('button', {
              tipo: 'button',
              clase: 'boton boton-secundario',
              texto: 'Contar',
              titulo: 'Ajustar el stock a lo que hay en el estante',
              alClick: () => abrirMovimiento({ producto, grupo: 'ajuste', alGuardar: cargar }),
            }),
          ])
        : crear('p', { clase: 'texto-tenue', texto: 'Para moverle stock, primero reactivalo.' }),

      crear('section', { clase: 'seccion-ficha' }, [
        crear('div', { clase: 'seccion-ficha-titulo' }, [
          crear('h3', { texto: 'Últimos movimientos' }),
          crear('button', {
            tipo: 'button',
            clase: 'boton-texto',
            texto: 'Ver todos',
            alClick: () => irAMovimientosDeProducto(producto),
          }),
        ]),
        renderHistorial(producto, historial),
      ]),

      crear('dl', { clase: 'lista-datos' }, [
        dato('Se vende por', NOMBRES_UNIDAD[producto.unidad]),
        dato('Costo', producto.costo_centavos ? pesos(producto.costo_centavos) : ''),
        dato('Precio', textoPrecio(producto), 'resaltado'),
        dato(
          'Ganancia',
          ganancia === null
            ? ''
            : `${pesos(producto.precio_centavos - producto.costo_centavos)} (${textoPorcentaje(ganancia)})`
        ),
        dato(
          'Valor en stock',
          producto.stock > 0 && producto.costo_centavos
            ? pesos(Math.round((producto.stock * producto.costo_centavos) / 1000))
            : ''
        ),
        dato('Alta', fechaCorta(producto.creado_en)),
      ]),

      crear('div', { clase: 'acciones' }, [
        crear('button', {
          tipo: 'button',
          clase: 'boton boton-secundario',
          texto: 'Editar',
          alClick: () => abrirFormulario(producto),
        }),
        crear('button', {
          tipo: 'button',
          clase: producto.activo ? 'boton boton-peligro' : 'boton boton-secundario',
          texto: producto.activo ? 'Dar de baja' : 'Reactivar',
          alClick: () => cambiarEstado(producto),
        }),
      ])
    );
  }

  // ---------- Formulario ----------
  // Categorías activas + la del producto (aunque esté desactivada)
  async function cargarCategoriasFormulario(categoriaActualId) {
    const categorias = await pedir(window.api.listarCategorias({ incluirInactivas: true }));
    if (categorias === null) return false;
    selectCategoria.replaceChildren(
      crear('option', { valor: '', texto: 'Sin categoría' }),
      ...categorias
        .filter((c) => c.activo || c.id === categoriaActualId)
        .map((c) => crear('option', { valor: c.id, texto: c.nombre }))
    );
    return true;
  }

  // Las etiquetas dicen en qué se mide: "Precio de venta ($ por kg)", "Stock mínimo (kg)"
  function actualizarEtiquetas() {
    const unidad = form.elements.unidad.value;
    const plural = UNIDADES[unidad].plural;
    for (const etiqueta of form.querySelectorAll('[data-etiqueta-unidad]')) {
      const base = etiqueta.dataset.etiquetaUnidad;
      const esPlata = base === 'Costo' || base === 'Precio de venta';
      if (esPlata) {
        etiqueta.textContent = unidad === 'unidad' ? `${base} ($)` : `${base} ($ por ${UNIDADES[unidad].singular})`;
      } else {
        etiqueta.textContent = `${base} (${plural})`;
      }
    }
  }

  async function abrirFormulario(producto) {
    idEditando = producto ? producto.id : null;
    if (!(await cargarCategoriasFormulario(producto?.categoria_id ?? null))) return;

    titulo.textContent = producto ? 'Editar producto' : 'Nuevo producto';
    error.textContent = '';

    form.elements.nombre.value = producto?.nombre ?? '';
    form.elements.codigo.value = producto?.codigo ?? '';
    form.elements.categoriaId.value = producto?.categoria_id ?? '';
    form.elements.unidad.value = producto?.unidad ?? 'unidad';
    form.elements.costo.value = producto?.costo_centavos ? centavosATexto(producto.costo_centavos) : '';
    form.elements.precio.value = producto ? centavosATexto(producto.precio_centavos) : '';
    form.elements.minimo.value = producto?.stock_minimo ? cantidadATexto(producto.stock_minimo) : '';
    form.elements.inicial.value = '';
    recalcularGanancia();
    actualizarEtiquetas();

    // El stock inicial solo se carga al crear. Después, el stock cambia con movimientos.
    campoStockInicial.hidden = producto !== undefined && producto !== null;

    dialogo.showModal();
    form.elements.nombre.focus();
  }

  // Costo + % de ganancia → precio de venta (redondeado a pesos enteros)
  function recalcularPrecio() {
    const costo = parsearImporte(form.elements.costo.value);
    const porcentaje = leerNumero(form.elements.ganancia.value);
    if (!costo || porcentaje === null) return;
    const precio = Math.round((costo * (1 + porcentaje / 100)) / 100) * 100;
    form.elements.precio.value = centavosATexto(precio);
  }

  // Costo + precio → % de ganancia
  function recalcularGanancia() {
    const costo = parsearImporte(form.elements.costo.value);
    const precio = parsearImporte(form.elements.precio.value);
    const porcentaje = costo && precio !== null ? porcentajeGanancia(costo, precio) : null;
    form.elements.ganancia.value =
      porcentaje === null ? '' : formatoPorcentaje.format(porcentaje).replace(/\./g, '');
  }

  form.elements.costo.addEventListener('input', () => {
    if (form.elements.ganancia.value.trim()) recalcularPrecio();
    else recalcularGanancia();
  });
  form.elements.ganancia.addEventListener('input', recalcularPrecio);
  form.elements.precio.addEventListener('input', recalcularGanancia);
  form.elements.unidad.addEventListener('change', actualizarEtiquetas);
  form.addEventListener('input', () => (error.textContent = '')); // al corregir, se va el error

  // El lector de código de barras "escribe" el código y aprieta Enter.
  // En el campo código, Enter pasa al siguiente campo en lugar de guardar.
  form.elements.codigo.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      form.elements.categoriaId.focus();
    }
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    error.textContent = '';
    const unidad = form.elements.unidad.value;

    const costoCentavos = parsearImporte(form.elements.costo.value || '0');
    const precioCentavos = parsearImporte(form.elements.precio.value);
    const stockMinimo = parsearCantidad(form.elements.minimo.value, unidad);
    const stockInicial = parsearCantidad(form.elements.inicial.value, unidad);

    // Revisamos acá lo que se puede revisar sin preguntarle al main
    const ejemplo = unidad === 'unidad' ? 'sin decimales, por ejemplo 12' : 'por ejemplo 1,250';
    let problema = null;
    if (costoCentavos === null) problema = 'Ingresá un costo válido, por ejemplo 1000 o 1.000,50';
    else if (precioCentavos === null) problema = 'Ingresá un precio de venta válido';
    else if (stockMinimo === null) problema = `Stock mínimo inválido (${ejemplo})`;
    else if (stockInicial === null) problema = `Stock inicial inválido (${ejemplo})`;
    if (problema) {
      error.textContent = problema;
      return;
    }

    const datos = {
      nombre: form.elements.nombre.value,
      codigo: form.elements.codigo.value,
      categoriaId: form.elements.categoriaId.value ? Number(form.elements.categoriaId.value) : null,
      unidad,
      costoCentavos,
      precioCentavos,
      stockMinimo,
      stockInicial,
    };

    const esNuevo = idEditando === null;
    const resultado = await pedir(
      esNuevo ? window.api.crearProducto(datos) : window.api.actualizarProducto(idEditando, datos),
      error
    );
    if (resultado === null) return;

    dialogo.close();
    mostrarMensaje(esNuevo ? 'Producto creado' : 'Producto actualizado');
    if (esNuevo) idSeleccionado = resultado.id;
    cargar();
  });

  btnCancelar.addEventListener('click', () => dialogo.close());
  btnNuevo.addEventListener('click', () => abrirFormulario(null));

  // ---------- Baja / reactivar ----------
  async function cambiarEstado(producto) {
    if (producto.activo) {
      const confirmado = await confirmar({
        titulo: 'Dar de baja',
        mensaje: `¿Dar de baja "${producto.nombre}"?`,
        detalle:
          'No se borra: deja de aparecer en la lista y en las alertas, pero se guarda su historia. ' +
          'Podés reactivarlo cuando quieras.',
        boton: 'Dar de baja',
      });
      if (!confirmado) return;
    }

    const resultado = await pedir(window.api.cambiarEstadoProducto(producto.id, !producto.activo));
    if (resultado === null) return;

    mostrarMensaje(producto.activo ? 'Producto dado de baja' : 'Producto reactivado');
    cargar();
  }

  // ---------- Filtros ----------
  // La búsqueda espera a que dejes de escribir (200 ms) para no consultar en cada letra
  let esperaBusqueda;
  buscador.addEventListener('input', () => {
    clearTimeout(esperaBusqueda);
    esperaBusqueda = setTimeout(cargar, 200);
  });

  // Enter en el buscador (o el lector de código de barras): si hay un solo resultado,
  // o uno con ese código exacto, abre su ficha.
  buscador.addEventListener('keydown', async (evento) => {
    if (evento.key !== 'Enter') return;
    clearTimeout(esperaBusqueda);
    await cargar();
    const texto = buscador.value.trim().toLowerCase();
    const exacto = productosVisibles.find((p) => p.codigo && p.codigo.toLowerCase() === texto);
    const elegido = exacto ?? (productosVisibles.length === 1 ? productosVisibles[0] : null);
    if (elegido) seleccionar(elegido.id);
  });

  for (const select of [filtroCategoria, filtroEstado, filtroMostrar]) {
    select.addEventListener('change', cargar);
  }

  // Las tarjetas también filtran: "Stock bajo" muestra solo esos
  for (const tarjeta of tarjetasFiltro) {
    tarjeta.addEventListener('click', () => {
      filtroEstado.value = tarjeta.dataset.filtroEstado;
      cargar();
    });
  }

  // ---------- Lo que la vista ofrece a las demás ----------
  vistas.productos = {
    alMostrar: async () => {
      await cargarCategoriasFiltro();
      cargar();
    },
    // Abre la ficha de un producto, sacando los filtros para que se vea en la lista
    mostrarProducto: (id) => {
      idSeleccionado = id;
      buscador.value = '';
      filtroCategoria.value = '';
      filtroEstado.value = 'todos';
      filtroMostrar.value = 'activos';
    },
    filtrarPorCategoria: (categoriaId) => {
      // La lista de categorías se recarga al mostrar la vista; dejamos anotado cuál elegir
      filtroCategoria.replaceChildren(crear('option', { valor: categoriaId, texto: '' }));
      filtroCategoria.value = String(categoriaId);
      filtroEstado.value = 'todos';
      buscador.value = '';
    },
  };
})();
