// ============================================================
// CONFIGURACIÓN Y RUTAS
// ============================================================

const STORAGE_KEY = "techsolveData";
const SESSION_KEY = "techsolveUsuario";
const MAX_TICKETS_ABIERTOS = 3;

// Páginas protegidas y qué roles pueden verlas
const PERMISOS_PAGINAS = {
	"solicitar-ticket.html": ["empleado"],
	"confirmacion.html": ["empleado"],
	"mis-tickets.html": ["empleado"],
	"historial.html": ["empleado"],
	"panel-tecnico.html": ["tecnico"],
	"tablero.html": ["gerente"]
};

function resolverUrlRelativa(path) {
	// Resuelve la ruta tomando como referencia la raíz del proyecto.
	const dentroDePages = window.location.pathname.includes("/pages/");
	return dentroDePages ? `../${path}` : path;
}

function paginaActual() {
	const partes = window.location.pathname.split("/");
	return partes[partes.length - 1] || "index.html";
}

// ============================================================
// LOCAL STORAGE
// ============================================================

function guardarDatosGlobales(datos) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
}

function guardarUsuarioActual(usuario) {
	localStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
}

function obtenerUsuarioActual() {
	const usuario = localStorage.getItem(SESSION_KEY);
	return usuario ? JSON.parse(usuario) : null;
}

function cerrarSesion() {
	localStorage.removeItem(SESSION_KEY);
	window.location.href = resolverUrlRelativa("pages/login.html");
}

async function obtenerDatosGlobales() {
	const ruta = resolverUrlRelativa("data/datos.json");
	const respuesta = await fetch(ruta);
	const datosIniciales = await respuesta.json();
	const datosGuardados = localStorage.getItem(STORAGE_KEY);

	if (!datosGuardados) {
		guardarDatosGlobales(datosIniciales);
		return datosIniciales;
	}

	const datosGuardadosParseados = JSON.parse(datosGuardados);

	return {
		...datosIniciales,
		...datosGuardadosParseados
	};
}

// ============================================================
// UTILIDADES DEL DOMINIO
// ============================================================

function buscarPorId(lista, id) {
	return lista.find(elemento => elemento.id === id);
}

function nombreUsuario(datos, id) {
	const usuario = buscarPorId(datos.usuarios, id);
	return usuario ? usuario.nombre : "Sin asignar";
}

function nombreCategoria(datos, id) {
	const categoria = buscarPorId(datos.categorias, id);
	return categoria ? categoria.nombre : "-";
}

function formatearFecha(fechaIso) {
	return new Date(fechaIso).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}

// Asigna la prioridad según las palabras clave del título (regla de negocio)
function calcularPrioridad(datos, titulo) {
	const texto = titulo.toLowerCase();
	const claves = datos.palabrasClavePrioridad;

	if (claves.Alta.some(palabra => texto.includes(palabra))) return "Alta";
	if (claves.Media.some(palabra => texto.includes(palabra))) return "Media";
	return "Baja";
}

function valorPrioridad(prioridad) {
	return { Alta: 3, Media: 2, Baja: 1 }[prioridad] || 0;
}

function esConfidencial(datos, ticket) {
	const texto = `${ticket.titulo} ${ticket.descripcion}`.toLowerCase();
	return datos.palabrasConfidenciales.some(palabra => texto.includes(palabra));
}

// Sólo el Gerente de TI puede ver la información confidencial
function textoVisible(datos, ticket, campo, usuario) {
	if (usuario.rol === "tecnico" && esConfidencial(datos, ticket)) {
		return "******** (información confidencial)";
	}
	return ticket[campo];
}

function crearElemento(etiqueta, texto, clase) {
	const elemento = document.createElement(etiqueta);
	if (texto !== undefined) elemento.textContent = texto;
	if (clase) elemento.className = clase;
	return elemento;
}

