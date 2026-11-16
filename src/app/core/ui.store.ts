import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Meta, PageId } from './models';

const SEARCHABLE: PageId[] = ['users', 'deposits', 'withdrawals'];

// Shared app state: current page, global search, toast, and sidebar badge counts.
@Injectable({ providedIn: 'root' })
export class UiStore {
  private api = inject(ApiService);

  readonly page = signal<PageId>('dashboard');
  readonly q = signal('');
  readonly message = signal<string | null>(null);
  readonly meta = signal<Meta>({ kycPending: 0, withdrawalsPending: 0 });
  private timer: ReturnType<typeof setTimeout> | undefined;

  toast(text: string): void {
    clearTimeout(this.timer);
    this.message.set(text);
    this.timer = setTimeout(() => this.message.set(null), 2200);
  }

  refreshMeta(): void {
    this.api.get<Meta>('/meta').subscribe({ next: (m) => this.meta.set(m), error: () => undefined });
  }

  go(page: PageId): void {
    if (page !== this.page()) this.q.set(''); // search is cleared when the page changes
    this.page.set(page);
    window.scrollTo(0, 0);
  }

  // Typing in the global search jumps to the Users list, as in the prototype.
  search(value: string): void {
    this.q.set(value);
    if (!SEARCHABLE.includes(this.page())) this.page.set('users');
  }
}
