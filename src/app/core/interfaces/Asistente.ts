export type RolMensaje = 'usuario' | 'asistente' | 'error' | 'sistema';

// Documento de donde la IA sacó la respuesta (se abre al hacer clic)
export interface FuenteRespuesta {
    id:     string;
    titulo: string;
    ruta:   string;
}

export interface MensajeChat {
    rol:      RolMensaje;
    texto:    string;
    fuentes?: FuenteRespuesta[];
}

// Documento adjunto como contexto a cada pregunta
export interface ContextoDocumento {
    titulo:      string;
    texto:       string;
    // null si es un borrador nuevo que aún no se publica
    documentoId: string | null;
}

export interface SugerenciaIa {
    etiqueta: string;
    prompt:   string;
}