function crearParrafoDato(etiqueta, valor) {
	const p = document.createElement("p");
	const strong = crearElemento("strong", `${etiqueta}: `);
	p.append(strong, String(valor));
	return p;
}

function crearFilaTabla(celdas, esEncabezado) {
	const tr = document.createElement("tr");
	celdas.forEach(celda => {
		const td = document.createElement(esEncabezado ? "th" : "td");
		if (celda instanceof Node) {
			td.append(celda);
		} else {
			td.textContent = celda;
		}
		tr.append(td);
	});
	return tr;
}

function crearEtiquetaEstado(estado) {
	const clase = "estado estado-" + estado.toLowerCase().replaceAll(" ", "-");
	return crearElemento("span", estado, clase);
}

function crearEtiquetaPrioridad(prioridad) {
	return crearElemento("span", prioridad, "prioridad prioridad-" + prioridad.toLowerCase());
}

// ============================================================
// NAVEGACIÓN SEGÚN ROL
// ============================================================

function renderizarNavBar(usuario) {
	const elementos = document.querySelectorAll(".visitante, .empleado, .tecnico, .gerente");
	elementos.forEach(elemento => {
		elemento.style.display = "none";
	});

	const clase = usuario ? usuario.rol : "visitante";
	document.querySelectorAll(`.${clase}`).forEach(elemento => {
		elemento.style.display = "list-item";
	});

	const usuarioNav = document.querySelector("#usuario-conectado");
	if (usuarioNav) {
		usuarioNav.textContent = usuario ? `${usuario.nombre} (${usuario.rol})` : "";
	}

	const botonSalir = document.querySelector("#cerrar-sesion");
	if (botonSalir) {
		botonSalir.addEventListener("click", event => {
			event.preventDefault();
			cerrarSesion();
		});
	}

	// Modo oscuro forzado para los técnicos
	if (usuario && usuario.rol === "tecnico") {
		document.body.classList.add("modo-oscuro");
	}
}

// Redirige al login si la página requiere sesión o un rol distinto
function controlarAcceso(usuario) {
	const rolesPermitidos = PERMISOS_PAGINAS[paginaActual()];
	if (!rolesPermitidos) return true;

	if (!usuario) {
		window.location.href = resolverUrlRelativa("pages/login.html");
		return false;
	}

	if (!rolesPermitidos.includes(usuario.rol)) {
		window.location.href = resolverUrlRelativa("index.html");
		return false;
	}

	return true;
}

// ============================================================
// PÁGINA: INICIO
// ============================================================

const SERVICIOS_POR_ROL = {
	visitante: [
		{ titulo: "Iniciar sesión", descripcion: "Ingrese con su usuario corporativo para acceder al portal.", url: "pages/login.html" }
	],
	empleado: [
		{ titulo: "Solicitar un ticket", descripcion: "Solicite un ticket con la categoría y el problema a resolver.", url: "pages/solicitar-ticket.html" },
		{ titulo: "Consultar mis tickets", descripcion: "Visualice el estado de sus tickets activos y agregue comentarios.", url: "pages/mis-tickets.html" },
		{ titulo: "Historial de tickets", descripcion: "Consulte el historial de sus tickets ya cerrados.", url: "pages/historial.html" }
	],
	tecnico: [
		{ titulo: "Panel de tickets", descripcion: "Gestione los tickets entrantes ordenados por urgencia.", url: "pages/panel-tecnico.html" }
	],
	gerente: [
		{ titulo: "Tablero de control", descripcion: "Estadísticas, carga por técnico e incidentes críticos.", url: "pages/tablero.html" }
	]
};

