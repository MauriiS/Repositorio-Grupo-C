\## Nombre del caso de estudio:

Sistema de Soporte Técnico "TechSolve"



\## Nombre del equipo desarrollador:

Grupo C



\## Integrantes:

\- Santino Vignolo

\- Mauricio Sanchez

\- Mariano Desia

\- Lucas Desia

\- Milagros Ibarra

\- Cintia Gomez



\## Descripción del sistema:

TechSolve es una aplicación web desarrollada para la empresa de logística internacional "RutaRápida", cuyo objetivo es automatizar la gestión de incidentes informáticos, el control del inventario de hardware y la administración del soporte a usuarios. 



El sistema permite a los empleados reportar fallas técnicas de manera ágil y sin depender de canales informales como WhatsApp, correo electrónico o el contacto directo con técnicos en pasillos. A través de un módulo de autogestión, el empleado puede cargar tickets de soporte categorizados, hacer seguimiento de su estado y agregar comentarios adicionales. Por su parte, los Técnicos de Soporte pueden visualizar y gestionar los tickets entrantes, mientras que el Gerente de TI cuenta con un tablero de control unificado para el seguimiento de indicadores clave del área.



\## Pantallas desarrolladas:

\## Breve explicación de cada una:



\- \*\*index.html (Inicio):\*\* Página principal del portal, con una bienvenida al usuario y un resumen de los servicios disponibles (solicitar ticket, consultar tickets, ver historial).



\- \*\*solicitar-ticket.html:\*\* Formulario para que el empleado cargue un nuevo ticket de soporte, indicando nombre y apellido, categoría del problema (Falla de Sistema, Acceso a Sistemas, Redes), título y descripción del incidente.



\- \*\*confirmacion.html:\*\* Pantalla de confirmación que se muestra luego de enviar el formulario de solicitud, informando al empleado que el ticket fue registrado exitosamente y que recibirá una notificación cuando sea confirmado.



\- \*\*mis-tickets.html:\*\* Vista donde el empleado puede consultar sus tickets activos en formato de tabla (ID, categoría, prioridad, estado), con la posibilidad de agregar un comentario adicional a un ticket existente.



\- \*\*historial.html:\*\* Listado del historial de tickets ya cerrados, mostrando para cada uno el ID, categoría, descripción, prioridad y estado.



\## Funcionalidades previstas para la siguiente entrega:

\- Implementación de la lógica de autenticación (inicio y cierre de sesión con credenciales corporativas).

\- Conexión del formulario de solicitud de ticket con el backend (Node.js) y persistencia en archivos JSON.

\- Asignación automática de prioridad según palabras clave del título del ticket.

\- Validación de la regla de negocio: máximo 3 tickets abiertos por empleado.

\- Desarrollo del panel del Técnico de Soporte (listado de tickets por urgencia, cambio de estado, envío de notificaciones al empleado).

\- Desarrollo del tablero de control del Gerente de TI (estadísticas, reporte de incidentes críticos, visualización de información confidencial con enmascaramiento por rol).

\- Implementación del Modo Oscuro forzado para la interfaz de técnicos.




\## Hito 3 — Interfaz dinámica y persistencia

El código del Hito 3 es el que hoy está en la carpeta `frontend/` (se mantuvo la estructura del Hito 2 y se agregaron `data/datos.json` y `js/scripts.js`). El prototipo del Hito 2 quedó guardado en `documentacion/hito-2/`.

\*\*Cómo probarlo:\*\* como se usa `fetch()`, hay que abrirlo con un servidor local (por ejemplo la extensión Live Server de VS Code, o `python -m http.server` dentro de `frontend`). Abriendo el HTML con doble clic (`file://`) el navegador bloquea la carga del JSON.

\*\*Usuarios de prueba\*\* (contraseña `1234` para todos):

| Rol | Email |
|---|---|
| Empleado | santino@rutarapida.com / mariano@rutarapida.com |
| Técnico de Soporte | lucas@rutarapida.com (Senior) / milagros@rutarapida.com (Junior) |
| Gerente de TI | mauricio@rutarapida.com / cintia@rutarapida.com |

\*\*Datos modelados en `datos.json`:\*\* usuarios (2 por rol), categorías, equipos homologados, tickets (relacionados con un empleado, un técnico y una categoría, con sus comentarios), notificaciones (relacionadas con un empleado y un ticket), estados, palabras clave para prioridad, palabras confidenciales y el aviso de mantenimiento.

