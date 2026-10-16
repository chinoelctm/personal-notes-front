import { Injectable } from '@angular/core';

const PREFIJO = 'personal-notes:';

export const CLAVES_LOCALES = {
  // Copia de carpetas, documentos y estadísticas de la API: la app abre al instante y sin conexión
  cache: 'cache',
  // Borradores del editor, uno por documento ('nuevo' para el que aún no se publica)
  borradores: 'borradores',
  // Vista abierta (inicio, carpeta o documento) para restaurarla al recargar
  sesion: 'sesion',
  // Carpetas desplegadas en el árbol lateral
  expandidas: 'expandidas'
} as const;

/**
 * Lectura/escritura en localStorage tolerante a fallos: el almacenamiento puede estar lleno (imágenes en
 * Base64) o bloqueado (modo privado). escribir() devuelve false en ese caso para avisar al usuario.
 */
@Injectable({
  providedIn: 'root'
})
export class AlmacenamientoLocalService {

  leer<T>(clave: string, porDefecto: T): T {
    try {
      const valor = localStorage.getItem(PREFIJO + clave);
      return valor === null ? porDefecto : JSON.parse(valor) as T;
    } catch {
      return porDefecto;
    }
  }

  escribir(clave: string, valor: unknown): boolean {
    try {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  }

  eliminar(clave: string) {
    try {
      localStorage.removeItem(PREFIJO + clave);
    } catch {
      // Sin acceso al almacenamiento: no hay nada que borrar
    }
  }
}
