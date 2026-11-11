// Dirección del backend (API).
// En la compu usamos el server local; publicado, la URL que nos da Render.
// Si Render le asigna otra URL al backend, hay que cambiarla acá.
const API_PRODUCCION = "https://techsolve-api-as02.onrender.com";

const API_URL = ["localhost", "127.0.0.1"].includes(window.location.hostname)
	? "http://localhost:3000"
	: API_PRODUCCION;
