import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./modulos/notas/notas.component').then((c) => c.NotasComponent),
    },

    {
        path: '**',
        redirectTo: '',
    },
];
