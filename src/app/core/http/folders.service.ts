import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { apiUrl } from './api';
import { FolderResponse } from '../interfaces/responses/FolderResponse';
import { DocumentResponse } from '../interfaces/responses/DocumentResponse';
import { FolderRequest } from '../interfaces/requests/FolderRequest';

@Injectable({
  providedIn: 'root'
})
export class FoldersService {

  protected _http = inject(HttpClient);

  // Lista plana de carpetas activas (con nivel y ruta); el árbol se arma en el front
  async obtenerCarpetas(): Promise<FolderResponse[]> {
    return lastValueFrom(this._http.get<FolderResponse[]>(`${apiUrl}/folders`));
  }

  async crearCarpeta(request: FolderRequest): Promise<{ id: string }> {
    return lastValueFrom(this._http.post<{ id: string }>(`${apiUrl}/folders`, request));
  }

  // Renombra y/o mueve la carpeta con todo su contenido
  async actualizarCarpeta(id: string, request: FolderRequest): Promise<void> {
    await lastValueFrom(this._http.put<void>(`${apiUrl}/folders/${encodeURIComponent(id)}`, request));
  }

  // Borrado físico en cascada: la carpeta, sus subcarpetas y sus documentos
  async eliminarCarpeta(id: string): Promise<void> {
    await lastValueFrom(this._http.delete<void>(`${apiUrl}/folders/${encodeURIComponent(id)}`));
  }

  async obtenerDocumentosDeCarpeta(id: string): Promise<DocumentResponse[]> {
    return lastValueFrom(this._http.get<DocumentResponse[]>(`${apiUrl}/folders/${encodeURIComponent(id)}/documents`));
  }
}
