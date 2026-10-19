import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { apiUrl } from './api';
import { DocumentResponse } from '../interfaces/responses/DocumentResponse';
import { DocumentSavedResponse } from '../interfaces/responses/DocumentSavedResponse';
import { DocumentRequest } from '../interfaces/requests/DocumentRequest';

@Injectable({
  providedIn: 'root'
})
export class DocumentsService {

  protected _http = inject(HttpClient);

  // Todos los documentos activos con su contenido, el editado más recientemente primero
  async obtenerDocumentos(): Promise<DocumentResponse[]> {
    return lastValueFrom(this._http.get<DocumentResponse[]>(`${apiUrl}/documents`));
  }

  async obtenerDocumento(id: string): Promise<DocumentResponse> {
    return lastValueFrom(this._http.get<DocumentResponse>(`${apiUrl}/documents/${encodeURIComponent(id)}`));
  }

  async crearDocumento(request: DocumentRequest): Promise<DocumentSavedResponse> {
    return lastValueFrom(this._http.post<DocumentSavedResponse>(`${apiUrl}/documents`, request));
  }

  async actualizarDocumento(id: string, request: DocumentRequest): Promise<DocumentSavedResponse> {
    return lastValueFrom(this._http.put<DocumentSavedResponse>(`${apiUrl}/documents/${encodeURIComponent(id)}`, request));
  }

  // Borrado físico: el documento se elimina de forma permanente
  async eliminarDocumento(id: string): Promise<void> {
    await lastValueFrom(this._http.delete<void>(`${apiUrl}/documents/${encodeURIComponent(id)}`));
  }
}
