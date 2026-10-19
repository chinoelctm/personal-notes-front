# personal-notes.front

Gestor de notas y documentación personal con experiencia híbrida entre un IDE (árbol de carpetas lateral)
y Confluence (editor enriquecido, prioridades y publicación). Angular 17 (standalone, signals, OnPush) +
Tailwind CSS. Consume la API de `personal-notes.service` (que también integra el asistente con Google Gemini) y
inicia sesión con `personal-notes-auth-services`.

## Ejecutar

Requiere las dos APIs corriendo: `personal-notes.service` en `http://localhost:5080` y
`personal-notes-auth-services` en `http://localhost:5090`.

```bash
npm install
npm start          # http://localhost:4200
npm run build      # dist/personal-notes/browser
npm test           # o: npx ng test --watch=false --browsers=ChromeHeadless
```

El front llama a las APIs **por su mismo origen** (`/api/...`), nunca a otro dominio: así las cookies de sesión
son del propio sitio y no hace falta CORS. Quién reenvía cada ruta:

| Ruta | Desarrollo (`proxy.conf.json` de `ng serve`) | Producción (rewrites de `render.yaml`) |
|---|---|---|
| `/api/v1/auth/*` | `http://localhost:5090` | `https://personal-notes-auth-services.onrender.com` |
| `/api/*` (el resto) | `http://localhost:5080` | `https://personal-notes-service-hgni.onrender.com` |

## Pantallas

- **Login**: usuario y contraseña. Sin sesión, cualquier ruta lleva a `/login`; con sesión, `/login` lleva a
  las notas. Si la sesión expira se vuelve aquí con un aviso, y los borradores siguen guardados. Si el servidor
  de Render estaba dormido, avisa que el primer ingreso puede tardar hasta un minuto.
- **Inicio / Dashboard**: tarjetas con el total de notas, editadas en las últimas 24 h, prioridad alta y
  media/baja (las calcula la API), los **últimos 5 documentos editados** (título, carpeta de origen y fecha)
  y las carpetas principales.
- **Explorador lateral**: árbol de carpetas y documentos (hasta 5 niveles); claro u oscuro según el tema del sistema, como el resto de la app. En el teléfono se oculta a la
  izquierda y se abre con el botón hamburguesa; cada carpeta tiene un menú "⋯" con sus acciones.
- **Directorio**: documentos de la carpeta en una cuadrícula responsiva (1/2/3 columnas), ordenados por
  última edición, con vista previa, fechas, banderita de prioridad y filtros por prioridad.
- **Editor**: hoja central con título, ubicación, negrita/cursiva/subrayado, títulos, listas, citas,
  **tablas dinámicas** (insertar, agregar fila o columna; desplazables en horizontal en el teléfono),
  **bloques de código** (fondo oscuro, monoespaciado) e **imágenes** por selector, arrastrar y soltar o
  pegar (se incrustan en Base64, máx. 2 MB c/u, `max-width: 100%`). Botón **Publicar** (o Ctrl+S).
- **Buscador global**: filtra en títulos y contenido de todas las notas a la vez, sin distinguir
  mayúsculas ni tildes, resalta las coincidencias y muestra la ruta de la carpeta de origen.
- **Asistente IA (Google Gemini)**: panel lateral colapsable que consulta `POST /api/v1/assistant/ask`. La
  integración con Gemini y su API Key viven en el backend (`Gemini:ApiKey`): la clave nunca llega al navegador.
  Con **"Buscar en todas mis notas"** (activado por defecto) la IA conoce todos tus documentos: responde
  preguntas sobre ellos y muestra las **fuentes** (los documentos usados), que se abren con un clic.
  **"Preguntar sobre este documento"** adjunta automáticamente el texto del documento activo (aunque sea un
  borrador sin publicar) como contexto de cada pregunta; mientras responde se muestra "Pensando...". Si el
  servidor no tiene clave, el panel lo indica (`GET /api/v1/assistant/status`).
- **Páginas HTML**: además de notas, una carpeta puede tener páginas HTML propias (botón *Página HTML* en el
  directorio, el ícono `</>` del explorador o el menú "⋯"). El editor muestra el código, la vista previa o ambos
  (dividido, en pantallas anchas); *Cargar .html* (o arrastrar el archivo) llena el código y toma el `<title>` como
  título. La vista previa es un iframe con `sandbox="allow-scripts"` y **sin** `allow-same-origin`: el JavaScript de
  la página corre, pero en un origen aislado que no puede leer las notas, el `localStorage` ni llamar a la API.
  Las páginas de más de 300.000 caracteres no se guardan en la copia local (no caben en `localStorage`); llegan
  siempre desde la API. Límite de archivo: 10 MB (`TamanoMaximoHtmlMb` en `config.json`).
- **Eliminar**: borrar un documento o una carpeta es **permanente** (la API hace borrado físico; una carpeta
  se lleva sus subcarpetas y documentos). Antes, un popup pide confirmación y detalla qué se va a borrar.
