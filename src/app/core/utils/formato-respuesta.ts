export interface SegmentoFormato {
    texto:   string;
    negrita: boolean;
}

export interface LineaFormato {
    // '•' para viñetas, '1.' para listas numeradas, null para texto normal
    marcador:  string | null;
    segmentos: SegmentoFormato[];
}

const VINETA = /^\s*[-*•]\s+(.*)$/;
const NUMERADA = /^\s*(\d+[.)])\s+(.*)$/;

/**
 * Markdown básico de las respuestas de la IA (negritas, viñetas y listas numeradas) como estructura para
 * la plantilla. La respuesta nunca se inyecta como HTML.
 */
export function formatearRespuesta(texto: string): LineaFormato[] {
    return texto.split(/\r?\n/).map(linea => {
        const vineta = linea.match(VINETA);
        if (vineta) return { marcador: '•', segmentos: negritas(vineta[1]) };

        const numerada = linea.match(NUMERADA);
        if (numerada) return { marcador: numerada[1], segmentos: negritas(numerada[2]) };

        // Encabezados "## Título" se muestran como texto en negrita
        const encabezado = linea.match(/^\s*#{1,6}\s+(.*)$/);
        if (encabezado) return { marcador: null, segmentos: [{ texto: encabezado[1].replace(/\*\*/g, ''), negrita: true }] };

        return { marcador: null, segmentos: negritas(linea) };
    });
}

// "Monto **650.000** CLP" => [Monto ][650.000 (negrita)][ CLP]
function negritas(linea: string): SegmentoFormato[] {
    return linea
        .split(/(\*\*[^*]+\*\*)/g)
        .filter(parte => parte.length > 0)
        .map(parte => parte.startsWith('**') && parte.endsWith('**') && parte.length > 4
            ? { texto: parte.slice(2, -2), negrita: true }
            : { texto: parte, negrita: false });
}