async function renderizarPageHome(usuario) {
	const listaServicios = document.querySelector("#lista-servicios");
	if (!listaServicios) return;

	const datos = await obtenerDatosGlobales();

	const bienvenida = document.querySelector("#bienvenida");
	bienvenida.textContent = usuario
		? `Bienvenido/a, ${usuario.nombre}`
		: "Bienvenido/a al Portal de TechSolve";

	// Aviso de mantenimiento programado
	const aviso = document.querySelector("#aviso-mantenimiento");
	if (usuario && datos.avisoMantenimiento.activo) {
		aviso.append(crearElemento("h3", "Mantenimiento programado"));
		aviso.append(crearElemento("p", datos.avisoMantenimiento.mensaje));
		aviso.hidden = false;
	}

	// Notificaciones pendientes del empleado
	if (usuario && usuario.rol === "empleado") {
		renderizarNotificaciones(datos, usuario);
	}

	// Categorías de soporte
	const listaCategorias = document.querySelector("#lista-categorias");
	datos.categorias.forEach(categoria => {
		const li = document.createElement("li");
		li.append(crearElemento("strong", categoria.nombre + ": "), categoria.descripcion);
		listaCategorias.append(li);
	});

	// Servicios según el rol
	const servicios = SERVICIOS_POR_ROL[usuario ? usuario.rol : "visitante"];
	servicios.forEach(servicio => {
		const article = document.createElement("article");
		const link = crearElemento("a", servicio.titulo);
		link.href = servicio.url;
		const h3 = document.createElement("h3");
		h3.append(link);
		article.append(h3, crearElemento("p", servicio.descripcion));
		listaServicios.append(article);
	});
}

function renderizarNotificaciones(datos, usuario) {
	const contenedor = document.querySelector("#notificaciones");
	const pendientes = datos.notificaciones.filter(n => n.empleadoId === usuario.id && !n.leida);
	if (pendientes.length === 0) return;

	contenedor.append(crearElemento("h3", "Mensajes del soporte técnico"));

	pendientes.forEach(notificacion => {
		const p = document.createElement("p");
		p.append(
			crearElemento("strong", `Ticket #${notificacion.ticketId}: `),
			notificacion.mensaje + " "
		);

		const boton = crearElemento("button", "Marcar como leído");
		boton.type = "button";
		boton.addEventListener("click", () => {
			const original = buscarPorId(datos.notificaciones, notificacion.id);
			original.leida = true;
			guardarDatosGlobales(datos);
			p.remove();
			if (contenedor.querySelectorAll("p").length === 0) contenedor.hidden = true;
		});

		p.append(boton);
		contenedor.append(p);
	});

	contenedor.hidden = false;
}

// ============================================================
// PÁGINA: LOGIN
// ============================================================

async function renderizarPageLogin() {
	const formulario = document.querySelector("#form-login");
	if (!formulario) return;

	const datos = await obtenerDatosGlobales();
	const mensaje = document.querySelector("#mensaje-login");

	// Usuarios de prueba generados desde datos.json
	const listaDemo = document.querySelector("#usuarios-demo");
	datos.usuarios.forEach(usuario => {
		listaDemo.append(crearElemento("li", `${usuario.email} — ${usuario.rol}`));
	});

	formulario.addEventListener("submit", event => {
		event.preventDefault();

		const email = document.querySelector("#email").value.trim().toLowerCase();
		const password = document.querySelector("#password").value;

		const usuario = datos.usuarios.find(u => u.email === email && u.password === password);

		if (!usuario) {
			mensaje.textContent = "Usuario o contraseña incorrectos.";
			return;
		}

		// Se guarda el usuario sin la contraseña
		const { password: _, ...usuarioSinPassword } = usuario;
		guardarUsuarioActual(usuarioSinPassword);
		window.location.href = resolverUrlRelativa("index.html");
	});
}

// ============================================================
// PÁGINA: SOLICITAR TICKET (empleado)
// ============================================================

