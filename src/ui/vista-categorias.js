// ui/vista-categorias.js — Categorías: crear, renombrar, desactivar y ver sus productos.

(() => {
  const tabla = document.getElementById('tabla-categorias');
  const vacio = document.getElementById('categorias-vacio');
  const casillaInactivas = document.getElementById('categorias-inactivas');
  const btnNueva = document.getElementById('btn-nueva-categoria');
  const dialogo = document.getElementById('dialogo-categoria');
  const form = document.getElementById('form-categoria');
  const titulo = document.getElementById('titulo-categoria');
  const error = document.getElementById('error-categoria');
  const btnCancelar = document.getElementById('btn-cancelar-categoria');

  let idEditando = null; // null = categoría nueva

  // ---------- Lista ----------
  async function cargar() {
    const categorias = await pedir(
      window.api.listarCategorias({ incluirInactivas: casillaInactivas.checked })
    );
    if (categorias === null) return;

    tabla.replaceChildren(
      ...categorias.map((categoria) =>
        crear('tr', { clase: categoria.activo ? '' : 'inactivo' }, [
          crear('td', {}, [crear('strong', { texto: categoria.nombre })]),
          crear('td', { clase: 'derecha', texto: categoria.cantidad_productos }),
          crear('td', {}, [
            crear('span', {
              clase: categoria.activo ? 'insignia verde' : 'insignia gris',
              texto: categoria.activo ? 'Activa' : 'Desactivada',
            }),
          ]),
          crear('td', { clase: 'acciones-fila' }, [
            crear('button', {
              tipo: 'button',
              clase: 'boton-texto',
              texto: 'Ver productos',
              alClick: () => irAProductosDeCategoria(categoria.id),
            }),
            crear('button', {
              tipo: 'button',
              clase: 'boton-texto',
              texto: 'Renombrar',
              alClick: () => abrirFormulario(categoria),
            }),
            crear('button', {
              tipo: 'button',
              clase: 'boton-texto',
              texto: categoria.activo ? 'Desactivar' : 'Activar',
              alClick: () => cambiarEstado(categoria),
            }),
          ]),
        ])
      )
    );

    vacio.hidden = categorias.length > 0;
  }

  // ---------- Formulario ----------
  function abrirFormulario(categoria) {
    idEditando = categoria ? categoria.id : null;
    titulo.textContent = categoria ? 'Renombrar categoría' : 'Nueva categoría';
    error.textContent = '';
    form.elements.nombre.value = categoria?.nombre ?? '';
    dialogo.showModal();
    form.elements.nombre.focus();
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    error.textContent = '';
    const datos = { nombre: form.elements.nombre.value };

    const esNueva = idEditando === null;
    const resultado = await pedir(
      esNueva ? window.api.crearCategoria(datos) : window.api.renombrarCategoria(idEditando, datos),
      error
    );
    if (resultado === null) return;

    dialogo.close();
    mostrarMensaje(esNueva ? 'Categoría creada' : 'Categoría renombrada');
    cargar();
  });

  btnCancelar.addEventListener('click', () => dialogo.close());
  btnNueva.addEventListener('click', () => abrirFormulario(null));
  casillaInactivas.addEventListener('change', cargar);

  // ---------- Activar / desactivar ----------
  async function cambiarEstado(categoria) {
    if (categoria.activo) {
      const n = categoria.cantidad_productos;
      const confirmado = await confirmar({
        titulo: 'Desactivar categoría',
        mensaje: `¿Desactivar la categoría "${categoria.nombre}"?`,
        detalle:
          n > 0
            ? `${n} producto${n === 1 ? ' la tiene' : 's la tienen'} y la van a conservar, pero no se podrá elegir para productos nuevos.`
            : 'No se podrá elegir para productos nuevos. Podés volver a activarla cuando quieras.',
        boton: 'Desactivar',
      });
      if (!confirmado) return;
    }

    const resultado = await pedir(
      window.api.cambiarEstadoCategoria(categoria.id, !categoria.activo)
    );
    if (resultado === null) return;

    mostrarMensaje(categoria.activo ? 'Categoría desactivada' : 'Categoría activada');
    cargar();
  }

  vistas.categorias = { alMostrar: cargar };
})();
