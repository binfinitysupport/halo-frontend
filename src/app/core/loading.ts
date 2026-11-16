import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

// Counts API requests in flight; drives the admin's top progress bar.
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);
  readonly busy = computed(() => this.pending() > 0);

  // Deferred: pages start requests inside effect(), where Angular forbids writing signals (NG0600).
  start(): void { queueMicrotask(() => this.pending.update((n) => n + 1)); }
  stop(): void { queueMicrotask(() => this.pending.update((n) => Math.max(0, n - 1))); }
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