async function renderizarPageSolicitarTicket(usuario) {
	const formulario = document.querySelector("#form-ticket");
	if (!formulario) return;

	const datos = await obtenerDatosGlobales();

	document.querySelector("#nombre").value = usuario.nombre;

	const selectCategoria = document.querySelector("#categoria");
	datos.categorias.forEach(categoria => {
		const option = crearElemento("option", categoria.nombre);
		option.value = categoria.id;
		selectCategoria.append(option);
	});

	// Muestra la prioridad calculada mientras se escribe el título
	const inputTitulo = document.querySelector("#titulo");
	const prioridadCalculada = document.querySelector("#prioridad-calculada");
	inputTitulo.addEventListener("input", () => {
		prioridadCalculada.textContent = inputTitulo.value
			? calcularPrioridad(datos, inputTitulo.value)
			: "-";
	});

	const mensaje = document.querySelector("#mensaje-ticket");
	const abiertos = datos.tickets.filter(t => t.empleadoId === usuario.id && t.estado === "Abierto");

	if (abiertos.length >= MAX_TICKETS_ABIERTOS) {
		mensaje.textContent = `Ya tiene ${MAX_TICKETS_ABIERTOS} tickets abiertos. Debe resolver los tickets existentes antes de abrir uno nuevo.`;
		formulario.querySelector("[type=submit]").disabled = true;
	}

	formulario.addEventListener("submit", event => {
		event.preventDefault();

		const titulo = inputTitulo.value.trim();
		const descripcion = document.querySelector("#descripcion").value.trim();

		if (!titulo || !descripcion) {
			mensaje.textContent = "Complete el título y la descripción.";
			return;
		}

		const nuevoId = Math.max(...datos.tickets.map(t => t.id), 1000) + 1;

		const nuevoTicket = {
			id: nuevoId,
			empleadoId: usuario.id,
			tecnicoId: null,
			categoriaId: Number(selectCategoria.value),
			titulo: titulo,
			descripcion: descripcion,
			prioridad: calcularPrioridad(datos, titulo),
			estado: "Abierto",
			fecha: new Date().toISOString(),
			comentarios: []
		};

		datos.tickets.push(nuevoTicket);
		guardarDatosGlobales(datos);

		window.location.href = resolverUrlRelativa(`pages/confirmacion.html?id=${nuevoId}`);
	});
}

// ============================================================
// PÁGINA: CONFIRMACIÓN
// ============================================================

async function renderizarPageConfirmacion(usuario) {
	const contenedor = document.querySelector("#detalle-confirmacion");
	if (!contenedor) return;

	const datos = await obtenerDatosGlobales();
	const id = Number(new URLSearchParams(window.location.search).get("id"));
	const ticket = datos.tickets.find(t => t.id === id && t.empleadoId === usuario.id);

	if (!ticket) {
		contenedor.append(crearElemento("p", "No se encontró el ticket solicitado."));
		return;
	}

	contenedor.append(
		crearParrafoDato("Número de seguimiento", ticket.id),
		crearParrafoDato("Categoría", nombreCategoria(datos, ticket.categoriaId)),
		crearParrafoDato("Título", ticket.titulo),
		crearParrafoDato("Prioridad asignada", ticket.prioridad),
		crearParrafoDato("Estado", ticket.estado),
		crearParrafoDato("Fecha", formatearFecha(ticket.fecha))
	);
}

// ============================================================
// PÁGINA: MIS TICKETS (empleado)
// ============================================================

const ESTADOS_COMENTABLES = ["Abierto", "Asignado", "En Progreso"];

