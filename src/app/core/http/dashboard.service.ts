import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { apiUrl } from './api';
import { DashboardResponse } from '../interfaces/responses/DashboardResponse';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  protected _http = inject(HttpClient);

  // Estadísticas de las tarjetas del inicio (las calcula la API)
  async obtenerResumen(): Promise<DashboardResponse> {
    return lastValueFrom(this._http.get<DashboardResponse>(`${apiUrl}/dashboard`));
  }
}
