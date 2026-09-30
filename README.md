\## Nombre del caso de estudio:

Sistema de Soporte Técnico "TechSolve"



\## Nombre del equipo desarrollador:

Grupo C



\## Integrantes:

\- Santino Vignolo

\- Mauricio Sanchez

\- Martina Orzusa

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

El código del Hito 3 está en la carpeta `Grupo-C-Hito-3/` (se mantiene la misma estructura del Hito 2 y se agregan `data/datos.json` y `js/scripts.js`). La carpeta `Grupo-C-Hito-2/` queda tal cual se entregó.

\*\*Cómo probarlo:\*\* como se usa `fetch()`, hay que abrirlo con un servidor local (por ejemplo la extensión Live Server de VS Code, o `python -m http.server` dentro de `Grupo-C-Hito-3`). Abriendo el HTML con doble clic (`file://`) el navegador bloquea la carga del JSON.

\*\*Usuarios de prueba\*\* (contraseña `1234` para todos):

| Rol | Email |
|---|---|
| Empleado | santino@rutarapida.com / martina@rutarapida.com |
| Técnico de Soporte | lucas@rutarapida.com (Senior) / milagros@rutarapida.com (Junior) |
| Gerente de TI | mauricio@rutarapida.com / cintia@rutarapida.com |

\*\*Datos modelados en `datos.json`:\*\* usuarios (2 por rol), categorías, tickets (relacionados con un empleado, un técnico y una categoría, con sus comentarios), notificaciones (relacionadas con un empleado y un ticket), estados, palabras clave para prioridad, palabras confidenciales y el aviso de mantenimiento.

\*\*Funcionalidades implementadas:\*\*

\- \*\*login.html:\*\* inicio de sesión simulado contra los usuarios de `datos.json`; el usuario conectado se guarda en `localStorage`. Cerrar sesión desde la barra de navegación.

\- \*\*Navegación por rol:\*\* cada rol ve sólo sus páginas; si alguien entra por URL a una página sin sesión o sin permiso, se lo redirige.

\- \*\*index.html:\*\* bienvenida con el nombre del usuario, aviso de mantenimiento programado, notificaciones enviadas por los técnicos (empleado), servicios según el rol y categorías cargadas desde el JSON.

\- \*\*solicitar-ticket.html (Empleado):\*\* categorías desde el JSON, prioridad asignada automáticamente por palabras clave del título, límite de 3 tickets abiertos, guarda el ticket en `localStorage` y redirige a la confirmación con el número de seguimiento.

\- \*\*mis-tickets.html (Empleado):\*\* tabla con sus tickets activos y formulario para agregar comentarios (se guardan con fecha).

\- \*\*historial.html (Empleado):\*\* sus tickets cerrados, del más reciente al más antiguo.

\- \*\*panel-tecnico.html (Técnico):\*\* tickets activos ordenados por urgencia, cambio de estado, envío de notificaciones al empleado, modo oscuro con fuente monoespaciada y enmascaramiento de tickets confidenciales ("Recibo de Sueldo" / "Liquidación").

\- \*\*tablero.html (Gerente de TI):\*\* indicadores generales, categorías por frecuencia, carga por técnico, incidentes críticos (prioridad Alta), información confidencial visible y botón para restablecer los datos de prueba.

Todos los cambios (tickets nuevos, comentarios, estados, notificaciones) se guardan en `localStorage` y se ven reflejados en las demás vistas: por ejemplo, un ticket creado por un empleado aparece en "Mis Tickets", en el panel del técnico y en el tablero del gerente.
