import { Injectable } from '@angular/core';
import { DocumentResponse, DocumentType } from '../interfaces/responses/DocumentResponse';
import { ResultadoBusqueda } from '../interfaces/Notas';
import { markdownAHtml } from './markdown';

export interface SegmentoTexto {
    texto:     string;
    resaltado: boolean;
}

const MARGEN_FRAGMENTO = 60;

// Etiquetas de bloque: se reemplazan por un espacio para no pegar palabras de párrafos distintos
const CIERRE_DE_BLOQUE = /<\s*(br|\/p|\/h[1-6]|\/li|\/tr|\/td|\/th|\/pre|\/div|\/blockquote)[^>]*>/gi;

/**
 * Cálculos de presentación del front: texto plano y vistas previas de las tarjetas, orden por última
 * edición, últimos documentos editados y buscador global. Las fechas y las estadísticas vienen de la API.
 */
@Injectable({
  providedIn: 'root'
})
export class VistaPreviaService {

  /** Texto visible de un HTML del editor (sin etiquetas, imágenes ni espacios repetidos). */
  textoPlano(html: string | null | undefined): string {
    if (!html) return '';
    const conEspacios = html.replace(CIERRE_DE_BLOQUE, ' ');
    // DOMParser no ejecuta scripts ni descarga imágenes: es seguro para extraer el texto
    const documento = new DOMParser().parseFromString(conEspacios, 'text/html');
    // Código y estilos de las páginas HTML no son texto visible
    documento.querySelectorAll('script, style, noscript, template').forEach(n => n.remove());
    return (documento.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Texto visible de un documento según su tipo: un Markdown se lee sin #, ** ni la sintaxis de tablas. */
  textoDe(contenido: string | null | undefined, tipo: DocumentType = 'Rich'): string {
    return this.textoPlano(tipo === 'Markdown' ? markdownAHtml(contenido) : contenido);
  }

  /** Vista previa de la tarjeta: el texto plano recortado a una palabra completa. */
  vistaPrevia(contenido: string | null | undefined, largo: number, tipo: DocumentType = 'Rich'): string {
    const texto = this.textoDe(contenido, tipo);
    if (texto.length <= largo) return texto;
    const corte = texto.lastIndexOf(' ', largo);
    return `${texto.slice(0, corte > largo * 0.6 ? corte : largo).trimEnd()}…`;
  }

  /** Copia ordenada por última edición: el más reciente primero; a igual fecha, por título. */
  ordenarPorEdicion(documentos: DocumentResponse[]): DocumentResponse[] {
    return [...documentos].sort((a, b) =>
      Date.parse(b.updatedOn) - Date.parse(a.updatedOn) || a.title.localeCompare(b.title, 'es'));
  }

  ultimosEditados(documentos: DocumentResponse[], cantidad: number): DocumentResponse[] {
    return this.ordenarPorEdicion(documentos).slice(0, Math.max(0, cantidad));
  }

  /** Minúsculas y sin tildes: "Autenticación" coincide con "autenticacion". */
  normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /**
   * Busca todas las palabras de la consulta, cada una en el título o en el contenido. Primero los que
   * coinciden en el título; luego por última edición.
   */
  buscar(documentos: DocumentResponse[], consulta: string, rutaDe: (folderId: string) => string[]): ResultadoBusqueda[] {
    const terminos = this.terminos(consulta);
    if (terminos.length === 0) return [];

    const resultados: (ResultadoBusqueda & { orden: number })[] = [];
    for (const documento of documentos) {
      const titulo = this.normalizar(documento.title);
      const texto = this.textoDe(documento.content, documento.type);
      const contenido = this.normalizar(texto);

      const coinciden = terminos.every(t => titulo.includes(t) || contenido.includes(t));
      if (!coinciden) continue;

      const enTitulo = terminos.some(t => titulo.includes(t));
      const enContenido = terminos.some(t => contenido.includes(t));
      resultados.push({
        documento,
        ruta: rutaDe(documento.folderId),
        fragmento: this.fragmento(texto, contenido, terminos),
        enTitulo,
        enContenido,
        orden: enTitulo ? 0 : 1
      });
    }

    return resultados
      .sort((a, b) => a.orden - b.orden
        || Date.parse(b.documento.updatedOn) - Date.parse(a.documento.updatedOn))
      .map(({ orden, ...resultado }) => resultado);
  }

  /** Parte un texto en segmentos para resaltar los términos buscados sin usar innerHTML. */
  segmentos(texto: string, consulta: string): SegmentoTexto[] {
    const terminos = this.terminos(consulta);
    if (!texto || terminos.length === 0) return texto ? [{ texto, resaltado: false }] : [];

    const normalizado = this.normalizar(texto);
    const marcas = new Array<boolean>(texto.length).fill(false);
    for (const termino of terminos) {
      let desde = normalizado.indexOf(termino);
      while (desde >= 0) {
        marcas.fill(true, desde, desde + termino.length);
        desde = normalizado.indexOf(termino, desde + termino.length);
      }
    }

    const segmentos: SegmentoTexto[] = [];
    for (let i = 0; i < texto.length; i++) {
      const ultimo = segmentos[segmentos.length - 1];
      if (ultimo && ultimo.resaltado === marcas[i]) {
        ultimo.texto += texto[i];
      } else {
        segmentos.push({ texto: texto[i], resaltado: marcas[i] });
      }
    }
    return segmentos;
  }

  private terminos(consulta: string): string[] {
    return [...new Set(this.normalizar(consulta).split(/\s+/).filter(t => t.length > 0))];
  }

  // Fragmento alrededor de la primera coincidencia en el contenido (o el inicio, si solo coincidió el título).
  // La normalización NFD + quitar tildes no cambia el largo, así que los índices sirven para el original.
  private fragmento(texto: string, normalizado: string, terminos: string[]): string {
    const posiciones = terminos.map(t => normalizado.indexOf(t)).filter(i => i >= 0);
    const primera = posiciones.length > 0 ? Math.min(...posiciones) : 0;
    const inicio = Math.max(0, primera - MARGEN_FRAGMENTO);
    const fin = Math.min(texto.length, primera + MARGEN_FRAGMENTO * 2);
    return `${inicio > 0 ? '…' : ''}${texto.slice(inicio, fin).trim()}${fin < texto.length ? '…' : ''}`;
  }
}
