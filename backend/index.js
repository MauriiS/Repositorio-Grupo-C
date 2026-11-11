// ============================================================
// TechSolve - API REST (Node.js + Express)
// Los datos se guardan en memoria: se cargan desde data/datos.json
// al iniciar y se pierden cuando el servidor se reinicia.
// ============================================================

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const datosIniciales = require("./data/datos.json");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_TICKETS_ABIERTOS = 3;
const ESTADOS_COMENTABLES = ["Abierto", "Asignado", "En Progreso"];

// CORS_ORIGIN permite limitar qué frontend puede usar la API
// (por ejemplo, la URL del sitio en Render). Si no está, se permite cualquiera.
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*" }));
app.use(express.json());

// ============================================================
// DATOS EN MEMORIA
// ============================================================

let datos = structuredClone(datosIniciales);

// Sesiones activas: token -> id de usuario
const sesiones = new Map();

function reiniciarDatos() {
	datos = structuredClone(datosIniciales);
	sesiones.clear();
}

// ============================================================
// UTILIDADES
// ============================================================

function buscarPorId(lista, id) {
	return lista.find(elemento => elemento.id === id);
}

function nombreUsuario(id) {
	const usuario = buscarPorId(datos.usuarios, id);
	return usuario ? usuario.nombre : null;
}

function sinPassword(usuario) {
	const { password, ...resto } = usuario;
	return resto;
}

function error(res, estado, mensaje) {
	return res.status(estado).json({ error: mensaje });
}

// ============================================================
// REGLAS DE NEGOCIO
// ============================================================

// La prioridad se asigna según las palabras clave del título
function calcularPrioridad(titulo) {
	const texto = titulo.toLowerCase();
	const claves = datos.palabrasClavePrioridad;

	if (claves.Alta.some(palabra => texto.includes(palabra))) return "Alta";
	if (claves.Media.some(palabra => texto.includes(palabra))) return "Media";
	return "Baja";
}

function valorPrioridad(prioridad) {
	return { Alta: 3, Media: 2, Baja: 1 }[prioridad] || 0;
}

// Tickets con "Recibo de Sueldo" o "Liquidación" son confidenciales
function esConfidencial(ticket) {
	const texto = `${ticket.titulo} ${ticket.descripcion}`.toLowerCase();
	return datos.palabrasConfidenciales.some(palabra => texto.includes(palabra));
}

function ticketsAbiertosDe(empleadoId) {
	return datos.tickets.filter(t => t.empleadoId === empleadoId && t.estado === "Abierto");
}

// Arma la respuesta de un ticket con los nombres relacionados.
// Para los técnicos se enmascara la información confidencial.
function formatearTicket(ticket, usuario) {
	const categoria = buscarPorId(datos.categorias, ticket.categoriaId);
	const equipo = ticket.equipoId ? buscarPorId(datos.equipos, ticket.equipoId) : null;
	const confidencial = esConfidencial(ticket);
	const enmascarar = confidencial && usuario.rol === "tecnico";

	return {
		...ticket,
		titulo: enmascarar ? "******** (información confidencial)" : ticket.titulo,
		descripcion: enmascarar ? "******** (información confidencial)" : ticket.descripcion,
		confidencial: confidencial,
		enmascarado: enmascarar,
		empleado: nombreUsuario(ticket.empleadoId),
		tecnico: nombreUsuario(ticket.tecnicoId),
		categoria: categoria ? categoria.nombre : null,
		equipo: equipo ? `${equipo.nombre} (${equipo.modelo})` : null,
		comentarios: ticket.comentarios.map(comentario => ({
			...comentario,
			autor: nombreUsuario(comentario.autorId)
		}))
	};
}

// ============================================================
// SESIÓN Y PERMISOS
// ============================================================

// Lee el token del encabezado "Authorization: Bearer <token>"
function requiereSesion(req, res, next) {
	const encabezado = req.headers.authorization || "";
	const token = encabezado.replace("Bearer ", "");
	const usuarioId = sesiones.get(token);
	const usuario = usuarioId ? buscarPorId(datos.usuarios, usuarioId) : null;

	if (!usuario) return error(res, 401, "Debe iniciar sesión.");

	req.usuario = usuario;
	req.token = token;
	next();
}

function requiereRol(...roles) {
	return (req, res, next) => {
		if (!roles.includes(req.usuario.rol)) {
			return error(res, 403, "No tiene permisos para realizar esta operación.");
		}
		next();
	};
}

// ============================================================
// ENDPOINTS GENERALES
// ============================================================

app.get("/", (req, res) => {
	res.json({ servicio: "TechSolve API", estado: "ok" });
});

app.post("/api/login", (req, res) => {
	const { email, password } = req.body || {};
	if (!email || !password) return error(res, 400, "Debe ingresar email y contraseña.");

	const usuario = datos.usuarios.find(
		u => u.email === String(email).trim().toLowerCase() && u.password === password
	);
	if (!usuario) return error(res, 401, "Usuario o contraseña incorrectos.");

	const token = crypto.randomUUID();
	sesiones.set(token, usuario.id);

	res.json({ token: token, usuario: sinPassword(usuario) });
});

