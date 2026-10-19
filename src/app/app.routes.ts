import { Routes } from '@angular/router';
import { anonimoGuard, sesionGuard } from './core/guards/sesion.guard';

export const routes: Routes = [
    {
        path: 'login',
        canActivate: [anonimoGuard],
        loadComponent: () => import('./modulos/login/login.component').then((c) => c.LoginComponent),
    },

    {
        path: '',
        canActivate: [sesionGuard],
        loadComponent: () => import('./modulos/notas/notas.component').then((c) => c.NotasComponent),
    },

    {
        path: '**',
        redirectTo: '',
    },
];
