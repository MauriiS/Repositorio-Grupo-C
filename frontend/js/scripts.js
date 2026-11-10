// ============================================================
// CONFIGURACIÓN Y RUTAS
// La URL del backend se define en js/config.js (API_URL)
// ============================================================

const SESSION_KEY = "techsolveSesion";

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
// SESIÓN
// En localStorage sólo queda el token y el usuario conectado.
// Los datos del negocio viven en el backend.
// ============================================================

function guardarSesion(sesion) {
	localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
}

function obtenerSesion() {
	const sesion = localStorage.getItem(SESSION_KEY);
	return sesion ? JSON.parse(sesion) : null;
}

function obtenerUsuarioActual() {
	const sesion = obtenerSesion();
	return sesion ? sesion.usuario : null;
}

function irAlLogin() {
	localStorage.removeItem(SESSION_KEY);
	window.location.href = resolverUrlRelativa("pages/login.html");
}

async function cerrarSesion() {
	try {
		await api("/api/logout", { method: "POST" });
	} catch (error) {
		// Si el server ya no tenía la sesión, igual salimos
	}
	irAlLogin();
}

// ============================================================
// COMUNICACIÓN CON LA API
// ============================================================

// Hace la petición al backend, manda el token y devuelve el JSON.
// Si el backend responde con error, lanza una excepción con su mensaje.
async function api(ruta, opciones = {}) {
	const sesion = obtenerSesion();
	const headers = { "Content-Type": "application/json" };
	if (sesion) headers.Authorization = `Bearer ${sesion.token}`;

	let respuesta;
	try {
		respuesta = await fetch(API_URL + ruta, {
			method: opciones.method || "GET",
			headers: headers,
			body: opciones.body ? JSON.stringify(opciones.body) : undefined
		});
	} catch (error) {
		throw new Error("No se pudo conectar con el servidor. Probá de nuevo en unos segundos.");
	}

	const datos = await respuesta.json().catch(() => ({}));

	// Sesión vencida (por ejemplo, se reinició el server)
	if (respuesta.status === 401 && sesion && ruta !== "/api/logout") {
		irAlLogin();
		throw new Error(datos.error || "Debe iniciar sesión.");
	}

	if (!respuesta.ok) {
		throw new Error(datos.error || "Ocurrió un error inesperado.");
	}

	return datos;
}

// Muestra un error general arriba del contenido de la página
function mostrarError(mensaje) {
	let alerta = document.querySelector("#error-general");
	if (!alerta) {
		alerta = crearElemento("article", undefined, "alerta alerta-error");
		alerta.id = "error-general";
		document.querySelector("main").prepend(alerta);
	}
	alerta.innerHTML = "";
	alerta.append(crearElemento("h3", "Algo salió mal"), crearElemento("p", mensaje));
}

// ============================================================
// UTILIDADES DE LA INTERFAZ
// ============================================================