app.post("/api/logout", requiereSesion, (req, res) => {
	sesiones.delete(req.token);
	res.json({ mensaje: "Sesión cerrada." });
});

// Usuarios de prueba para la pantalla de login (sin contraseñas)
app.get("/api/usuarios-demo", (req, res) => {
	res.json(datos.usuarios.map(u => ({ email: u.email, rol: u.rol })));
});

app.get("/api/categorias", (req, res) => {
	res.json(datos.categorias);
});

app.get("/api/aviso-mantenimiento", (req, res) => {
	res.json(datos.avisoMantenimiento);
});

app.get("/api/equipos", requiereSesion, (req, res) => {
	const { tipo } = req.query;
	res.json(tipo ? datos.equipos.filter(e => e.tipo === tipo) : datos.equipos);
});

app.get("/api/prioridad", requiereSesion, (req, res) => {
	const titulo = String(req.query.titulo || "");
	res.json({ prioridad: titulo.trim() ? calcularPrioridad(titulo) : null });
});

// ============================================================
// ENDPOINTS DEL EMPLEADO
// ============================================================

// Crear ticket (caso de uso principal)
app.post("/api/tickets", requiereSesion, requiereRol("empleado"), (req, res) => {
	const { categoriaId, titulo, descripcion, equipoId } = req.body || {};
	const usuario = req.usuario;

	const categoria = buscarPorId(datos.categorias, Number(categoriaId));
	if (!categoria) return error(res, 400, "Debe seleccionar una categoría válida.");

	if (!titulo || !String(titulo).trim() || !descripcion || !String(descripcion).trim()) {
		return error(res, 400, "Debe completar el título y la descripción.");
	}

	let equipo = null;
	if (categoria.pideEquipo) {
		equipo = buscarPorId(datos.equipos, Number(equipoId));
		if (!equipo || equipo.tipo !== "Hardware") {
			return error(res, 400, "Debe seleccionar el equipo afectado.");
		}
	}

	// Regla de negocio: máximo 3 tickets abiertos por empleado
	if (ticketsAbiertosDe(usuario.id).length >= MAX_TICKETS_ABIERTOS) {
		return error(res, 409, `Ya tiene ${MAX_TICKETS_ABIERTOS} tickets abiertos. Debe resolver los tickets existentes antes de abrir uno nuevo.`);
	}

	const nuevoTicket = {
		id: Math.max(1000, ...datos.tickets.map(t => t.id)) + 1,
		empleadoId: usuario.id,
		tecnicoId: null,
		categoriaId: categoria.id,
		titulo: String(titulo).trim(),
		descripcion: String(descripcion).trim(),
		prioridad: calcularPrioridad(String(titulo)),
		estado: "Abierto",
		fecha: new Date().toISOString(),
		comentarios: [],
		equipoId: equipo ? equipo.id : null
	};

	datos.tickets.push(nuevoTicket);
	res.status(201).json(formatearTicket(nuevoTicket, usuario));
});

// Tickets del empleado conectado: ?estado=activos | cerrados
app.get("/api/mis-tickets", requiereSesion, requiereRol("empleado"), (req, res) => {
	const { estado } = req.query;

	const tickets = datos.tickets
		.filter(t => t.empleadoId === req.usuario.id)
		.filter(t => {
			if (estado === "activos") return t.estado !== "Cerrado";
			if (estado === "cerrados") return t.estado === "Cerrado";
			return true;
		})
		.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

	res.json(tickets.map(t => formatearTicket(t, req.usuario)));
});

app.get("/api/tickets/:id", requiereSesion, (req, res) => {
	const ticket = buscarPorId(datos.tickets, Number(req.params.id));
	if (!ticket) return error(res, 404, "Ticket no encontrado.");

	// El empleado sólo puede ver sus propios tickets
	if (req.usuario.rol === "empleado" && ticket.empleadoId !== req.usuario.id) {
		return error(res, 403, "No tiene permisos para ver este ticket.");
	}

	res.json(formatearTicket(ticket, req.usuario));
});

app.post("/api/tickets/:id/comentarios", requiereSesion, requiereRol("empleado"), (req, res) => {
	const ticket = buscarPorId(datos.tickets, Number(req.params.id));
	if (!ticket || ticket.empleadoId !== req.usuario.id) {
		return error(res, 404, "Ticket no encontrado.");
	}

	// Regla de negocio: sólo se comentan tickets activos
	if (!ESTADOS_COMENTABLES.includes(ticket.estado)) {
		return error(res, 409, `No se pueden agregar comentarios a un ticket en estado "${ticket.estado}".`);
	}

	const texto = String((req.body || {}).texto || "").trim();
	if (!texto) return error(res, 400, "El comentario no puede estar vacío.");

	const comentario = { autorId: req.usuario.id, texto: texto, fecha: new Date().toISOString() };
	ticket.comentarios.push(comentario);

	res.status(201).json({ ...comentario, autor: req.usuario.nombre });
});

