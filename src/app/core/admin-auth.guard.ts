// Route guard for /admin (used in app.routes.ts).
// The router runs it before opening /admin: with a valid admin session the page opens;
// otherwise the browser is sent to the user app's login form ("/?mode=login").
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

export const adminAuthGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  if (adminAuth.isLoggedIn) {
    return true;
  }
  return router.createUrlTree(['/'], { queryParams: { mode: 'login' } });
};
