// ui/vista-reportes.js — Ventas y ganancia, lo más vendido, lo parado y la lista de compras.

(() => {
  const desde = document.getElementById('rep-desde');
  const hasta = document.getElementById('rep-hasta');
  const atajos = document.querySelectorAll('[data-periodo]');
  const ranking = document.getElementById('rep-mas-vendidos');
  const tablaCategorias = document.getElementById('rep-categorias');
  const tablaParados = document.getElementById('rep-parados');
  const tablaCompras = document.getElementById('rep-compras');
  const totalCompras = document.getElementById('rep-compras-total');

  let listaDeCompras = []; // los productos de la lista, con la cantidad que se va a pedir

  // ---------- Período ----------
  // Fecha "AAAA-MM-DD" corrida X días desde hoy
  function diasDesdeHoy(dias) {
    const fecha = new Date();
    fecha.setHours(12, 0, 0, 0);
    fecha.setDate(fecha.getDate() + dias);
    const dos = (n) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  }

  function aplicarAtajo(clave) {
    const hoy = hoyISO();
    if (clave === 'mes') {
      desde.value = primerDiaDelMes();
      hasta.value = hoy;
    } else if (clave === 'mes-anterior') {
      const fecha = new Date(`${primerDiaDelMes()}T12:00:00`);
      fecha.setDate(0); // el día 0 de este mes = el último día del mes anterior
      const ultimo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      desde.value = `${ultimo.slice(0, 7)}-01`;
      hasta.value = ultimo;
    } else {
      // "7" o "30": los últimos N días contando hoy
      desde.value = diasDesdeHoy(-(Number(clave) - 1));
      hasta.value = hoy;
    }
    marcarAtajo(clave);
  }

  function marcarAtajo(clave) {
    for (const boton of atajos) boton.classList.toggle('activo', boton.dataset.periodo === clave);
  }

  // ---------- Cargar todo ----------
  async function cargar() {
    const datos = await pedir(window.api.obtenerReportes({ desde: desde.value, hasta: hasta.value }));
    if (datos === null) return;
    renderResumen(datos.resumen);
    renderRanking(datos.masVendidos);
    renderCategorias(datos.porCategoria);
    renderParados(datos.sinMovimiento);
    renderCompras(datos.listaDeCompras);
  }

  function renderResumen(r) {
    document.getElementById('rep-vendido').textContent = pesosRedondo(r.vendidoCentavos);
    document.getElementById('rep-costo').textContent = pesosRedondo(r.costoCentavos);
    document.getElementById('rep-ganancia').textContent = pesosRedondo(r.gananciaCentavos);
    document.getElementById('rep-ventas').textContent = r.renglones;
    const porcentaje = porcentajeGanancia(r.costoCentavos, r.vendidoCentavos);
    document.getElementById('rep-ganancia-detalle').textContent =
      porcentaje === null ? 'Ganancia' : `Ganancia (${textoPorcentaje(porcentaje)})`;
  }

  // Nombre de producto que abre su ficha
  function enlaceProducto(id, nombre) {
    return crear('button', {
      tipo: 'button',
      clase: 'enlace-producto',
      texto: nombre,
      titulo: 'Ver la ficha del producto',
      alClick: () => irAProducto(id),
    });
  }

  // Barra proporcional (el más grande = 100 %)
  function barra(valor, maximo) {
    const relleno = crear('span');
    relleno.style.width = `${maximo > 0 ? Math.max((valor / maximo) * 100, 1) : 0}%`;
    return crear('span', { clase: 'barra-reporte' }, [relleno]);
  }

  function renderRanking(lista) {
    const maximo = lista[0]?.vendidoCentavos ?? 0;
    ranking.replaceChildren(
      ...lista.map((p) =>
        crear('li', {}, [
          crear('div', { clase: 'ranking-fila' }, [
            enlaceProducto(p.id, p.nombre),
            crear('strong', { texto: pesosRedondo(p.vendidoCentavos) }),
          ]),
          barra(p.vendidoCentavos, maximo),
          crear('span', {
            clase: 'ranking-detalle',
            texto: `${cantidadConUnidad(p.cantidad, p.unidad)} · ganancia ${pesosRedondo(p.gananciaCentavos)}`,
          }),
        ])
      )
    );
    document.getElementById('rep-mas-vendidos-vacio').hidden = lista.length > 0;
  }

  function renderCategorias(lista) {
    const maximo = Math.max(0, ...lista.map((c) => c.vendidoCentavos));
    tablaCategorias.replaceChildren(
      ...lista.map((c) => {
        const porcentaje = porcentajeGanancia(c.costoCentavos, c.vendidoCentavos);
        return crear('tr', {}, [
          crear('td', {}, [crear('strong', { texto: c.categoria }), barra(c.vendidoCentavos, maximo)]),
          crear('td', { clase: 'derecha', texto: pesosRedondo(c.vendidoCentavos) }),
          crear('td', { clase: 'derecha', texto: pesosRedondo(c.gananciaCentavos) }),
          crear('td', { clase: 'derecha', texto: porcentaje === null ? '—' : textoPorcentaje(porcentaje) }),
        ]);
      })
    );
    document.getElementById('rep-categorias-vacio').hidden = lista.length > 0;
    tablaCategorias.closest('table').hidden = lista.length === 0;
  }

  function renderParados(lista) {
    tablaParados.replaceChildren(
      ...lista.map((p) =>
        crear('tr', {}, [
          crear('td', {}, [enlaceProducto(p.id, p.nombre)]),
          crear('td', { clase: 'derecha', texto: cantidadCorta(p.stock, p.unidad) }),
          crear('td', { texto: p.ultimaVenta ? fechaCorta(p.ultimaVenta) : 'Nunca se vendió' }),
          crear('td', { clase: 'derecha', texto: pesos(p.valorCentavos) }),
        ])
      )
    );
    const total = lista.reduce((suma, p) => suma + p.valorCentavos, 0);
    document.getElementById('rep-parado-total').textContent = lista.length
      ? `${pesosRedondo(total)} parados`
      : '';
    document.getElementById('rep-parados-vacio').hidden = lista.length > 0;
    tablaParados.closest('table').hidden = lista.length === 0;
  }

  // ---------- Lista de compras (editable) ----------
  function renderCompras(lista) {
    listaDeCompras = lista.map((p) => ({ ...p, pedir: p.sugerido ?? 0, incluir: p.sugerido !== null }));
    let categoriaAnterior = null;
    const filas = [];

    listaDeCompras.forEach((p) => {
      // Un renglón con el nombre de la categoría cada vez que cambia
      if (p.categoria !== categoriaAnterior) {
        filas.push(
          crear('tr', { clase: 'fila-categoria' }, [
            crear('td', { clase: 'no-imprimir' }),
            crear('td', { texto: p.categoria }),
            crear('td'), crear('td'), crear('td'), crear('td'),
          ])
        );
        categoriaAnterior = p.categoria;
      }

      const casilla = crear('input', { tipo: 'checkbox', titulo: 'Incluir en el pedido' });
      casilla.checked = p.incluir;
      const campo = crear('input', {
        tipo: 'text',
        clase: 'campo-pedir',
        valor: p.pedir ? cantidadATexto(p.pedir) : '',
      });
      campo.inputMode = 'decimal';
      campo.placeholder = p.sugerido === null ? 'Cargá cuánto' : '';
      const costo = crear('td', { clase: 'derecha' });
      const fila = crear('tr', { clase: p.incluir ? '' : 'excluida' });

      const actualizar = () => {
        const cantidad = parsearCantidad(campo.value, p.unidad);
        campo.classList.toggle('invalido', cantidad === null);
        p.pedir = cantidad ?? 0;
        p.incluir = casilla.checked && p.pedir > 0;
        fila.classList.toggle('excluida', !casilla.checked);
        costo.textContent = p.pedir && p.costoCentavos ? pesos(Math.round((p.pedir * p.costoCentavos) / 1000)) : '—';
        actualizarTotal();
      };
      campo.addEventListener('input', () => {
        if (campo.value.trim() !== '' && !casilla.checked) casilla.checked = true;
        actualizar();
      });
      casilla.addEventListener('change', actualizar);

      fila.append(
        crear('td', { clase: 'no-imprimir' }, [casilla]),
        crear('td', {}, [
          enlaceProducto(p.id, p.nombre),
          crear('span', { clase: `estado-compra ${p.estado === 'sin_stock' ? 'roja' : 'amarilla'}`, texto: p.estado === 'sin_stock' ? 'Sin stock' : 'Bajo' }),
        ]),
        crear('td', { clase: 'derecha', texto: cantidadCorta(p.stock, p.unidad) }),
        crear('td', { clase: 'derecha', texto: p.stockMinimo ? cantidadCorta(p.stockMinimo, p.unidad) : '—' }),
        crear('td', { clase: 'derecha celda-pedir' }, [campo, crear('span', { clase: 'unidad-pedir', texto: UNIDADES[p.unidad].corta })]),
        costo
      );
      filas.push(fila);
      actualizar();
    });

    tablaCompras.replaceChildren(...filas);
    document.getElementById('rep-compras-vacio').hidden = listaDeCompras.length > 0;
    tablaCompras.closest('table').hidden = listaDeCompras.length === 0;
    for (const id of ['btn-compras-copiar', 'btn-compras-whatsapp', 'btn-compras-imprimir']) {
      document.getElementById(id).disabled = listaDeCompras.length === 0;
    }
    actualizarTotal();
  }

  function actualizarTotal() {
    const total = listaDeCompras
      .filter((p) => p.incluir)
      .reduce((suma, p) => suma + Math.round((p.pedir * p.costoCentavos) / 1000), 0);
    totalCompras.textContent = pesos(total);
  }

  // El pedido como texto, agrupado por categoría (para WhatsApp o para pegar donde sea)
  function textoDelPedido() {
    const elegidos = listaDeCompras.filter((p) => p.incluir);
    if (elegidos.length === 0) return null;
    const renglones = [`Pedido de ${configuracion.nombre_negocio} — ${fechaCorta(hoyISO())}`];
    let categoria = null;
    for (const p of elegidos) {
      if (p.categoria !== categoria) {
        renglones.push('', p.categoria);
        categoria = p.categoria;
      }
      renglones.push(`• ${p.nombre}: ${cantidadConUnidad(p.pedir, p.unidad)}`);
    }
    return renglones.join('\n');
  }

  async function compartir(accion) {
    const texto = textoDelPedido();
    if (!texto) {
      mostrarMensaje('Elegí al menos un producto con cantidad para pedir', 'error');
      return;
    }
    if (accion === 'copiar') {
      if ((await pedir(window.api.copiarTexto(texto))) !== null) mostrarMensaje('Pedido copiado: pegalo donde quieras');
    } else {
      if ((await pedir(window.api.enviarPorWhatsApp(texto))) !== null) mostrarMensaje('Abriendo WhatsApp…');
    }
  }

  document.getElementById('btn-compras-copiar').addEventListener('click', () => compartir('copiar'));
  document.getElementById('btn-compras-whatsapp').addEventListener('click', () => compartir('whatsapp'));

  // Imprimir: con la clase "imprimiendo-lista" en el body, el CSS esconde todo lo demás
  document.getElementById('btn-compras-imprimir').addEventListener('click', () => {
    document.getElementById('compras-fecha').textContent =
      `${configuracion.nombre_negocio} · Pedido del ${fechaCorta(hoyISO())}`;
    document.body.classList.add('imprimiendo-lista');
    window.print();
    document.body.classList.remove('imprimiendo-lista');
  });

  // ---------- Filtros ----------
  for (const boton of atajos) {
    boton.addEventListener('click', () => {
      aplicarAtajo(boton.dataset.periodo);
      cargar();
    });
  }
  for (const campo of [desde, hasta]) {
    campo.addEventListener('change', () => {
      if (!desde.value || !hasta.value) aplicarAtajo('30');
      else marcarAtajo(null); // fechas a mano: ningún atajo marcado
      cargar();
    });
  }

  aplicarAtajo('30'); // por defecto, los últimos 30 días

  vistas.reportes = { alMostrar: cargar };
})();