app.get("/api/notificaciones", requiereSesion, requiereRol("empleado"), (req, res) => {
	res.json(datos.notificaciones.filter(n => n.empleadoId === req.usuario.id && !n.leida));
});

app.patch("/api/notificaciones/:id", requiereSesion, requiereRol("empleado"), (req, res) => {
	const notificacion = buscarPorId(datos.notificaciones, Number(req.params.id));
	if (!notificacion || notificacion.empleadoId !== req.usuario.id) {
		return error(res, 404, "Notificación no encontrada.");
	}

	notificacion.leida = Boolean((req.body || {}).leida);
	res.json(notificacion);
});

// ============================================================
// ENDPOINTS DEL TÉCNICO
// ============================================================

// Tickets activos ordenados por urgencia: ?filtro=mios | todos
app.get("/api/tickets", requiereSesion, requiereRol("tecnico"), (req, res) => {
	const filtro = req.query.filtro || "mios";

	const tickets = datos.tickets
		.filter(t => t.estado !== "Cerrado")
		.filter(t => filtro === "todos" || t.tecnicoId === req.usuario.id || t.tecnicoId === null)
		.sort((a, b) => valorPrioridad(b.prioridad) - valorPrioridad(a.prioridad) || new Date(a.fecha) - new Date(b.fecha));

	res.json(tickets.map(t => formatearTicket(t, req.usuario)));
});

app.get("/api/estados", requiereSesion, (req, res) => {
	res.json(datos.estados);
});

app.patch("/api/tickets/:id/estado", requiereSesion, requiereRol("tecnico"), (req, res) => {
	const ticket = buscarPorId(datos.tickets, Number(req.params.id));
	if (!ticket) return error(res, 404, "Ticket no encontrado.");

	const { estado } = req.body || {};
	if (!datos.estados.includes(estado) || estado === "Abierto") {
		return error(res, 400, "El estado indicado no es válido.");
	}

	ticket.estado = estado;
	// Si nadie lo tenía, queda asignado al técnico que lo toma
	if (ticket.tecnicoId === null) ticket.tecnicoId = req.usuario.id;

	res.json(formatearTicket(ticket, req.usuario));
});

app.post("/api/tickets/:id/notificaciones", requiereSesion, requiereRol("tecnico"), (req, res) => {
	const ticket = buscarPorId(datos.tickets, Number(req.params.id));
	if (!ticket) return error(res, 404, "Ticket no encontrado.");

	const mensaje = String((req.body || {}).mensaje || "").trim();
	if (!mensaje) return error(res, 400, "El mensaje no puede estar vacío.");

	const notificacion = {
		id: Math.max(0, ...datos.notificaciones.map(n => n.id)) + 1,
		empleadoId: ticket.empleadoId,
		ticketId: ticket.id,
		mensaje: mensaje,
		fecha: new Date().toISOString(),
		leida: false
	};

	datos.notificaciones.push(notificacion);
	res.status(201).json(notificacion);
});

// ============================================================
// ENDPOINTS DEL GERENTE DE TI
// ============================================================

app.get("/api/tablero", requiereSesion, requiereRol("gerente"), (req, res) => {
	const activos = datos.tickets.filter(t => t.estado !== "Cerrado");

	res.json({
		resumen: {
			total: datos.tickets.length,
			activos: activos.length,
			cerrados: datos.tickets.length - activos.length,
			sinAsignar: activos.filter(t => t.tecnicoId === null).length
		},
		categorias: datos.categorias
			.map(c => ({ nombre: c.nombre, cantidad: datos.tickets.filter(t => t.categoriaId === c.id).length }))
			.sort((a, b) => b.cantidad - a.cantidad),
		tecnicos: datos.usuarios
			.filter(u => u.rol === "tecnico")
			.map(u => ({ nombre: u.nombre, nivel: u.nivel, activos: activos.filter(t => t.tecnicoId === u.id).length }))
	});
});

app.get("/api/tablero/criticos", requiereSesion, requiereRol("gerente"), (req, res) => {
	const criticos = datos.tickets
		.filter(t => t.estado !== "Cerrado" && t.prioridad === "Alta")
		.map(t => ({
			...formatearTicket(t, req.usuario),
			horasAbierto: Math.floor((Date.now() - new Date(t.fecha)) / 3600000)
		}));

	res.json(criticos);
});

app.get("/api/tablero/confidenciales", requiereSesion, requiereRol("gerente"), (req, res) => {
	res.json(datos.tickets.filter(esConfidencial).map(t => formatearTicket(t, req.usuario)));
});

// Restablece los datos de prueba (útil para la demo)
app.post("/api/reiniciar", requiereSesion, requiereRol("gerente"), (req, res) => {
	reiniciarDatos();
	res.json({ mensaje: "Datos de prueba restablecidos. Vuelva a iniciar sesión." });
});

// ============================================================
// INICIO DEL SERVIDOR
// ============================================================

app.use((req, res) => error(res, 404, "Ruta no encontrada."));

app.listen(PORT, () => {
	console.log(`TechSolve API escuchando en el puerto ${PORT}`);
});
