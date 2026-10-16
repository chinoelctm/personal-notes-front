import { VistaPreviaService } from './vista-previa.service';
import { DocumentResponse, Priority } from '../interfaces/responses/DocumentResponse';

function documento(id: string, title: string, content: string, updatedOn: string, priority: Priority = 'None'): DocumentResponse {
  return { id, folderId: 'f1', title, content, priority, createdOn: updatedOn, updatedOn };
}

describe('VistaPreviaService', () => {
  const service = new VistaPreviaService();

  it('extrae el texto visible del HTML sin pegar párrafos ni incluir imágenes', () => {
    const html = '<h2>Entregables</h2><p>Revisión &amp; pruebas</p><img src="data:image/png;base64,AAAA"><ul><li>Uno</li><li>Dos</li></ul>';
    expect(service.textoPlano(html)).toBe('Entregables Revisión & pruebas Uno Dos');
    expect(service.textoPlano('')).toBe('');
  });

  it('recorta la vista previa en una palabra completa', () => {
    const html = '<p>Arquitectura de autenticación con tokens de acceso y rotación</p>';
    expect(service.vistaPrevia(html, 200)).toBe('Arquitectura de autenticación con tokens de acceso y rotación');
    expect(service.vistaPrevia(html, 30)).toBe('Arquitectura de autenticación…');
  });

  it('ordena por última edición y toma los últimos N', () => {
    const docs = [
      documento('a', 'Antiguo', '', '2026-10-01T10:00:00Z'),
      documento('b', 'Reciente', '', '2026-10-16T10:00:00Z'),
      documento('c', 'Medio', '', '2026-10-10T10:00:00Z')
    ];
    expect(service.ordenarPorEdicion(docs).map(d => d.id)).toEqual(['b', 'c', 'a']);
    expect(service.ultimosEditados(docs, 2).map(d => d.id)).toEqual(['b', 'c']);
    // No modifica la lista original
    expect(docs.map(d => d.id)).toEqual(['a', 'b', 'c']);
  });

  it('busca en título y contenido sin distinguir tildes ni mayúsculas, títulos primero', () => {
    const docs = [
      documento('1', 'Plan de lanzamiento', '<p>Revisión de la API de autenticación</p>', '2026-10-16T10:00:00Z'),
      documento('2', 'Diseño de Autenticación JWT', '<p>Tokens</p>', '2026-10-01T10:00:00Z'),
      documento('3', 'Ideas', '<p>Nada que ver</p>', '2026-10-15T10:00:00Z')
    ];
    const resultados = service.buscar(docs, 'AUTENTICACION', () => ['Raíz', 'Trabajo']);

    expect(resultados.map(r => r.documento.id)).toEqual(['2', '1']);
    expect(resultados[0].enTitulo).toBeTrue();
    expect(resultados[1].enContenido).toBeTrue();
    expect(resultados[1].fragmento).toContain('autenticación');
    expect(resultados[1].ruta).toEqual(['Raíz', 'Trabajo']);
  });

  it('exige que todas las palabras aparezcan (en el título o en el contenido)', () => {
    const docs = [documento('1', 'Sprint 28', '<p>Pruebas de carga en AWS</p>', '2026-10-16T10:00:00Z')];
    expect(service.buscar(docs, 'sprint aws', () => []).length).toBe(1);
    expect(service.buscar(docs, 'sprint azure', () => []).length).toBe(0);
    expect(service.buscar(docs, '   ', () => []).length).toBe(0);
  });

  it('parte el texto en segmentos resaltados respetando las tildes originales', () => {
    expect(service.segmentos('Diseño de Autenticación', 'autenticacion')).toEqual([
      { texto: 'Diseño de ', resaltado: false },
      { texto: 'Autenticación', resaltado: true }
    ]);
  });
});
