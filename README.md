# personal-notes.front

Gestor de notas y documentación personal con experiencia híbrida entre un IDE (árbol de carpetas lateral)
y Confluence (editor enriquecido, prioridades y publicación). Angular 17 (standalone, signals, OnPush) +
Tailwind CSS. Consume la API de `personal-notes.service`, que también integra el asistente con Google Gemini.

## Ejecutar

Requiere la API corriendo (por defecto en `http://localhost:5080`, ver `personal-notes.service`).

```bash
npm install
npm start          # http://localhost:4200
npm run build      # dist/personal-notes/browser
npm test           # o: npx ng test --watch=false --browsers=ChromeHeadless
```

La URL de la API depende del entorno (`fileReplacements` en `angular.json`):

| Archivo | Se usa en | URL |
|---|---|---|
| `src/environments/environment.development.ts` | `npm start` / `ng serve` | `http://localhost:5080/` |
| `src/environments/environment.ts` | `npm run build` (producción) | `https://personal-notes-service.onrender.com/` |

La API debe tener el origen del front en `Cors:AllowedOrigins`.

## Pantallas

- **Inicio / Dashboard**: tarjetas con el total de notas, editadas en las últimas 24 h, prioridad alta y
  media/baja (las calcula la API), los **últimos 5 documentos editados** (título, carpeta de origen y fecha)
  y las carpetas principales.
- **Explorador lateral**: árbol de carpetas y documentos (hasta 5 niveles). En el teléfono se oculta a la
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
  **"Preguntar sobre este documento"** adjunta automáticamente el texto del documento activo (aunque sea un
  borrador sin publicar) como contexto de cada pregunta; mientras responde se muestra "Pensando...". Si el
  servidor no tiene clave, el panel lo indica (`GET /api/v1/assistant/status`).
- **Respaldos**: *Exportar Respaldo* descarga un `.json` con todas las carpetas y documentos;
  *Importar Respaldo* lo sube a la API (que reemplaza todo) y vuelve a poblar la copia en `localStorage`.

## Persistencia local

La API es la fuente de verdad. Además, el front guarda en `localStorage` (prefijo `personal-notes:`):

| Clave | Contenido |
|---|---|
| `cache` | Copia de carpetas, documentos y estadísticas: la app abre al instante y funciona en modo lectura sin conexión |
| `borradores` | Cambios del editor sin publicar, guardados en cada tecla; se restauran al volver a abrir el documento |
| `sesion` | Vista abierta (inicio, carpeta o documento) para restaurarla al recargar |
| `expandidas` | Carpetas desplegadas en el árbol |

El indicador del header muestra *Guardado*, *Borrador local* (cambios sin publicar), *Publicando…* o
*Sin conexión*. Si un borrador se editó sobre una versión que ya cambió en la API, se descarta.

## Estructura

```
src/app
├── core
│   ├── http/          Un servicio por recurso de la API (folders, documents, dashboard, backup,
│   │                  assistant). Todos async con lastValueFrom.
│   ├── interceptors/  authInterceptor (Bearer token)
│   ├── interfaces/    requests/ y responses/ (contratos de la API) + tipos de UI (Notas, Asistente…)
│   ├── pipes/         fechaRelativa, fechaHora, etiquetaPrioridad
│   ├── state/         NotasStore (carpetas, documentos, navegación, borradores, respaldos) y
│   │                  AsistenteStore (chat con el asistente vía API)
│   └── utils/         Errores de la API, toast, confirmación, almacenamiento local, imágenes Base64,
│                      vistas previas/búsqueda (VistaPreviaService) y árbol (ArbolService)
├── modulos
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
que compila con `npm ci && npm run build`, publica `dist/personal-notes/browser` (con `NODE_VERSION=20`)
y redirige todas las rutas a `index.html`.

Si Render asigna a la API una URL distinta de `personal-notes-service.onrender.com` (por ejemplo, porque
el nombre ya estaba tomado), actualiza `src/environments/environment.ts` y haz push.
