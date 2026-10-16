import { ArbolService } from './arbol.service';
import { FolderResponse } from '../interfaces/responses/FolderResponse';
import { DocumentResponse } from '../interfaces/responses/DocumentResponse';

function carpeta(id: string, name: string, parentFolderId: string | null, path: string[]): FolderResponse {
  return {
    id, name, parentFolderId, depth: path.length, path, documentCount: 0,
    createdOn: '2026-10-16T00:00:00Z', updatedOn: '2026-10-16T00:00:00Z'
  };
}

function documento(id: string, folderId: string, updatedOn: string): DocumentResponse {
  return { id, folderId, title: id, content: '', priority: 'None', createdOn: updatedOn, updatedOn };
}

describe('ArbolService', () => {
  const service = new ArbolService();

  // Trabajo > Sprints > Arquitectura   |   Personal
  const carpetas = [
    carpeta('sprints', 'Sprints', 'trabajo', ['Trabajo', 'Sprints']),
    carpeta('personal', 'Personal', null, ['Personal']),
    carpeta('arq', 'Arquitectura', 'sprints', ['Trabajo', 'Sprints', 'Arquitectura']),
    carpeta('trabajo', 'Trabajo', null, ['Trabajo'])
  ];

  it('arma el árbol por nombre con los documentos por última edición', () => {
    const docs = [
      documento('viejo', 'sprints', '2026-10-01T00:00:00Z'),
      documento('nuevo', 'sprints', '2026-10-16T00:00:00Z')
    ];
    const arbol = service.construir(carpetas, docs);

    expect(arbol.map(n => n.carpeta.name)).toEqual(['Personal', 'Trabajo']);
    const sprints = arbol[1].hijos[0];
    expect(sprints.carpeta.id).toBe('sprints');
    expect(sprints.hijos[0].carpeta.id).toBe('arq');
    expect(sprints.documentos.map(d => d.id)).toEqual(['nuevo', 'viejo']);
  });

  it('trata como raíz una carpeta cuyo padre no llegó', () => {
    const arbol = service.construir([carpeta('huerfana', 'Huérfana', 'no-existe', ['Huérfana'])], []);
    expect(arbol.length).toBe(1);
  });

  it('calcula subárbol y altura', () => {
    expect([...service.subarbol(carpetas, 'trabajo')].sort()).toEqual(['arq', 'sprints', 'trabajo']);
    expect(service.altura(carpetas, 'trabajo')).toBe(3);
    expect(service.altura(carpetas, 'personal')).toBe(1);
  });

  it('ofrece como padre solo ubicaciones válidas para la profundidad máxima', () => {
    // Carpeta nueva con máximo 3 niveles: no puede ir dentro de Arquitectura (nivel 3)
    const nuevas = service.opcionesDePadre(carpetas, null, 3).map(o => o.id);
    expect(nuevas).toContain(null);
    expect(nuevas).toContain('sprints');
    expect(nuevas).not.toContain('arq');

    // Mover "Trabajo" (3 niveles): nunca dentro de sí misma; con máximo 4 cabe bajo Personal
    const trabajo = carpetas.find(c => c.id === 'trabajo')!;
    const movimientos = service.opcionesDePadre(carpetas, trabajo, 4).map(o => o.id);
    expect(movimientos).toEqual([null, 'personal']);
  });
});