async function renderizarPageMisTickets(usuario) {
	const tabla = document.querySelector("#tabla-mis-tickets");
	if (!tabla) return;

	const datos = await obtenerDatosGlobales();

	const activos = datos.tickets
		.filter(t => t.empleadoId === usuario.id && t.estado !== "Cerrado")
		.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

	tabla.append(crearFilaTabla(["ID", "Categoría", "Título", "Prioridad", "Estado", "Técnico"], true));

	if (activos.length === 0) {
		document.querySelector("#sin-tickets").hidden = false;
		tabla.hidden = true;
		document.querySelector("#form-comentario").hidden = true;
		return;
	}

	activos.forEach(ticket => {
		tabla.append(crearFilaTabla([
			ticket.id,
			nombreCategoria(datos, ticket.categoriaId),
			ticket.titulo,
			crearEtiquetaPrioridad(ticket.prioridad),
			crearEtiquetaEstado(ticket.estado),
			nombreUsuario(datos, ticket.tecnicoId)
		]));
	});

	// Comentarios de cada ticket
	const listaComentarios = document.querySelector("#lista-comentarios");
	activos.forEach(ticket => {
		if (ticket.comentarios.length === 0) return;

		const article = document.createElement("article");
		article.append(crearElemento("h3", `Ticket #${ticket.id} — ${ticket.titulo}`));
		ticket.comentarios.forEach(comentario => {
			article.append(crearParrafoDato(
				`${nombreUsuario(datos, comentario.autorId)} (${formatearFecha(comentario.fecha)})`,
				comentario.texto
			));
		});
		listaComentarios.append(article);
	});

	// Formulario para agregar comentarios
	const selectTicket = document.querySelector("#ticket-comentario");
	activos
		.filter(t => ESTADOS_COMENTABLES.includes(t.estado))
		.forEach(ticket => {
			const option = crearElemento("option", `#${ticket.id} — ${ticket.titulo}`);
			option.value = ticket.id;
			selectTicket.append(option);
		});

	const formulario = document.querySelector("#form-comentario");
	formulario.addEventListener("submit", event => {
		event.preventDefault();

		const texto = document.querySelector("#comment").value.trim();
		if (!texto) return;

		const ticket = buscarPorId(datos.tickets, Number(selectTicket.value));
		ticket.comentarios.push({
			autorId: usuario.id,
			texto: texto,
			fecha: new Date().toISOString()
		});

		guardarDatosGlobales(datos);
		window.location.reload();
	});
}

// ============================================================
// PÁGINA: HISTORIAL (empleado)
// ============================================================

async function renderizarPageHistorial(usuario) {
	const lista = document.querySelector("#lista-historial");
	if (!lista) return;

	const datos = await obtenerDatosGlobales();

	const cerrados = datos.tickets
		.filter(t => t.empleadoId === usuario.id && t.estado === "Cerrado")
		.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

	if (cerrados.length === 0) {
		lista.append(crearElemento("p", "No se registran tickets para este usuario."));
		return;
	}

	cerrados.forEach(ticket => {
		const article = document.createElement("article");
		article.append(
			crearElemento("h3", `ID Ticket: ${ticket.id}`),
			crearParrafoDato("Categoría", nombreCategoria(datos, ticket.categoriaId)),
			crearParrafoDato("Título", ticket.titulo),
			crearParrafoDato("Descripción", ticket.descripcion),
			crearParrafoDato("Prioridad", ticket.prioridad),
			crearParrafoDato("Técnico", nombreUsuario(datos, ticket.tecnicoId)),
			crearParrafoDato("Fecha", formatearFecha(ticket.fecha)),
			crearParrafoDato("Estado actual", ticket.estado)
		);
		lista.append(article);
	});
}

// ============================================================
// PÁGINA: PANEL DEL TÉCNICO
// ============================================================

async function renderizarPagePanelTecnico(usuario) {
	const lista = document.querySelector("#lista-tickets-tecnico");
	if (!lista) return;

	const datos = await obtenerDatosGlobales();

	const filtro = document.querySelector("#filtro-panel");
	filtro.addEventListener("change", () => dibujarTicketsTecnico(datos, usuario, filtro.value));

	dibujarTicketsTecnico(datos, usuario, filtro.value);
}

