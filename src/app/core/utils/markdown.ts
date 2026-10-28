import { Marked } from 'marked';

// GitHub Flavored Markdown: tablas, listas de tareas, ~~tachado~~ y enlaces automáticos
const parser = new Marked({ gfm: true, breaks: false, async: false });

// Las tareas "- [ ]" se dibujan con un carácter: el saneamiento de Angular quita los <input> de casilla
parser.use({
  renderer: {
    checkbox({ checked }) {
      return checked ? '☑ ' : '☐ ';
    }
  }
});

/**
 * Convierte Markdown en HTML para mostrarlo como documento. El resultado se muestra con [innerHTML], que pasa
 * por el saneamiento de Angular: el HTML que traiga el Markdown (scripts, onerror…) no se ejecuta.
 */
export function markdownAHtml(markdown: string | null | undefined): string {
  if (!markdown?.trim()) return '';
  return parser.parse(markdown) as string;
}

/** El primer título "# …" del Markdown, para usarlo como título del documento al cargar un .md. */
export function tituloDeMarkdown(markdown: string): string | null {
  return markdown.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1]?.trim() || null;
}
