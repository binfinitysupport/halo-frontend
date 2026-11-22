// Shared admin state that several components read and change:
// which page is open, the text in the global search box, the toast message and the sidebar badge counts.
// It uses Angular signals, so any template that reads a value updates automatically when it changes.
import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Meta, PageId } from './models';

// Pages whose list is filtered by the global search box.
const SEARCHABLE_PAGES: PageId[] = ['users', 'deposits', 'withdrawals'];

// How long a toast message stays on screen.
const TOAST_DURATION_MS = 2200;

@Injectable({ providedIn: 'root' })
export class UiStore {
  private api = inject(ApiService);

  readonly page = signal<PageId>('dashboard');
  readonly searchText = signal(''); // global search box in the top bar
  readonly message = signal<string | null>(null); // current toast text, or null when hidden
  readonly meta = signal<Meta>({ kycPending: 0, withdrawalsPending: 0 });
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  /** Shows a short message at the bottom of the screen; it hides itself after a moment. */
  toast(text: string): void {
    clearTimeout(this.toastTimer);
    this.message.set(text);
    this.toastTimer = setTimeout(() => this.message.set(null), TOAST_DURATION_MS);
  }

  /** Reloads the sidebar badge counts (call after approving KYC or withdrawals). */
  refreshMeta(): void {
    this.api.get<Meta>('/meta').subscribe({
      next: (meta) => this.meta.set(meta),
      error: () => undefined, // badges are optional; ignore errors
    });
  }

  /** Opens an admin page. The search box is cleared when the page changes. */
  go(page: PageId): void {
    if (page !== this.page()) this.searchText.set('');
    this.page.set(page);
    window.scrollTo(0, 0);
  }

  /** Called on every keystroke in the search box. Typing on a non-searchable page jumps to Users, as in the prototype. */
  search(value: string): void {
    this.searchText.set(value);
    if (!SEARCHABLE_PAGES.includes(this.page())) this.page.set('users');
  }
}
