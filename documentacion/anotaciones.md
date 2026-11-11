# Anotaciones del MVP — TechSolve (Grupo C)

## Arquitectura

```
Navegador ──(HTTP + JSON)──> Frontend (Static Site en Render)
     │                         HTML, CSS y JavaScript sin frameworks
     │
     └──── fetch() ──────────> Backend (Web Service en Render)
                               Node.js + Express
                               Datos en memoria (arrays y objetos)
```

- El **frontend** sólo muestra datos y manda formularios. Cada página llama a la API con `fetch()` (función `api()` en `frontend/js/scripts.js`).
- El **backend** (`backend/index.js`) guarda los datos, valida los permisos de cada rol y aplica las reglas de negocio.
- **Sesión:** `POST /api/login` devuelve un token. El frontend lo guarda en `localStorage` y lo manda en cada pedido en el encabezado `Authorization`.
- **Datos:** al arrancar, el backend copia `backend/data/datos.json` a memoria. Si el server se reinicia, se vuelve a los datos de prueba.

## Caso de uso de la demo: Crear y resolver un ticket

1. **Empleado** (santino@rutarapida.com): crea un ticket de "Falla de Hardware" con el título "La PC no enciende". El backend le asigna prioridad **Alta** y devuelve el comprobante con el número de seguimiento.
2. **Técnico** (lucas@rutarapida.com): ve el ticket arriba de todo en el panel (ordenado por urgencia), lo pasa a **En Progreso** y le manda una notificación al empleado.
3. **Empleado:** al entrar ve la notificación del técnico y el nuevo estado en "Mis tickets". Agrega un comentario.
4. **Gerente** (mauricio@rutarapida.com): en el tablero ve el ticket entre los incidentes críticos y la carga de trabajo del técnico.

Reglas para mostrar en la demo:

- Con 3 tickets abiertos, el empleado no puede crear otro (el backend responde 409).
- El ticket de "recibo de sueldo" aparece tapado para el técnico y completo para el gerente.

Si algo quedó desordenado antes de presentar: entrar como gerente y tocar "Restablecer datos de prueba".

## Reglas de negocio en el backend

| Regla | Dónde se valida |
|---|---|
| Máximo 3 tickets abiertos por empleado | `POST /api/tickets` |
| Prioridad automática según el título | `POST /api/tickets` y `GET /api/prioridad` |
| Información confidencial enmascarada para técnicos | Todas las respuestas con tickets |
| Comentarios sólo en tickets activos | `POST /api/tickets/:id/comentarios` |
| Equipo obligatorio en fallas de hardware | `POST /api/tickets` |
| Cada endpoint sólo para su rol | `requiereSesion` y `requiereRol` |

## Limitaciones actuales

- Los datos se pierden cuando el servidor se reinicia (no hay base de datos, como pide la consigna).
- Las contraseñas están en texto plano en el backend y todos los usuarios de prueba usan `1234`.
- Las sesiones también están en memoria: si el server se reinicia hay que volver a iniciar sesión.
- En Render gratis el backend se duerme y el primer pedido tarda hasta un minuto.

## Posibles mejoras

- Base de datos para guardar los datos de forma permanente.
- Contraseñas encriptadas y sesiones con vencimiento (por ejemplo, JWT).
- Notificaciones en tiempo real para el técnico cuando entra un ticket nuevo.
- Reportes del gerente filtrando por fechas, áreas y usuarios.
- Registrar el historial de cambios de estado de cada ticket.