- **Cerrar sesión** (*Salir*, en el header): revoca la sesión en la API y borra de este navegador la copia local,
  los borradores y la vista abierta. Pide confirmación (y advierte si hay cambios sin publicar).
- **Respaldos**: *Exportar Respaldo* descarga un `.json` con todas las carpetas y documentos;
  *Importar Respaldo* lo sube a la API (que reemplaza todo) y vuelve a poblar la copia en `localStorage`.

## Sesión

`personal-notes-auth-services` deja la sesión en dos cookies **HttpOnly**: `auth_token` (JWT, 15 min) y
`refresh_token` (7 días, solo viaja a `/api/v1/auth`). El JavaScript del front nunca ve los tokens; solo sabe
quién es el usuario por `GET /api/v1/auth/me` (`SesionStore`).

- `sesionGuard` / `anonimoGuard` (`core/guards`): al abrir la app consultan `/me` una vez; si el access token
  venció, renuevan con `/refresh` antes de decidir.
- `authInterceptor`: si la API de notas responde 401, renueva la sesión con `/refresh` y reintenta la llamada
  una vez. Varias llamadas con 401 a la vez comparten un solo refresh. Si no se puede renovar (refresh vencido o
  revocado), manda al login. Antes de rendirse consulta `/me`, por si otra pestaña acababa de rotar las cookies.

## Persistencia local

La API es la fuente de verdad. Además, el front guarda en `localStorage` (prefijo `personal-notes:`):

| Clave | Contenido |
|---|---|
| `cache` | Copia de carpetas, documentos y estadísticas: la app abre al instante y funciona en modo lectura sin conexión |
| `borradores` | Cambios del editor sin publicar, guardados en cada tecla; se restauran al volver a abrir el documento |
| `sesion` | Vista abierta (inicio, carpeta o documento) para restaurarla al recargar |
| `expandidas` | Carpetas desplegadas en el árbol |

Todas se borran al cerrar sesión.

El indicador del header muestra *Guardado*, *Borrador local* (cambios sin publicar), *Publicando…* o
*Sin conexión*. Si un borrador se editó sobre una versión que ya cambió en la API, se descarta.

## Estructura

```
src/app
├── core
│   ├── http/          Un servicio por recurso de la API (folders, documents, dashboard, backup,
│   │                  assistant). Todos async con lastValueFrom.
│   ├── guards/        sesionGuard y anonimoGuard (login)
│   ├── interceptors/  authInterceptor (401 → refresh de la sesión → reintento)
│   ├── interfaces/    requests/ y responses/ (contratos de la API) + tipos de UI (Notas, Asistente…)
│   ├── pipes/         fechaRelativa, fechaHora, etiquetaPrioridad
│   ├── state/         NotasStore (carpetas, documentos, navegación, borradores, respaldos),
│   │                  AsistenteStore (chat con el asistente vía API) y SesionStore (login, refresh, logout)
│   └── utils/         Errores de la API, toast, confirmación, almacenamiento local, imágenes Base64,
│                      vistas previas/búsqueda (VistaPreviaService) y árbol (ArbolService)
├── modulos
│   ├── login/         Pantalla de inicio de sesión
│   └── notas/         Página principal + componentes (árbol, inicio, directorio, tarjeta, editor,
│                      resultados de búsqueda, modales, panel del asistente)
└── shared/            header, toast, confirm-dialog, icono (Lucide), insignia-prioridad
```

## Qué calcula cada lado

La API calcula las estadísticas del inicio, el nivel y la ruta de cada carpeta, valida la profundidad del
árbol y asigna las fechas de auditoría en UTC. El front calcula solo presentación: las vistas previas de las
tarjetas, el orden de los últimos 5 editados y del directorio, el árbol a partir de la lista plana, las
coincidencias del buscador y qué ubicaciones ofrecer al crear o mover una carpeta.

## Accesibilidad táctil

En pantallas de teléfono (`< 768px`) todo botón, enlace, selector o etiqueta interactiva mide al menos
44×44 px (regla global en `styles.scss`), y las acciones que en escritorio aparecen al pasar el mouse se
muestran siempre. El tema claro/oscuro sigue al sistema (`darkMode: 'media'`).

## Despliegue (Render, gratis)

El repo incluye `render.yaml`: en Render, **New → Blueprint** y elegir este repo. Crea un Static Site
que compila con `npm ci && npm run build`, publica `dist/personal-notes/browser` (con `NODE_VERSION=20`) y
define, en este orden, los rewrites `/api/v1/auth/*` → servicio de auth, `/api/*` → API de notas y `/*` →
`index.html`.

Si Render asigna a una API una URL distinta de la del `render.yaml` (por ejemplo, porque el nombre ya estaba
tomado), actualiza el rewrite correspondiente y haz push. Los rewrites también se pueden revisar en el dashboard
del static site (*Redirects/Rewrites*).
