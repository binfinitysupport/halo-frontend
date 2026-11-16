import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

const BASE = environment.apiUrl;

// Thin wrapper around HttpClient. All paths are relative to /api.
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.http.get<T>(BASE + path, { params });
  }
  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(BASE + path, body);
  }
  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(BASE + path, body);
  }
  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(BASE + path, body);
  }
}

// Shows the server's message (e.g. "Amount exceeds ... balance") when there is one.
export function errorMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse && e.error && typeof e.error.message === 'string') return e.error.message;
  return 'Request failed';
}
