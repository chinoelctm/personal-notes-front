import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { apiUrl } from '../http/api';
import { authUrl } from '../http/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => api.verify());

  const tick = () => new Promise(resolve => setTimeout(resolve));

  it('ante un 401 renueva la sesión y reintenta la llamada una vez', async () => {
    const respuesta = lastValueFrom(http.get<string[]>(`${apiUrl}/folders`));

    api.expectOne(`${apiUrl}/folders`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    api.expectOne(`${authUrl}/refresh`).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    api.expectOne(`${apiUrl}/folders`).flush(['ok']);

    expect(await respuesta).toEqual(['ok']);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('si la sesión no se puede renovar, manda al login y propaga el 401', async () => {
    const respuesta = lastValueFrom(http.get(`${apiUrl}/folders`));

    api.expectOne(`${apiUrl}/folders`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    api.expectOne(`${authUrl}/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    // Otra pestaña pudo haber rotado las cookies: se consulta /me antes de rendirse
    api.expectOne(`${authUrl}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    api.expectOne(`${authUrl}/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expectAsync(respuesta).toBeRejected();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expirada: 1 } });
  });

  it('no intercepta los 401 de las rutas de auth (credenciales inválidas)', async () => {
    const respuesta = lastValueFrom(http.post(`${authUrl}/login`, {}));

    api.expectOne(`${authUrl}/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expectAsync(respuesta).toBeRejected();
    api.expectNone(`${authUrl}/refresh`);
  });

  it('varias llamadas con 401 a la vez comparten un solo refresh', async () => {
    const a = lastValueFrom(http.get(`${apiUrl}/folders`));
    const b = lastValueFrom(http.get(`${apiUrl}/documents`));

    api.expectOne(`${apiUrl}/folders`).flush(null, { status: 401, statusText: 'Unauthorized' });
    api.expectOne(`${apiUrl}/documents`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    api.expectOne(`${authUrl}/refresh`).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    api.expectOne(`${apiUrl}/folders`).flush([]);
    api.expectOne(`${apiUrl}/documents`).flush([]);

    await Promise.all([a, b]);
  });
});
