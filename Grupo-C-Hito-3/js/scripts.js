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


// Tarjeta de ticket reutilizada en historial, panel del técnico y tablero
function crearTarjetaTicket(datos, ticket, usuario, campos) {
	const article = document.createElement("article");
	article.className = "ticket ticket-" + ticket.prioridad.toLowerCase();

	const encabezado = crearElemento("div", undefined, "ticket-encabezado");
	const titulo = textoVisible(datos, ticket, "titulo", usuario);
	const h3 = crearElemento("h3", `#${ticket.id} · ${titulo}`);
	if (titulo !== ticket.titulo) h3.classList.add("confidencial");

	const insignias = crearElemento("div", undefined, "ticket-insignias");
	insignias.append(crearEtiquetaPrioridad(ticket.prioridad), crearEtiquetaEstado(ticket.estado));
	encabezado.append(h3, insignias);

	const cuerpo = crearElemento("div", undefined, "ticket-datos");
	campos.forEach(([etiqueta, valor]) => cuerpo.append(crearParrafoDato(etiqueta, valor)));

	article.append(encabezado, cuerpo);
	return article;
}

function crearComentario(datos, comentario) {
	const div = crearElemento("div", undefined, "comentario");
	div.append(
		crearElemento("small", `${nombreUsuario(datos, comentario.autorId)} · ${formatearFecha(comentario.fecha)}`),
		comentario.texto
	);
	return div;
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

	// Marca el link de la página actual
	document.querySelectorAll("nav a").forEach(link => {
		if (link.getAttribute("href").endsWith(paginaActual())) {
			link.classList.add("activo");
		}
	});

	const usuarioNav = document.querySelector("#usuario-conectado");
	if (usuarioNav && usuario) {
		const roles = { empleado: "Empleado", tecnico: "Técnico", gerente: "Gerente de TI" };
		usuarioNav.textContent = `${usuario.nombre} · ${roles[usuario.rol]}`;
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
		{ titulo: "Iniciar sesión", descripcion: "Ingresá con tu usuario corporativo para acceder al portal.", url: "pages/login.html" }
	],
	empleado: [
		{ titulo: "Nuevo ticket", descripcion: "Reportá un problema eligiendo la categoría y describiendo la falla.", url: "pages/solicitar-ticket.html" },
		{ titulo: "Mis tickets", descripcion: "Seguí el estado de tus tickets activos y agregá comentarios.", url: "pages/mis-tickets.html" },
		{ titulo: "Historial", descripcion: "Consultá tus tickets ya cerrados.", url: "pages/historial.html" }
	],
	tecnico: [
		{ titulo: "Panel de tickets", descripcion: "Tickets entrantes por urgencia, cambio de estado, avisos y equipos homologados.", url: "pages/panel-tecnico.html" }
	],
	gerente: [
		{ titulo: "Tablero de control", descripcion: "Estadísticas, carga por técnico, incidentes críticos e información confidencial.", url: "pages/tablero.html" }
	]
};

async function renderizarPageHome(usuario) {
	const listaServicios = document.querySelector("#lista-servicios");
	if (!listaServicios) return;

	const datos = await obtenerDatosGlobales();

	document.querySelector("#bienvenida").textContent = usuario
		? `Hola, ${usuario.nombre.split(" ")[0]}`
		: "Bienvenido/a a TechSolve";

	// Aviso de mantenimiento programado
	const aviso = document.querySelector("#aviso-mantenimiento");
	if (usuario && datos.avisoMantenimiento.activo) {
		aviso.append(
			crearElemento("h3", "⚠ Mantenimiento programado"),
			crearElemento("p", datos.avisoMantenimiento.mensaje)
		);
		aviso.hidden = false;
	}

	// Notificaciones pendientes del empleado
	if (usuario && usuario.rol === "empleado") {
		renderizarNotificaciones(datos, usuario);
	}

	// Servicios según el rol
	const servicios = SERVICIOS_POR_ROL[usuario ? usuario.rol : "visitante"];
	servicios.forEach(servicio => {
		const link = crearElemento("a", undefined, "tarjeta tarjeta-link");
		link.href = servicio.url;
		link.append(crearElemento("h3", servicio.titulo + " →"), crearElemento("p", servicio.descripcion));
		listaServicios.append(link);
	});

	// Categorías de soporte
	const listaCategorias = document.querySelector("#lista-categorias");
	datos.categorias.forEach(categoria => {
		const li = document.createElement("li");
		li.append(crearElemento("strong", categoria.nombre), categoria.descripcion);
		listaCategorias.append(li);
	});
}