\*\*Funcionalidades implementadas:\*\*

\- \*\*login.html:\*\* inicio de sesión simulado contra los usuarios de `datos.json`; el usuario conectado se guarda en `localStorage`. Cerrar sesión desde la barra de navegación.

\- \*\*Navegación por rol:\*\* cada rol ve sólo sus páginas; si alguien entra por URL a una página sin sesión o sin permiso, se lo redirige.

\- \*\*index.html:\*\* bienvenida con el nombre del usuario, aviso de mantenimiento programado, notificaciones enviadas por los técnicos (empleado), servicios según el rol y categorías cargadas desde el JSON.

\- \*\*solicitar-ticket.html (Empleado):\*\* sigue el caso de uso "Crear Ticket de Soporte" en 3 pasos: elegir la categoría, completar el formulario de esa categoría (en Falla de Hardware se elige el equipo afectado) y ver el comprobante. La prioridad se asigna automáticamente por palabras clave del título y se muestra antes de confirmar. Incluye los flujos alternativos: botón Cancelar (A0), bloqueo con 3 tickets abiertos (A1) e indicador de carga al registrar (A2).

\- \*\*mis-tickets.html (Empleado):\*\* tabla con sus tickets activos y formulario para agregar comentarios (se guardan con fecha).

\- \*\*historial.html (Empleado):\*\* sus tickets cerrados, del más reciente al más antiguo.

\- \*\*panel-tecnico.html (Técnico):\*\* tickets activos ordenados por urgencia, cambio de estado, envío de notificaciones al empleado, lista de equipos y software homologado, modo oscuro con fuente monoespaciada y enmascaramiento de tickets confidenciales ("Recibo de Sueldo" / "Liquidación").

\- \*\*tablero.html (Gerente de TI):\*\* indicadores generales, categorías por frecuencia, carga por técnico, incidentes críticos (prioridad Alta), información confidencial visible y botón para restablecer los datos de prueba.

Todos los cambios (tickets nuevos, comentarios, estados, notificaciones) se guardan en `localStorage` y se ven reflejados en las demás vistas: por ejemplo, un ticket creado por un empleado aparece en "Mis Tickets", en el panel del técnico y en el tablero del gerente.

\*\*Diseño:\*\* tema oscuro para todo el portal, adaptado a celulares. Para los técnicos se fuerza un modo oscuro tipo consola con fuente monoespaciada (RNF 4). No se usan frameworks ni librerías externas.



\## Hito Final — MVP con backend

\### Sistema publicado

\- \*\*Frontend:\*\* _(completar con la URL del Static Site de Render)_

\- \*\*API:\*\* _(completar con la URL del Web Service de Render)_

Usuarios de prueba: los de la tabla del Hito 3, todos con contraseña `1234`. El backend gratis de Render se duerme si no se usa: el primer ingreso puede tardar hasta un minuto.

\### Estructura del proyecto

```
Repositorio-Grupo-C/
├── backend/          API REST (Node.js + Express)
│   ├── index.js
│   ├── data/datos.json   datos iniciales que se cargan en memoria
│   ├── package.json
│   └── package-lock.json
├── frontend/         sitio estático (HTML, CSS y JavaScript)
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── assets/
├── documentacion/    relevamiento, anotaciones, prototipo del Hito 2 y archivos de los integrantes
├── render.yaml       configuración para publicar en Render
└── README.md
```

\### Cómo ejecutar el backend

Requiere Node.js 18 o superior.

```
cd backend
npm install
npm start
```

La API queda disponible en `http://localhost:3000`. Los datos se guardan en memoria: se cargan desde `backend/data/datos.json` al iniciar y se pierden cuando el servidor se reinicia.

\### Cómo ejecutar el frontend

Con el backend andando, abrir la carpeta `frontend/` con un servidor local (por ejemplo Live Server de VS Code, o `python -m http.server` dentro de `frontend`). La URL del backend se configura en `frontend/js/config.js`.

El frontend ya no guarda datos del negocio: todo se pide a la API con `fetch()`. En `localStorage` sólo queda la sesión (token y usuario conectado).

\### Autenticación

