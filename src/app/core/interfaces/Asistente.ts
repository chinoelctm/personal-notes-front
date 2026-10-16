export type RolMensaje = 'usuario' | 'asistente' | 'error' | 'sistema';

export interface MensajeChat {
    rol:   RolMensaje;
    texto: string;
}

// Documento adjunto como contexto a cada pregunta
export interface ContextoDocumento {
    titulo: string;
    texto:  string;
}

export interface SugerenciaIa {
    etiqueta: string;
    prompt:   string;
}
