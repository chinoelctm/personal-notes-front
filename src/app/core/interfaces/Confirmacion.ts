export type EstiloOpcion = 'primario' | 'peligro' | 'secundario';

export interface OpcionConfirmacion {
    etiqueta: string;
    valor:    string;
    estilo:   EstiloOpcion;
}

export interface SolicitudConfirmacion {
    titulo:   string;
    mensaje:  string;
    opciones: OpcionConfirmacion[];
}
