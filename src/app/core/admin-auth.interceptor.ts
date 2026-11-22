// Runs for every HTTP request the app makes (registered in app.config.ts).
// 1. Adds "Authorization: Bearer <token>" to calls to our API, so the backend knows the admin is logged in.
// 2. If the backend answers 401 (token missing, expired or invalid), logs the admin out,
//    which clears the session and opens the login form.
import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminAuthService } from './admin-auth.service';

const LOGIN_URL = environment.apiUrl + '/auth/login';
const HTTP_UNAUTHORIZED = 401;

export const adminAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const adminAuth = inject(AdminAuthService);
  const isApiCall = request.url.startsWith(environment.apiUrl);
  const isLoginCall = request.url === LOGIN_URL; // the login call itself needs no token
  const token = adminAuth.token;

  // Requests are immutable in Angular, so we send a copy with the extra header.
  let requestToSend = request;
  if (isApiCall && !isLoginCall && token) {
    requestToSend = request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(requestToSend).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === HTTP_UNAUTHORIZED;
      if (isApiCall && !isLoginCall && isUnauthorized) {
        adminAuth.logout();
      }
      return throwError(() => error); // still let the page see the error
    })
  );
};