function formatearFecha(fechaIso) {
	return new Date(fechaIso).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
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
	p.append(strong, String(valor ?? "-"));
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

// Tarjeta de ticket reutilizada en historial, panel del técnico y tablero.
// El backend ya manda los nombres y el texto enmascarado si corresponde.
function crearTarjetaTicket(ticket, campos) {
	const article = document.createElement("article");
	article.className = "ticket ticket-" + ticket.prioridad.toLowerCase();

	const encabezado = crearElemento("div", undefined, "ticket-encabezado");
	const h3 = crearElemento("h3", `#${ticket.id} · ${ticket.titulo}`);
	if (ticket.enmascarado) h3.classList.add("confidencial");

	const insignias = crearElemento("div", undefined, "ticket-insignias");
	insignias.append(crearEtiquetaPrioridad(ticket.prioridad), crearEtiquetaEstado(ticket.estado));
	encabezado.append(h3, insignias);

	const cuerpo = crearElemento("div", undefined, "ticket-datos");
	campos.forEach(([etiqueta, valor]) => cuerpo.append(crearParrafoDato(etiqueta, valor)));

	article.append(encabezado, cuerpo);
	return article;
}

function crearComentario(comentario) {
	const div = crearElemento("div", undefined, "comentario");
	div.append(
		crearElemento("small", `${comentario.autor} · ${formatearFecha(comentario.fecha)}`),
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

	document.querySelector("#bienvenida").textContent = usuario
		? `Hola, ${usuario.nombre.split(" ")[0]}`
		: "Bienvenido/a a TechSolve";

	// Servicios según el rol (es parte de la interfaz, no del negocio)
	const servicios = SERVICIOS_POR_ROL[usuario ? usuario.rol : "visitante"];
	servicios.forEach(servicio => {
		const link = crearElemento("a", undefined, "tarjeta tarjeta-link");
		link.href = servicio.url;
		link.append(crearElemento("h3", servicio.titulo + " →"), crearElemento("p", servicio.descripcion));
		listaServicios.append(link);
	});

	try {
		const [aviso, categorias] = await Promise.all([
			api("/api/aviso-mantenimiento"),
			api("/api/categorias")
		]);

		// Aviso de mantenimiento programado
		const contenedorAviso = document.querySelector("#aviso-mantenimiento");
		if (usuario && aviso.activo) {
			contenedorAviso.append(
				crearElemento("h3", "⚠ Mantenimiento programado"),
				crearElemento("p", aviso.mensaje)
			);
			contenedorAviso.hidden = false;
		}

		// Categorías de soporte
		const listaCategorias = document.querySelector("#lista-categorias");
		categorias.forEach(categoria => {
			const li = document.createElement("li");
			li.append(crearElemento("strong", categoria.nombre), categoria.descripcion);
			listaCategorias.append(li);
		});

		// Notificaciones pendientes del empleado
		if (usuario && usuario.rol === "empleado") {
			await renderizarNotificaciones();
		}
	} catch (error) {
		mostrarError(error.message);
	}
}

async function renderizarNotificaciones() {
	const contenedor = document.querySelector("#notificaciones");
	const pendientes = await api("/api/notificaciones");
	if (pendientes.length === 0) return;

	contenedor.append(crearElemento("h3", "Mensajes del soporte técnico"));

	pendientes.forEach(notificacion => {
		const item = crearElemento("div", undefined, "notificacion-item");
		const texto = document.createElement("p");
		texto.append(crearElemento("strong", `Ticket #${notificacion.ticketId}: `), notificacion.mensaje);

		const boton = crearElemento("button", "Marcar como leído", "boton boton-secundario boton-chico");
		boton.type = "button";
		boton.addEventListener("click", async () => {
			try {
				await api(`/api/notificaciones/${notificacion.id}`, { method: "PATCH", body: { leida: true } });
				item.remove();
				if (!contenedor.querySelector(".notificacion-item")) contenedor.hidden = true;
			} catch (error) {
				mostrarError(error.message);
			}
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

	const mensaje = document.querySelector("#mensaje-login");
	const inputEmail = document.querySelector("#email");
	const inputPassword = document.querySelector("#password");
	const botonIngresar = formulario.querySelector("button[type=submit]");

	formulario.addEventListener("submit", async event => {
		event.preventDefault();
		mensaje.textContent = "";
		botonIngresar.disabled = true;
		botonIngresar.textContent = "Ingresando...";

		// En Render gratis el server se duerme y tarda en despertar
		const avisoDemora = setTimeout(() => {
			mensaje.textContent = "El servidor se está despertando, puede tardar hasta un minuto...";
		}, 4000);

		try {
			const sesion = await api("/api/login", {
				method: "POST",
				body: { email: inputEmail.value.trim(), password: inputPassword.value }
			});
			clearTimeout(avisoDemora);
			guardarSesion(sesion);
			window.location.href = resolverUrlRelativa("index.html");
		} catch (error) {
			clearTimeout(avisoDemora);
			mensaje.textContent = error.message;
			botonIngresar.disabled = false;
			botonIngresar.textContent = "Ingresar";
		}
	});

	// Usuarios de prueba (el backend no manda contraseñas)
	try {
		const usuarios = await api("/api/usuarios-demo");
		const listaDemo = document.querySelector("#usuarios-demo");
		usuarios.forEach(usuario => {
			const boton = crearElemento("button", undefined, "boton");
			boton.type = "button";
			boton.append(crearElemento("span", usuario.email), crearElemento("span", usuario.rol, "insignia"));
			boton.addEventListener("click", () => {
				inputEmail.value = usuario.email;
				inputPassword.focus();
			});
			const li = document.createElement("li");
			li.append(boton);
			listaDemo.append(li);
		});
	} catch (error) {
		mensaje.textContent = error.message;
	}
}

// ============================================================
// PÁGINA: NUEVO TICKET (empleado)
// Sigue el caso de uso "Crear Ticket de Soporte"
// ============================================================

async function renderizarPageSolicitarTicket(usuario) {
	const formulario = document.querySelector("#form-ticket");
	if (!formulario) return;

	const pasoCategoria = document.querySelector("#paso-categoria");

	let categorias, equipos, activos;
	try {
		[categorias, equipos, activos] = await Promise.all([
			api("/api/categorias"),
			api("/api/equipos?tipo=Hardware"),
			api("/api/mis-tickets?estado=activos")
		]);
	} catch (error) {
		mostrarError(error.message);
		return;
	}

	// Flujo alternativo A1: aviso anticipado si ya tiene 3 tickets abiertos.
	// Igual el backend es el que valida la regla al crear el ticket.
	const abiertos = activos.filter(t => t.estado === "Abierto");
	if (abiertos.length >= 3) {
		mostrarLimite(`Ya tenés ${abiertos.length} tickets con estado "Abierto". Resolvé los tickets existentes antes de abrir uno nuevo.`);
		return;
	}

	document.querySelector("#nombre").value = usuario.nombre;

	let categoriaElegida = null;

	// Paso 2: el sistema presenta las categorías disponibles
	const opciones = document.querySelector("#opciones-categoria");
	categorias.forEach(categoria => {
		const boton = crearElemento("button", undefined, "opcion-categoria");
		boton.type = "button";
		boton.append(crearElemento("strong", categoria.nombre), crearElemento("span", categoria.descripcion));
		boton.addEventListener("click", () => elegirCategoria(categoria));
		opciones.append(boton);
	});

	// Equipos homologados para las fallas de hardware
	const selectEquipo = document.querySelector("#equipo");
	equipos.forEach(equipo => {
		const option = crearElemento("option", `${equipo.nombre} (${equipo.modelo})`);
		option.value = equipo.id;
		selectEquipo.append(option);
	});

	const inputTitulo = document.querySelector("#titulo");
	const inputDescripcion = document.querySelector("#descripcion");
	const campoEquipo = document.querySelector("#campo-equipo");

	// Paso 3 y 4: al elegir la categoría se muestra su formulario
	function elegirCategoria(categoria) {
		categoriaElegida = categoria;
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

	// Paso 6: el backend calcula la prioridad según el título
	const prioridadCalculada = document.querySelector("#prioridad-calculada");
	let esperaPrioridad;
	inputTitulo.addEventListener("input", () => {
		clearTimeout(esperaPrioridad);
		if (!inputTitulo.value.trim()) {
			prioridadCalculada.textContent = "Escribí un título";
			prioridadCalculada.className = "insignia";
			return;
		}
		esperaPrioridad = setTimeout(async () => {
			try {
				const { prioridad } = await api(`/api/prioridad?titulo=${encodeURIComponent(inputTitulo.value)}`);
				prioridadCalculada.textContent = prioridad;
				prioridadCalculada.className = "prioridad prioridad-" + prioridad.toLowerCase();
			} catch (error) {
				prioridadCalculada.textContent = "No disponible";
				prioridadCalculada.className = "insignia";
			}
		}, 300);
	});

	// Flujo alternativo A0: cancelación
	document.querySelector("#cancelar-ticket").addEventListener("click", () => {
		formulario.reset();
		window.location.href = resolverUrlRelativa("index.html");
	});

	const mensaje = document.querySelector("#mensaje-ticket");
	const cargando = document.querySelector("#cargando");
	const botones = formulario.querySelectorAll("button");

	// Paso 7 y 8: confirmación y registro del ticket en el backend
	formulario.addEventListener("submit", async event => {
		event.preventDefault();
		mensaje.textContent = "";

		if (!inputTitulo.value.trim() || !inputDescripcion.value.trim()) {
			mensaje.textContent = "Completá el título y la descripción.";
			return;
		}

		// Indicador de carga mientras se registra (flujo alternativo A2)
		cargando.hidden = false;
		botones.forEach(boton => { boton.disabled = true; });

		try {
			const ticket = await api("/api/tickets", {
				method: "POST",
				body: {
					categoriaId: categoriaElegida.id,
					titulo: inputTitulo.value.trim(),
					descripcion: inputDescripcion.value.trim(),
					equipoId: categoriaElegida.pideEquipo ? Number(selectEquipo.value) : null
				}
			});
			window.location.href = resolverUrlRelativa(`pages/confirmacion.html?id=${ticket.id}`);
		} catch (error) {
			cargando.hidden = true;
			botones.forEach(boton => { boton.disabled = false; });
			mensaje.textContent = error.message;
		}
	});
}

function mostrarLimite(texto) {
	document.querySelector("#texto-limite").textContent = texto;
	document.querySelector("#mensaje-limite").hidden = false;
	document.querySelector("#paso-categoria").hidden = true;
	document.querySelector("#form-ticket").hidden = true;
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

async function renderizarPageConfirmacion() {
	const contenedor = document.querySelector("#detalle-confirmacion");
	if (!contenedor) return;

	const id = Number(new URLSearchParams(window.location.search).get("id"));

	let ticket;
	try {
		ticket = await api(`/api/tickets/${id}`);
	} catch (error) {
		contenedor.append(crearElemento("p", error.message, "mensaje-error"));
		return;
	}

	contenedor.append(
		crearElemento("p", "Número de seguimiento", "texto-suave"),
		crearElemento("p", `#${ticket.id}`, "numero-seguimiento")
	);

	const lista = crearElemento("ul", undefined, "datos-comprobante");
	const filas = [
		["Categoría", ticket.categoria],
		["Título", ticket.titulo],
		["Prioridad", crearEtiquetaPrioridad(ticket.prioridad)],
		["Estado", crearEtiquetaEstado(ticket.estado)],
		["Fecha", formatearFecha(ticket.fecha)]
	];
	if (ticket.equipo) filas.splice(1, 0, ["Equipo", ticket.equipo]);

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

async function renderizarPageMisTickets() {
	const tabla = document.querySelector("#tabla-mis-tickets");
	if (!tabla) return;

	let activos;
	try {
		activos = await api("/api/mis-tickets?estado=activos");
	} catch (error) {
		mostrarError(error.message);
		return;
	}

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
			ticket.categoria,
			ticket.titulo,
			crearEtiquetaPrioridad(ticket.prioridad),
			crearEtiquetaEstado(ticket.estado),
			ticket.tecnico || "Sin asignar"
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
			ticket.comentarios.forEach(comentario => article.append(crearComentario(comentario)));
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

	formulario.addEventListener("submit", async event => {
		event.preventDefault();

		const texto = document.querySelector("#comment").value.trim();
		if (!texto) return;

		try {
			await api(`/api/tickets/${selectTicket.value}/comentarios`, { method: "POST", body: { texto } });
			window.location.reload();
		} catch (error) {
			mostrarError(error.message);
		}
	});
}

// ============================================================
// PÁGINA: HISTORIAL (empleado)
// ============================================================

async function renderizarPageHistorial() {
	const lista = document.querySelector("#lista-historial");
	if (!lista) return;

	let cerrados;
	try {
		cerrados = await api("/api/mis-tickets?estado=cerrados");
	} catch (error) {
		mostrarError(error.message);
		return;
	}

	if (cerrados.length === 0) {
		lista.append(crearElemento("p", "No se registran tickets para este usuario.", "alerta tarjeta"));
		return;
	}

	cerrados.forEach(ticket => {
		lista.append(crearTarjetaTicket(ticket, [
			["Categoría", ticket.categoria],
			["Técnico", ticket.tecnico || "Sin asignar"],
			["Fecha", formatearFecha(ticket.fecha)],
			["Descripción", ticket.descripcion]
		]));
	});
}

// ============================================================
// PÁGINA: PANEL DEL TÉCNICO
// ============================================================

async function renderizarPagePanelTecnico() {
	const lista = document.querySelector("#lista-tickets-tecnico");
	if (!lista) return;

	let estados, equipos;
	try {
		[estados, equipos] = await Promise.all([api("/api/estados"), api("/api/equipos")]);
	} catch (error) {
		mostrarError(error.message);
		return;
	}

	const filtro = document.querySelector("#filtro-panel");
	filtro.addEventListener("change", () => dibujarTicketsTecnico(estados));

	dibujarTicketsTecnico(estados);
	renderizarEquiposHomologados(equipos);
}

async function dibujarTicketsTecnico(estados) {
	const lista = document.querySelector("#lista-tickets-tecnico");
	const filtro = document.querySelector("#filtro-panel").value;

	let tickets;
	try {
		// El backend los devuelve ordenados por urgencia y enmascarados si corresponde
		tickets = await api(`/api/tickets?filtro=${filtro}`);
	} catch (error) {
		mostrarError(error.message);
		return;
	}

	lista.innerHTML = "";

	if (tickets.length === 0) {
		lista.append(crearElemento("p", "No hay tickets activos.", "tarjeta"));
		return;
	}

	tickets.forEach(ticket => {
		const campos = [
			["Empleado", ticket.empleado],
			["Categoría", ticket.categoria],
			["Técnico", ticket.tecnico || "Sin asignar"],
			["Abierto el", formatearFecha(ticket.fecha)]
		];
		if (ticket.equipo) campos.push(["Equipo", ticket.equipo]);

		const article = crearTarjetaTicket(ticket, campos);

		const pDescripcion = crearParrafoDato("Descripción", ticket.descripcion);
		if (ticket.enmascarado) pDescripcion.classList.add("confidencial");
		article.append(pDescripcion);

		ticket.comentarios.forEach(comentario => article.append(crearComentario(comentario)));

		article.append(crearFormularioEstado(ticket, estados));
		article.append(crearFormularioNotificacion(ticket));

		lista.append(article);
	});
}

function crearFormularioEstado(ticket, estados) {
	const form = crearElemento("form", undefined, "form-inline");

	const select = document.createElement("select");
	select.setAttribute("aria-label", "Nuevo estado");
	estados
		.filter(estado => estado !== "Abierto")
		.forEach(estado => {
			const option = crearElemento("option", estado);
			option.value = estado;
			option.selected = estado === ticket.estado;
			select.append(option);
		});

	const boton = crearElemento("button", "Cambiar estado", "boton boton-chico");
	boton.type = "submit";

	const resultado = crearElemento("span", "", "mensaje-error");

	form.append(select, boton, resultado);

	form.addEventListener("submit", async event => {
		event.preventDefault();
		boton.disabled = true;
		try {
			await api(`/api/tickets/${ticket.id}/estado`, { method: "PATCH", body: { estado: select.value } });
			dibujarTicketsTecnico(estados);
		} catch (error) {
			resultado.textContent = error.message;
			boton.disabled = false;
		}
	});

	return form;
}

function crearFormularioNotificacion(ticket) {
	const form = crearElemento("form", undefined, "form-inline");

	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Mensaje al empleado. Ej: Por favor reinicie su computadora";
	input.setAttribute("aria-label", "Mensaje al empleado");
	input.required = true;

	const boton = crearElemento("button", "Notificar", "boton boton-secundario boton-chico");
	boton.type = "submit";

	const resultado = crearElemento("span", "", "mensaje-ok");

	form.append(input, boton, resultado);

	form.addEventListener("submit", async event => {
		event.preventDefault();
		try {
			await api(`/api/tickets/${ticket.id}/notificaciones`, { method: "POST", body: { mensaje: input.value.trim() } });
			input.value = "";
			resultado.className = "mensaje-ok";
			resultado.textContent = "✓ Enviada";
		} catch (error) {
			resultado.className = "mensaje-error";
			resultado.textContent = error.message;
		}
	});

	return form;
}

function renderizarEquiposHomologados(equipos) {
	const tabla = document.querySelector("#tabla-equipos");
	tabla.append(crearFilaTabla(["Nombre", "Versión / Modelo", "Tipo", "Homologación"], true));

	equipos.forEach(equipo => {
		const estado = equipo.homologado
			? crearElemento("span", "Homologado", "estado estado-cerrado")
			: crearElemento("span", "No homologado", "prioridad prioridad-alta");
		tabla.append(crearFilaTabla([equipo.nombre, equipo.modelo, equipo.tipo, estado]));
	});
}

// ============================================================
// PÁGINA: TABLERO DEL GERENTE
// ============================================================

async function renderizarPageTablero() {
	const resumen = document.querySelector("#resumen-tablero");
	if (!resumen) return;

	document.querySelector("#reiniciar-datos").addEventListener("click", async () => {
		try {
			await api("/api/reiniciar", { method: "POST" });
			irAlLogin();
		} catch (error) {
			mostrarError(error.message);
		}
	});

	let tablero, criticos, confidenciales;
	try {
		[tablero, criticos, confidenciales] = await Promise.all([
			api("/api/tablero"),
			api("/api/tablero/criticos"),
			api("/api/tablero/confidenciales")
		]);
	} catch (error) {
		mostrarError(error.message);
		return;
	}

	// Indicadores generales
	[
		["Tickets totales", tablero.resumen.total],
		["Activos", tablero.resumen.activos],
		["Cerrados", tablero.resumen.cerrados],
		["Sin asignar", tablero.resumen.sinAsignar]
	].forEach(([titulo, valor]) => {
		const article = crearElemento("article", undefined, "indicador");
		article.append(crearElemento("h3", titulo), crearElemento("p", valor, "numero"));
		resumen.append(article);
	});

	// Categorías ordenadas por frecuencia
	const barras = document.querySelector("#barras-categorias");
	const maximo = Math.max(1, ...tablero.categorias.map(c => c.cantidad));
	tablero.categorias.forEach(fila => {
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
	tablero.tecnicos.forEach(tecnico => {
		tablaTecnicos.append(crearFilaTabla([tecnico.nombre, tecnico.nivel, tecnico.activos]));
	});

	// Incidentes críticos
	const listaCriticos = document.querySelector("#lista-criticos");
	if (criticos.length === 0) {
		listaCriticos.append(crearElemento("p", "No hay incidentes críticos activos en este momento.", "tarjeta"));
	}
	criticos.forEach(ticket => {
		listaCriticos.append(crearTarjetaTicket(ticket, [
			["Técnico asignado", ticket.tecnico || "Sin asignar"],
			["Tiempo desde la apertura", `${ticket.horasAbierto} horas`]
		]));
	});

	// Información confidencial (sólo la ve el gerente)
	const listaConfidenciales = document.querySelector("#lista-confidenciales");
	if (confidenciales.length === 0) {
		listaConfidenciales.append(crearElemento("p", "No hay tickets con información confidencial.", "tarjeta"));
	}
	confidenciales.forEach(ticket => {
		listaConfidenciales.append(crearTarjetaTicket(ticket, [
			["Empleado", ticket.empleado],
			["Descripción", ticket.descripcion]
		]));
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
	renderizarPageConfirmacion();
	renderizarPageMisTickets();
	renderizarPageHistorial();
	renderizarPagePanelTecnico();
	renderizarPageTablero();
});
