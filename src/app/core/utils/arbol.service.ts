import { Injectable } from '@angular/core';
import { FolderResponse } from '../interfaces/responses/FolderResponse';
import { DocumentResponse } from '../interfaces/responses/DocumentResponse';
import { NodoCarpeta } from '../interfaces/Notas';

export interface OpcionCarpeta {
    id:       string | null;
    etiqueta: string;
    nivel:    number;
}

/**
 * Arma el árbol lateral a partir de la lista plana de la API y calcula la vista previa de qué
 * ubicaciones admite una carpeta en el modal. La API valida de nuevo la profundidad y los ciclos.
 */
@Injectable({
  providedIn: 'root'
})
export class ArbolService {

  /** Raíces y subcarpetas por nombre; documentos de cada carpeta por última edición. */
  construir(carpetas: FolderResponse[], documentos: DocumentResponse[]): NodoCarpeta[] {
    const ids = new Set(carpetas.map(c => c.id));
    const porCarpeta = new Map<string, DocumentResponse[]>();
    for (const documento of documentos) {
      const lista = porCarpeta.get(documento.folderId) ?? [];
      lista.push(documento);
      porCarpeta.set(documento.folderId, lista);
    }

    const hijosDe = new Map<string | null, FolderResponse[]>();
    for (const carpeta of carpetas) {
      const padre = carpeta.parentFolderId && ids.has(carpeta.parentFolderId) ? carpeta.parentFolderId : null;
      const lista = hijosDe.get(padre) ?? [];
      lista.push(carpeta);
      hijosDe.set(padre, lista);
    }

    // Un ciclo en los datos no debe colgar el árbol: cada carpeta se arma una sola vez
    const visitadas = new Set<string>();
    const armar = (padre: string | null): NodoCarpeta[] =>
      [...(hijosDe.get(padre) ?? [])]
        .filter(c => {
          if (visitadas.has(c.id)) return false;
          visitadas.add(c.id);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
        .map(carpeta => ({
          carpeta,
          hijos: armar(carpeta.id),
          documentos: [...(porCarpeta.get(carpeta.id) ?? [])]
            .sort((a, b) => Date.parse(b.updatedOn) - Date.parse(a.updatedOn))
        }));

    return armar(null);
  }

  /** La carpeta y todas sus subcarpetas. */
  subarbol(carpetas: FolderResponse[], id: string): Set<string> {
    const resultado = new Set<string>([id]);
    let agregadas = true;
    while (agregadas) {
      agregadas = false;
      for (const carpeta of carpetas) {
        if (carpeta.parentFolderId && resultado.has(carpeta.parentFolderId) && !resultado.has(carpeta.id)) {
          resultado.add(carpeta.id);
          agregadas = true;
        }
      }
    }
    return resultado;
  }

  /** Niveles que ocupa la carpeta con sus subcarpetas (1 si no tiene). */
  altura(carpetas: FolderResponse[], id: string): number {
    const subarbol = this.subarbol(carpetas, id);
    const base = carpetas.find(c => c.id === id)?.depth ?? 1;
    const masProfunda = Math.max(...carpetas.filter(c => subarbol.has(c.id)).map(c => c.depth), base);
    return masProfunda - base + 1;
  }

  /**
   * Ubicaciones válidas para una carpeta nueva (editada = null) o movida: la raíz y
   * cada carpeta donde no supere la profundidad máxima, excluyendo la propia carpeta y su subárbol.
   */
  opcionesDePadre(carpetas: FolderResponse[], editada: FolderResponse | null, profundidadMaxima: number): OpcionCarpeta[] {
    const excluidas = editada ? this.subarbol(carpetas, editada.id) : new Set<string>();
    const altura = editada ? this.altura(carpetas, editada.id) : 1;

    const opciones = carpetas
      .filter(c => !excluidas.has(c.id) && c.depth + altura <= profundidadMaxima)
      .map(c => ({ id: c.id as string | null, etiqueta: c.path.join(' / '), nivel: c.depth }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { sensitivity: 'base' }));

    return [{ id: null, etiqueta: 'Raíz (nivel superior)', nivel: 0 }, ...opciones];
  }
}
