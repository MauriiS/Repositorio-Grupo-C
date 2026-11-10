// Dirección del backend (API).
// En la compu usamos el server local; cuando esté publicado va la URL de Render.
const API_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
	? "http://localhost:3000"
	: "http://localhost:3000";