`POST /api/login` devuelve un `token`. El resto de los endpoints que requieren sesión lo reciben en el encabezado `Authorization: Bearer <token>`. Cada endpoint valida el rol del usuario (empleado, técnico o gerente) y responde `401` sin sesión o `403` sin permisos.

\### Endpoints de la API

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/` | — | Estado del servicio |
| POST | `/api/login` | — | Inicia sesión con `email` y `password`; devuelve token y usuario |
| POST | `/api/logout` | Todos | Cierra la sesión |
| GET | `/api/usuarios-demo` | — | Usuarios de prueba (email y rol, sin contraseñas) |
| GET | `/api/categorias` | — | Categorías de soporte |
| GET | `/api/aviso-mantenimiento` | — | Aviso de mantenimiento vigente |
| GET | `/api/equipos?tipo=` | Todos | Equipos y software homologados |
| GET | `/api/estados` | Todos | Estados posibles de un ticket |
| GET | `/api/prioridad?titulo=` | Todos | Prioridad que se asignaría a un título |
| POST | `/api/tickets` | Empleado | Crea un ticket (`categoriaId`, `titulo`, `descripcion`, `equipoId`) |
| GET | `/api/mis-tickets?estado=activos\|cerrados` | Empleado | Tickets del empleado conectado |
| GET | `/api/tickets/:id` | Todos | Detalle de un ticket (el empleado sólo ve los suyos) |
| POST | `/api/tickets/:id/comentarios` | Empleado | Agrega un comentario (`texto`) |
| GET | `/api/notificaciones` | Empleado | Notificaciones no leídas |
| PATCH | `/api/notificaciones/:id` | Empleado | Marca una notificación como leída (`leida`) |
| GET | `/api/tickets?filtro=mios\|todos` | Técnico | Tickets activos ordenados por urgencia |
| PATCH | `/api/tickets/:id/estado` | Técnico | Cambia el estado (`estado`) y asigna el ticket si no tenía técnico |
| POST | `/api/tickets/:id/notificaciones` | Técnico | Envía una notificación al empleado (`mensaje`) |
| GET | `/api/tablero` | Gerente | Indicadores, categorías por frecuencia y carga por técnico |
| GET | `/api/tablero/criticos` | Gerente | Tickets activos de prioridad Alta |
| GET | `/api/tablero/confidenciales` | Gerente | Tickets con información confidencial |
| POST | `/api/reiniciar` | Gerente | Restablece los datos de prueba |

\### Reglas de negocio implementadas en el backend

\- \*\*Máximo 3 tickets abiertos por empleado:\*\* si ya tiene 3 en estado "Abierto", `POST /api/tickets` responde `409` y no crea el ticket.

\- \*\*Prioridad automática:\*\* el backend asigna Alta, Media o Baja según las palabras clave del título; el frontend no puede elegirla.

\- \*\*Información confidencial:\*\* los tickets que mencionan "recibo de sueldo" o "liquidación" se envían enmascarados a los técnicos y completos al gerente.

\- \*\*Comentarios sólo en tickets activos:\*\* se aceptan en estado "Abierto", "Asignado" o "En Progreso".

\- \*\*Equipo obligatorio en fallas de hardware:\*\* la categoría "Falla de Hardware" exige indicar un equipo homologado.

\### Publicación en Render

El repo tiene un `render.yaml` que crea los dos servicios. Opción rápida: en Render, \*\*New → Blueprint\*\*, elegir este repositorio y confirmar.

Para crearlos a mano:

1. \*\*Backend (Web Service):\*\* New → Web Service → este repo. Root Directory: `backend`. Build Command: `npm install`. Start Command: `npm start`. Plan: Free.

2. \*\*Frontend (Static Site):\*\* New → Static Site → este repo. Root Directory: `frontend`. Build Command: vacío. Publish Directory: `.`

3. Copiar la URL que Render le da al backend y ponerla en `API_PRODUCCION` dentro de `frontend/js/config.js` (si no es `https://techsolve-api.onrender.com`). Al hacer push, Render vuelve a publicar el frontend solo.

4. Opcional: en el backend, agregar la variable de entorno `CORS_ORIGIN` con la URL del frontend para que la API sólo acepte pedidos desde ahí.

5. Completar los links de \*\*Sistema publicado\*\* en este README.

Los datos están en memoria: cada vez que Render reinicia o duerme el backend, vuelven a los datos de prueba de `backend/data/datos.json`.