function dibujarTicketsTecnico(datos, usuario, filtro) {
	const lista = document.querySelector("#lista-tickets-tecnico");
	lista.innerHTML = "";

	// Tickets entrantes ordenados por urgencia (mayor a menor)
	const tickets = datos.tickets
		.filter(t => t.estado !== "Cerrado")
		.filter(t => filtro === "todos" || t.tecnicoId === usuario.id || t.tecnicoId === null)
		.sort((a, b) => valorPrioridad(b.prioridad) - valorPrioridad(a.prioridad) || new Date(a.fecha) - new Date(b.fecha));

	if (tickets.length === 0) {
		lista.append(crearElemento("p", "No hay tickets activos."));
		return;
	}

	tickets.forEach(ticket => {
		const article = document.createElement("article");
		article.append(
			crearElemento("h3", `#${ticket.id} — ${textoVisible(datos, ticket, "titulo", usuario)}`),
			crearParrafoDato("Empleado", nombreUsuario(datos, ticket.empleadoId)),
			crearParrafoDato("Categoría", nombreCategoria(datos, ticket.categoriaId)),
			crearParrafoDato("Descripción", textoVisible(datos, ticket, "descripcion", usuario)),
			crearParrafoDato("Prioridad", ticket.prioridad),
			crearParrafoDato("Técnico asignado", nombreUsuario(datos, ticket.tecnicoId)),
			crearParrafoDato("Abierto el", formatearFecha(ticket.fecha))
		);

		ticket.comentarios.forEach(comentario => {
			article.append(crearParrafoDato(`Comentario de ${nombreUsuario(datos, comentario.autorId)}`, comentario.texto));
		});

		article.append(crearFormularioEstado(datos, ticket, usuario));
		article.append(crearFormularioNotificacion(datos, ticket));

		lista.append(article);
	});
}

function crearFormularioEstado(datos, ticket, usuario) {
	const form = document.createElement("form");
	form.className = "form-inline";

	const label = crearElemento("label", "Cambiar estado: ");
	const select = document.createElement("select");
	datos.estados
		.filter(estado => estado !== "Abierto")
		.forEach(estado => {
			const option = crearElemento("option", estado);
			option.value = estado;
			option.selected = estado === ticket.estado;
			select.append(option);
		});
	label.append(select);

	const boton = crearElemento("button", "Guardar");
	boton.type = "submit";

	form.append(label, boton);

	form.addEventListener("submit", event => {
		event.preventDefault();
		const original = buscarPorId(datos.tickets, ticket.id);
		original.estado = select.value;
		// Si nadie lo tenía, queda asignado al técnico que lo toma
		if (original.tecnicoId === null) original.tecnicoId = usuario.id;
		guardarDatosGlobales(datos);
		dibujarTicketsTecnico(datos, usuario, document.querySelector("#filtro-panel").value);
	});

	return form;
}

function crearFormularioNotificacion(datos, ticket) {
	const form = document.createElement("form");
	form.className = "form-inline";

	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Ej: Por favor reinicie su computadora";
	input.required = true;

	const boton = crearElemento("button", "Notificar al empleado");
	boton.type = "submit";

	const confirmacion = crearElemento("span", "", "mensaje-ok");

	form.append(input, boton, confirmacion);

	form.addEventListener("submit", event => {
		event.preventDefault();
		const nuevoId = Math.max(0, ...datos.notificaciones.map(n => n.id)) + 1;
		datos.notificaciones.push({
			id: nuevoId,
			empleadoId: ticket.empleadoId,
			ticketId: ticket.id,
			mensaje: input.value.trim(),
			fecha: new Date().toISOString(),
			leida: false
		});
		guardarDatosGlobales(datos);
		input.value = "";
		confirmacion.textContent = " Notificación enviada.";
	});

	return form;
}

// ============================================================
// PÁGINA: TABLERO DEL GERENTE
// ============================================================

