import { HttpInterceptorFn } from '@angular/common/http';
import { apiUrl } from '../http/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('token');

    // Solo hacia la API propia: el token no debe viajar a servicios externos (Gemini)
    if (token && req.url.startsWith(apiUrl)) {
        const authReq = req.clone({
            setHeaders: { 'Authorization': `Bearer ${token}` }
        });

        return next(authReq);
    }

    return next(req);
};
