import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { apiUrl } from './api';
import { AskAssistantRequest } from '../interfaces/requests/AskAssistantRequest';
import { AskAssistantResponse } from '../interfaces/responses/AskAssistantResponse';
import { AssistantStatusResponse } from '../interfaces/responses/AssistantStatusResponse';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {

  protected _http = inject(HttpClient);

  async obtenerEstado(): Promise<AssistantStatusResponse> {
    return lastValueFrom(this._http.get<AssistantStatusResponse>(`${apiUrl}/assistant/status`));
  }

  // La API consulta a Gemini con su propia API Key; el navegador nunca la conoce
  async preguntar(request: AskAssistantRequest): Promise<AskAssistantResponse> {
    return lastValueFrom(this._http.post<AskAssistantResponse>(`${apiUrl}/assistant/ask`, request));
  }
}
