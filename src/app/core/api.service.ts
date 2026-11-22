// Small helper for calling the backend API from the admin pages.
// Pages pass only the path, e.g. api.get('/users'); the base URL (e.g. "/api") comes from
// src/environments. The admin token is added automatically by adminAuthInterceptor.
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  /** GET request; params become the query string, e.g. { vip: 'All' } → "?vip=All". */
  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.http.get<T>(API_BASE_URL + path, { params });
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(API_BASE_URL + path, body);
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(API_BASE_URL + path, body);
  }

  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(API_BASE_URL + path, body);
  }
}

/** The error text to show the admin: the server's message when it sent one (e.g. "Amount exceeds ... balance"), otherwise "Request failed". */
export function errorMessage(error: unknown): string {
  const serverMessage = error instanceof HttpErrorResponse ? error.error?.message : undefined;
  return typeof serverMessage === 'string' ? serverMessage : 'Request failed';
}