function renderizarNotificaciones(datos, usuario) {
	const contenedor = document.querySelector("#notificaciones");
	const pendientes = datos.notificaciones.filter(n => n.empleadoId === usuario.id && !n.leida);
	if (pendientes.length === 0) return;

	contenedor.append(crearElemento("h3", "Mensajes del soporte técnico"));

	pendientes.forEach(notificacion => {
		const item = crearElemento("div", undefined, "notificacion-item");
		const texto = document.createElement("p");
		texto.append(crearElemento("strong", `Ticket #${notificacion.ticketId}: `), notificacion.mensaje);

		const boton = crearElemento("button", "Marcar como leído", "boton boton-secundario boton-chico");
		boton.type = "button";
		boton.addEventListener("click", () => {
			buscarPorId(datos.notificaciones, notificacion.id).leida = true;
			guardarDatosGlobales(datos);
			item.remove();
			if (!contenedor.querySelector(".notificacion-item")) contenedor.hidden = true;
		});

		item.append(texto, boton);
		contenedor.append(item);
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
	const inputEmail = document.querySelector("#email");
	const inputPassword = document.querySelector("#password");

	// Usuarios de prueba generados desde datos.json
	const listaDemo = document.querySelector("#usuarios-demo");
	datos.usuarios.forEach(usuario => {
		const boton = crearElemento("button", undefined, "boton");
		boton.type = "button";
		boton.append(crearElemento("span", usuario.email), crearElemento("span", usuario.rol, "insignia"));
		boton.addEventListener("click", () => {
			inputEmail.value = usuario.email;
			inputPassword.value = usuario.password;
			inputPassword.focus();
		});
		const li = document.createElement("li");
		li.append(boton);
		listaDemo.append(li);
	});

	formulario.addEventListener("submit", event => {
		event.preventDefault();

		const email = inputEmail.value.trim().toLowerCase();
		const password = inputPassword.value;

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
// PÁGINA: NUEVO TICKET (empleado)
// Sigue el caso de uso "Crear Ticket de Soporte"
// ============================================================

async function renderizarPageSolicitarTicket(usuario) {
	const formulario = document.querySelector("#form-ticket");
	if (!formulario) return;

	const datos = await obtenerDatosGlobales();
	const pasoCategoria = document.querySelector("#paso-categoria");

	// Flujo alternativo A1: el empleado ya tiene 3 tickets abiertos
	const abiertos = datos.tickets.filter(t => t.empleadoId === usuario.id && t.estado === "Abierto");
	if (abiertos.length >= MAX_TICKETS_ABIERTOS) {
		document.querySelector("#texto-limite").textContent =
			`Ya tenés ${abiertos.length} tickets con estado "Abierto". Resolvé los tickets existentes antes de abrir uno nuevo.`;
		document.querySelector("#mensaje-limite").hidden = false;
		pasoCategoria.hidden = true;
		return;
	}

	document.querySelector("#nombre").value = usuario.nombre;

	const inputCategoria = document.createElement("input");
	inputCategoria.type = "hidden";
	formulario.append(inputCategoria);

	// Paso 2: el sistema presenta las categorías disponibles
	const opciones = document.querySelector("#opciones-categoria");
	datos.categorias.forEach(categoria => {
		const boton = crearElemento("button", undefined, "opcion-categoria");
		boton.type = "button";
		boton.append(crearElemento("strong", categoria.nombre), crearElemento("span", categoria.descripcion));
		boton.addEventListener("click", () => elegirCategoria(categoria));
		opciones.append(boton);
	});

	// Equipos homologados para las fallas de hardware
	const selectEquipo = document.querySelector("#equipo");
	datos.equipos
		.filter(equipo => equipo.tipo === "Hardware")
		.forEach(equipo => {
			const option = crearElemento("option", `${equipo.nombre} (${equipo.modelo})`);
			option.value = equipo.id;
			selectEquipo.append(option);
		});

	const inputTitulo = document.querySelector("#titulo");
	const inputDescripcion = document.querySelector("#descripcion");
	const campoEquipo = document.querySelector("#campo-equipo");

	// Paso 3 y 4: al elegir la categoría se muestra su formulario
	function elegirCategoria(categoria) {
		inputCategoria.value = categoria.id;
		document.querySelector("#categoria-elegida").textContent = categoria.nombre;
		document.querySelector("#ayuda-categoria").textContent = categoria.descripcion;
		inputTitulo.placeholder = categoria.placeholderTitulo || "";
		inputDescripcion.placeholder = categoria.placeholderDescripcion || "";
		campoEquipo.hidden = !categoria.pideEquipo;

		pasoCategoria.hidden = true;
		formulario.hidden = false;
		marcarPaso(2);
		inputTitulo.focus();
	}

	document.querySelector("#cambiar-categoria").addEventListener("click", () => {
		formulario.hidden = true;
		pasoCategoria.hidden = false;
		marcarPaso(1);
	});

	// Paso 6: prioridad asignada automáticamente según el título
	const prioridadCalculada = document.querySelector("#prioridad-calculada");
	inputTitulo.addEventListener("input", () => {
		if (!inputTitulo.value.trim()) {
			prioridadCalculada.textContent = "Escribí un título";
			prioridadCalculada.className = "insignia";
			return;
		}
		const prioridad = calcularPrioridad(datos, inputTitulo.value);
		prioridadCalculada.textContent = prioridad;
		prioridadCalculada.className = "prioridad prioridad-" + prioridad.toLowerCase();
	});

	// Flujo alternativo A0: cancelación
	document.querySelector("#cancelar-ticket").addEventListener("click", () => {
		formulario.reset();
		window.location.href = resolverUrlRelativa("index.html");
	});

	const mensaje = document.querySelector("#mensaje-ticket");

	// Paso 7 y 8: confirmación y registro del ticket
	formulario.addEventListener("submit", event => {
		event.preventDefault();

		const titulo = inputTitulo.value.trim();
		const descripcion = inputDescripcion.value.trim();

		if (!titulo || !descripcion) {
			mensaje.textContent = "Completá el título y la descripción.";
			return;
		}

		mensaje.textContent = "";
		const categoria = buscarPorId(datos.categorias, Number(inputCategoria.value));

		const nuevoId = Math.max(...datos.tickets.map(t => t.id), 1000) + 1;

		const nuevoTicket = {
			id: nuevoId,
			empleadoId: usuario.id,
			tecnicoId: null,
			categoriaId: categoria.id,
			titulo: titulo,
			descripcion: descripcion,
			prioridad: calcularPrioridad(datos, titulo),
			estado: "Abierto",
			fecha: new Date().toISOString(),
			comentarios: [],
			equipoId: categoria.pideEquipo ? Number(selectEquipo.value) : null
		};

		// Indicador de carga mientras se registra (flujo alternativo A2)
		document.querySelector("#cargando").hidden = false;
		formulario.querySelectorAll("button").forEach(boton => {
			boton.disabled = true;
		});

		setTimeout(() => {
			datos.tickets.push(nuevoTicket);
			guardarDatosGlobales(datos);
			window.location.href = resolverUrlRelativa(`pages/confirmacion.html?id=${nuevoId}`);
		}, 700);
	});
}

function marcarPaso(numero) {
	[1, 2, 3].forEach(paso => {
		const li = document.querySelector(`#paso-${paso}`);
		li.classList.toggle("activo", paso === numero);
		li.classList.toggle("hecho", paso < numero);
	});
}

// ============================================================
// PÁGINA: CONFIRMACIÓN (comprobante digital)
// ============================================================

async function renderizarPageConfirmacion(usuario) {
	const contenedor = document.querySelector("#detalle-confirmacion");
	if (!contenedor) return;

	const datos = await obtenerDatosGlobales();
	const id = Number(new URLSearchParams(window.location.search).get("id"));
	const ticket = datos.tickets.find(t => t.id === id && t.empleadoId === usuario.id);

	if (!ticket) {
		contenedor.append(crearElemento("p", "No se encontró el ticket solicitado.", "mensaje-error"));
		return;
	}

	contenedor.append(
		crearElemento("p", "Número de seguimiento", "texto-suave"),
		crearElemento("p", `#${ticket.id}`, "numero-seguimiento")
	);

	const lista = crearElemento("ul", undefined, "datos-comprobante");
	const filas = [
		["Categoría", nombreCategoria(datos, ticket.categoriaId)],
		["Título", ticket.titulo],
		["Prioridad", crearEtiquetaPrioridad(ticket.prioridad)],
		["Estado", crearEtiquetaEstado(ticket.estado)],
		["Fecha", formatearFecha(ticket.fecha)]
	];
	if (ticket.equipoId) {
		const equipo = buscarPorId(datos.equipos, ticket.equipoId);
		filas.splice(1, 0, ["Equipo", equipo ? equipo.nombre : "-"]);
	}
	filas.forEach(([etiqueta, valor]) => {
		const li = document.createElement("li");
		li.append(crearElemento("span", etiqueta), valor instanceof Node ? valor : crearElemento("span", valor));
		lista.append(li);
	});
	contenedor.append(lista);
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

	if (activos.length === 0) {
		document.querySelector("#sin-tickets").hidden = false;
		tabla.parentElement.hidden = true;
		document.querySelector("#form-comentario").hidden = true;
		return;
	}

	tabla.append(crearFilaTabla(["ID", "Categoría", "Título", "Prioridad", "Estado", "Técnico"], true));

	activos.forEach(ticket => {
		tabla.append(crearFilaTabla([
			`#${ticket.id}`,
			nombreCategoria(datos, ticket.categoriaId),
			ticket.titulo,
			crearEtiquetaPrioridad(ticket.prioridad),
			crearEtiquetaEstado(ticket.estado),
			nombreUsuario(datos, ticket.tecnicoId)
		]));
	});

	// Comentarios de cada ticket
	const listaComentarios = document.querySelector("#lista-comentarios");
	activos
		.filter(ticket => ticket.comentarios.length > 0)
		.forEach(ticket => {
			const article = crearElemento("article");
			article.style.marginBottom = "14px";
			article.append(crearElemento("h3", `#${ticket.id} · ${ticket.titulo}`));
			ticket.comentarios.forEach(comentario => article.append(crearComentario(datos, comentario)));
			listaComentarios.append(article);
		});

	// Formulario para agregar comentarios
	const selectTicket = document.querySelector("#ticket-comentario");
	activos
		.filter(t => ESTADOS_COMENTABLES.includes(t.estado))
		.forEach(ticket => {
			const option = crearElemento("option", `#${ticket.id} · ${ticket.titulo}`);
			option.value = ticket.id;
			selectTicket.append(option);
		});

	const formulario = document.querySelector("#form-comentario");
	if (selectTicket.options.length === 0) {
		formulario.hidden = true;
		return;
	}

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
		lista.append(crearElemento("p", "No se registran tickets para este usuario.", "alerta tarjeta"));
		return;
	}

	cerrados.forEach(ticket => {
		lista.append(crearTarjetaTicket(datos, ticket, usuario, [
			["Categoría", nombreCategoria(datos, ticket.categoriaId)],
			["Técnico", nombreUsuario(datos, ticket.tecnicoId)],
			["Fecha", formatearFecha(ticket.fecha)],
			["Descripción", ticket.descripcion]
		]));
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
	renderizarEquiposHomologados(datos);
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
		lista.append(crearElemento("p", "No hay tickets activos.", "tarjeta"));
		return;
	}

	tickets.forEach(ticket => {
		const campos = [
			["Empleado", nombreUsuario(datos, ticket.empleadoId)],
			["Categoría", nombreCategoria(datos, ticket.categoriaId)],
			["Técnico", nombreUsuario(datos, ticket.tecnicoId)],
			["Abierto el", formatearFecha(ticket.fecha)]
		];
		if (ticket.equipoId) {
			const equipo = buscarPorId(datos.equipos, ticket.equipoId);
			if (equipo) campos.push(["Equipo", `${equipo.nombre} (${equipo.modelo})`]);
		}

		const article = crearTarjetaTicket(datos, ticket, usuario, campos);

		const descripcion = textoVisible(datos, ticket, "descripcion", usuario);
		const pDescripcion = crearParrafoDato("Descripción", descripcion);
		if (descripcion !== ticket.descripcion) pDescripcion.classList.add("confidencial");
		article.append(pDescripcion);

		ticket.comentarios.forEach(comentario => article.append(crearComentario(datos, comentario)));

		article.append(crearFormularioEstado(datos, ticket, usuario));
		article.append(crearFormularioNotificacion(datos, ticket));

		lista.append(article);
	});
}

function crearFormularioEstado(datos, ticket, usuario) {
	const form = crearElemento("form", undefined, "form-inline");

	const select = document.createElement("select");
	select.setAttribute("aria-label", "Nuevo estado");
	datos.estados
		.filter(estado => estado !== "Abierto")
		.forEach(estado => {
			const option = crearElemento("option", estado);
			option.value = estado;
			option.selected = estado === ticket.estado;
			select.append(option);
		});

	const boton = crearElemento("button", "Cambiar estado", "boton boton-chico");
	boton.type = "submit";

	form.append(select, boton);

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
	const form = crearElemento("form", undefined, "form-inline");

	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Mensaje al empleado. Ej: Por favor reinicie su computadora";
	input.setAttribute("aria-label", "Mensaje al empleado");
	input.required = true;

	const boton = crearElemento("button", "Notificar", "boton boton-secundario boton-chico");
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
		confirmacion.textContent = "✓ Enviada";
	});

	return form;
}

function renderizarEquiposHomologados(datos) {
	const tabla = document.querySelector("#tabla-equipos");
	tabla.append(crearFilaTabla(["Nombre", "Versión / Modelo", "Tipo", "Homologación"], true));

	datos.equipos.forEach(equipo => {
		const estado = equipo.homologado
			? crearElemento("span", "Homologado", "estado estado-cerrado")
			: crearElemento("span", "No homologado", "prioridad prioridad-alta");
		tabla.append(crearFilaTabla([equipo.nombre, equipo.modelo, equipo.tipo, estado]));
	});
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
		["Activos", activos.length],
		["Cerrados", datos.tickets.length - activos.length],
		["Sin asignar", activos.filter(t => t.tecnicoId === null).length]
	].forEach(([titulo, valor]) => {
		const article = crearElemento("article", undefined, "indicador");
		article.append(crearElemento("h3", titulo), crearElemento("p", valor, "numero"));
		resumen.append(article);
	});

	// Categorías ordenadas por frecuencia
	const barras = document.querySelector("#barras-categorias");
	const frecuencias = datos.categorias
		.map(categoria => ({
			nombre: categoria.nombre,
			cantidad: datos.tickets.filter(t => t.categoriaId === categoria.id).length
		}))
		.sort((a, b) => b.cantidad - a.cantidad);
	const maximo = Math.max(1, ...frecuencias.map(f => f.cantidad));

	frecuencias.forEach(fila => {
		const contenedor = document.createElement("div");
		const texto = crearElemento("div", undefined, "barra-fila");
		texto.append(crearElemento("span", fila.nombre), crearElemento("strong", fila.cantidad));
		const fondo = crearElemento("div", undefined, "barra-fondo");
		const relleno = crearElemento("div", undefined, "barra-relleno");
		relleno.style.width = `${(fila.cantidad / maximo) * 100}%`;
		fondo.append(relleno);
		contenedor.append(texto, fondo);
		barras.append(contenedor);
	});

	// Carga de trabajo por técnico
	const tablaTecnicos = document.querySelector("#tabla-tecnicos");
	tablaTecnicos.append(crearFilaTabla(["Técnico", "Nivel", "Activos"], true));
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
		criticos.append(crearElemento("p", "No hay incidentes críticos activos en este momento.", "tarjeta"));
	}
	altos.forEach(ticket => {
		const horas = Math.floor((Date.now() - new Date(ticket.fecha)) / 3600000);
		criticos.append(crearTarjetaTicket(datos, ticket, usuario, [
			["Técnico asignado", nombreUsuario(datos, ticket.tecnicoId)],
			["Tiempo desde la apertura", `${horas} horas`]
		]));
	});

	// Información confidencial (sólo visible para el gerente)
	const confidenciales = document.querySelector("#lista-confidenciales");
	const listaConf = datos.tickets.filter(t => esConfidencial(datos, t));
	if (listaConf.length === 0) {
		confidenciales.append(crearElemento("p", "No hay tickets con información confidencial.", "tarjeta"));
	}
	listaConf.forEach(ticket => {
		confidenciales.append(crearTarjetaTicket(datos, ticket, usuario, [
			["Empleado", nombreUsuario(datos, ticket.empleadoId)],
			["Descripción", ticket.descripcion]
		]));
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
