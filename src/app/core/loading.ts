// Tracks whether any API request is running, so the admin can show its loading bar.
// loadingInterceptor runs for every HTTP request: +1 when it starts, -1 when it finishes (success or error).
// ProgressBarComponent (components/loader.component.ts) reads LoadingService.busy to show or hide the bar.
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pendingRequests = signal(0);

  /** True while at least one request is running. */
  readonly busy = computed(() => this.pendingRequests() > 0);

  // Both updates are deferred with queueMicrotask: pages start requests inside effect(),
  // and Angular does not allow writing a signal directly inside an effect (error NG0600).
  start(): void {
    queueMicrotask(() => this.pendingRequests.update((count) => count + 1));
  }

  stop(): void {
    queueMicrotask(() => this.pendingRequests.update((count) => Math.max(0, count - 1)));
  }
}

/** Counts every HTTP request in LoadingService while it runs. */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(request).pipe(finalize(() => loading.stop()));
};
