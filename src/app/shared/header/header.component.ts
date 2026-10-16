import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NotasStore } from '../../core/state/notas.store';
import { AsistenteStore } from '../../core/state/asistente.store';
import { EstadoGuardado } from '../../core/interfaces/Notas';
import { IconoComponent } from '../icono/icono.component';

interface IndicadorEstado {
  texto:   string;
  detalle: string;
  clase:   string;
  punto:   string;
}

const INDICADORES: Record<EstadoGuardado, IndicadorEstado> = {
  sincronizado: {
    texto: 'Guardado',
    detalle: 'Todo está publicado y guardado localmente',
    clase: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-900',
    punto: 'bg-emerald-500'
  },
  borrador: {
    texto: 'Borrador local',
    detalle: 'Los cambios están guardados en este navegador; presiona Publicar para enviarlos',
    clase: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-900',
    punto: 'bg-amber-500 animate-pulse'
  },
  publicando: {
    texto: 'Publicando…',
    detalle: 'Enviando el documento a la API',
    clase: 'text-indigo-700 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-900',
    punto: 'bg-indigo-500 animate-pulse'
  },
  'sin-conexion': {
    texto: 'Sin conexión',
    detalle: 'La API no responde: se muestra la copia local',
    clase: 'text-rose-700 bg-rose-50 border-rose-100 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-900',
    punto: 'bg-rose-500'
  }
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconoComponent],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {

  protected readonly store = inject(NotasStore);
  protected readonly asistente = inject(AsistenteStore);

  protected readonly estado = computed(() => INDICADORES[this.store.estadoGuardado()]);

  protected buscar(texto: string) {
    this.store.buscar(texto);
  }

  protected importar(input: HTMLInputElement) {
    const archivo = input.files?.[0];
    // Se limpia para poder volver a elegir el mismo archivo
    input.value = '';
    if (archivo) this.store.importarRespaldo(archivo);
  }
}
