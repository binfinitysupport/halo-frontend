// Admin login state.
// login() sends the email and password to the backend (POST /api/auth/login). The backend checks them
// and returns a signed token, which is saved in the browser's localStorage. adminAuthInterceptor then
// sends that token with every admin API call, and adminAuthGuard uses isLoggedIn to protect /admin.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/** What the backend returns after a successful admin login. */
interface AdminSession {
  token: string;
  expiresAt: number; // when the token stops working, as a millisecond timestamp
}

/** localStorage key that holds the saved AdminSession. */
const SESSION_STORAGE_KEY = 'halo.adminSession';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  /** Asks the backend to log in; on success the session is saved. Errors (wrong password, lockout) reach the caller. */
  login(email: string, password: string): Observable<AdminSession> {
    return this.http
      .post<AdminSession>(environment.apiUrl + '/auth/login', { email, password })
      .pipe(tap((session) => this.saveSession(session)));
  }

  /** Forgets the session and opens the user app's login form. */
  logout(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // localStorage can be unavailable (e.g. some private-browsing modes); nothing to clear then.
    }
    this.router.navigate(['/'], { queryParams: { mode: 'login' } });
  }

  /** The token of a saved, unexpired session, or null when the admin is not logged in. */
  get token(): string | null {
    const session = this.readSession();
    const isStillValid = session !== null && session.expiresAt > Date.now();
    return isStillValid ? session.token : null;
  }

  get isLoggedIn(): boolean {
    return this.token !== null;
  }

  private saveSession(session: AdminSession): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // localStorage unavailable: the admin stays logged in only until the page reloads.
    }
  }

  private readSession(): AdminSession | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as AdminSession) : null;
    } catch {
      return null; // unavailable storage or damaged data counts as "not logged in"
    }
  }
}
