import { markdownAHtml, tituloDeMarkdown } from './markdown';
import { VistaPreviaService } from './vista-previa.service';
import { DocumentResponse } from '../interfaces/responses/DocumentResponse';

describe('markdown', () => {
  it('convierte títulos, énfasis, listas, código y tablas (GFM)', () => {
    const html = markdownAHtml('# Guía\n\nTexto **fuerte** y _suave_.\n\n- uno\n- dos\n\n```ts\nconst x = 1;\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |');

    expect(html).toContain('<h1>Guía</h1>');
    expect(html).toContain('<strong>fuerte</strong>');
    expect(html).toContain('<em>suave</em>');
    expect(html).toContain('<li>uno</li>');
    expect(html).toContain('<pre><code class="language-ts">const x = 1;');
    expect(html).toContain('<table>');
  });

  it('dibuja las tareas con un carácter en vez de una casilla', () => {
    const html = markdownAHtml('- [x] hecho\n- [ ] pendiente');

    expect(html).toContain('☑ hecho');
    expect(html).toContain('☐ pendiente');
    expect(html).not.toContain('<input');
  });

  it('devuelve vacío para un Markdown vacío', () => {
    expect(markdownAHtml('   ')).toBe('');
    expect(markdownAHtml(null)).toBe('');
  });

  it('toma el primer título de nivel 1 como título del documento', () => {
    expect(tituloDeMarkdown('Intro\n\n# Manual de despliegue #\n\n## Pasos')).toBe('Manual de despliegue');
    expect(tituloDeMarkdown('## Solo subtítulos')).toBeNull();
  });

  it('las vistas previas y la búsqueda leen el texto, no la sintaxis', () => {
    const vistaPrevia = new VistaPreviaService();
    const documento: DocumentResponse = {
      id: 'md', folderId: 'f', title: 'Guía', content: '# Despliegue\n\nUsa **Render** y [la guía](https://x.cl).',
      priority: 'None', type: 'Markdown', createdOn: '2026-10-28T00:00:00Z', updatedOn: '2026-10-28T00:00:00Z'
    };

    expect(vistaPrevia.vistaPrevia(documento.content, 160, 'Markdown')).toBe('Despliegue Usa Render y la guía.');
    expect(vistaPrevia.buscar([documento], 'render guia', () => []).length).toBe(1);
    expect(vistaPrevia.buscar([documento], 'https', () => []).length).toBe(0);
  });
});
