import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { apiUrl } from './api';
import { ImportBackupResponse } from '../interfaces/responses/ImportBackupResponse';

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  protected _http = inject(HttpClient);

  // El respaldo se descarga y se vuelve a subir tal cual; el front no necesita conocer su estructura
  async exportarRespaldo(): Promise<unknown> {
    return lastValueFrom(this._http.get<unknown>(`${apiUrl}/backup`));
  }

  async importarRespaldo(respaldo: unknown): Promise<ImportBackupResponse> {
    return lastValueFrom(this._http.post<ImportBackupResponse>(`${apiUrl}/backup`, respaldo));
  }
}
