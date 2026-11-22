// App-wide setup, passed to bootstrapApplication() in main.ts.
// - HTTP: every request goes through two interceptors, in this order:
//     adminAuthInterceptor (adds the admin token, logs out on 401) and loadingInterceptor (drives the loading bar).
// - Router: the URL → page table in app.routes.ts.
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { loadingInterceptor } from './core/loading';
import { adminAuthInterceptor } from './core/admin-auth.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([adminAuthInterceptor, loadingInterceptor])),
    provideRouter(routes),
  ],
};
