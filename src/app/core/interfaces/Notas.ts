import { DocumentResponse, Priority } from './responses/DocumentResponse';
import { FolderResponse } from './responses/FolderResponse';

export type VistaCentral = 'inicio' | 'directorio' | 'editor' | 'busqueda';

export type FiltroPrioridad = Priority | 'Todas';

export type EstadoGuardado = 'sincronizado' | 'borrador' | 'publicando' | 'sin-conexion';

// Nodo del árbol lateral: una carpeta con sus subcarpetas y documentos (ordenados)
export interface NodoCarpeta {
    carpeta:    FolderResponse;
    hijos:      NodoCarpeta[];
    documentos: DocumentResponse[];
}

/**
 * Cambios del editor aún no publicados. Se guardan en localStorage en cada tecla; documentoId null es
 * un documento nuevo. baseUpdatedOn es la versión publicada sobre la que se editó: si la API tiene una
 * más nueva, el borrador se descarta.
 */
export interface Borrador {
    documentoId:   string | null;
    folderId:      string;
    title:         string;
    content:       string;
    priority:      Priority;
    baseUpdatedOn: string | null;
}

// Coincidencia del buscador global
export interface ResultadoBusqueda {
    documento:      DocumentResponse;
    ruta:           string[];
    // Fragmento del texto alrededor de la coincidencia (en el título o el contenido)
    fragmento:      string;
    enTitulo:       boolean;
    enContenido:    boolean;
}

export interface ModalCarpeta {
    modo:    'crear' | 'editar';
    carpeta: FolderResponse | null;
    padreId: string | null;
}

// Vista que se restaura al recargar la página
export interface SesionGuardada {
    vista:       VistaCentral;
    carpetaId:   string | null;
    documentoId: string | null;
}