async function renderizarPageTablero(usuario) {
	const resumen = document.querySelector("#resumen-tablero");
	if (!resumen) return;

	const datos = await obtenerDatosGlobales();
	const activos = datos.tickets.filter(t => t.estado !== "Cerrado");

	// Indicadores generales
	[
		["Tickets totales", datos.tickets.length],
		["Tickets activos", activos.length],
		["Tickets cerrados", datos.tickets.length - activos.length],
		["Sin asignar", activos.filter(t => t.tecnicoId === null).length]
	].forEach(([titulo, valor]) => {
		const article = document.createElement("article");
		article.className = "indicador";
		article.append(crearElemento("h3", titulo), crearElemento("p", valor, "numero"));
		resumen.append(article);
	});

	// Categorías ordenadas por frecuencia
	const tablaCategorias = document.querySelector("#tabla-categorias");
	tablaCategorias.append(crearFilaTabla(["Categoría", "Cantidad de tickets"], true));
	datos.categorias
		.map(categoria => ({
			nombre: categoria.nombre,
			cantidad: datos.tickets.filter(t => t.categoriaId === categoria.id).length
		}))
		.sort((a, b) => b.cantidad - a.cantidad)
		.forEach(fila => tablaCategorias.append(crearFilaTabla([fila.nombre, fila.cantidad])));

	// Carga de trabajo por técnico
	const tablaTecnicos = document.querySelector("#tabla-tecnicos");
	tablaTecnicos.append(crearFilaTabla(["Técnico", "Nivel", "Tickets activos"], true));
	datos.usuarios
		.filter(u => u.rol === "tecnico")
		.forEach(tecnico => {
			const cantidad = activos.filter(t => t.tecnicoId === tecnico.id).length;
			tablaTecnicos.append(crearFilaTabla([tecnico.nombre, tecnico.nivel, cantidad]));
		});

	// Incidentes críticos
	const criticos = document.querySelector("#lista-criticos");
	const altos = activos.filter(t => t.prioridad === "Alta");
	if (altos.length === 0) {
		criticos.append(crearElemento("p", "No hay incidentes críticos activos en este momento."));
	}
	altos.forEach(ticket => {
		const horas = Math.floor((Date.now() - new Date(ticket.fecha)) / 3600000);
		const article = document.createElement("article");
		article.append(
			crearElemento("h3", `#${ticket.id} — ${ticket.titulo}`),
			crearParrafoDato("Estado", ticket.estado),
			crearParrafoDato("Técnico asignado", nombreUsuario(datos, ticket.tecnicoId)),
			crearParrafoDato("Tiempo desde la apertura", `${horas} horas`)
		);
		criticos.append(article);
	});

	// Información confidencial (sólo visible para el gerente)
	const confidenciales = document.querySelector("#lista-confidenciales");
	const listaConf = datos.tickets.filter(t => esConfidencial(datos, t));
	if (listaConf.length === 0) {
		confidenciales.append(crearElemento("p", "No hay tickets con información confidencial."));
	}
	listaConf.forEach(ticket => {
		const article = document.createElement("article");
		article.append(
			crearElemento("h3", `#${ticket.id} — ${ticket.titulo}`),
			crearParrafoDato("Empleado", nombreUsuario(datos, ticket.empleadoId)),
			crearParrafoDato("Descripción", ticket.descripcion),
			crearParrafoDato("Estado", ticket.estado)
		);
		confidenciales.append(article);
	});

	// Restablecer los datos de prueba
	document.querySelector("#reiniciar-datos").addEventListener("click", () => {
		localStorage.removeItem(STORAGE_KEY);
		window.location.reload();
	});
}

// ============================================================
// INICIO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
	const usuario = obtenerUsuarioActual();

	if (!controlarAcceso(usuario)) return;

	renderizarNavBar(usuario);

	renderizarPageHome(usuario);
	renderizarPageLogin();

	if (!usuario) return;

	renderizarPageSolicitarTicket(usuario);
	renderizarPageConfirmacion(usuario);
	renderizarPageMisTickets(usuario);
	renderizarPageHistorial(usuario);
	renderizarPagePanelTecnico(usuario);
	renderizarPageTablero(usuario);
});
