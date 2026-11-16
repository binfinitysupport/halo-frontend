import { LoaderComponent } from '../components/loader.component';
import { Component, effect, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { UserRow } from '../core/models';
import { KYC_LABEL, KYC_TAG, dateOnly, fmt, initials, tagStyle } from '../core/format';
import { UserDrawerComponent } from '../components/user-drawer.component';

type Tab = 'profile' | 'team';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [LoaderComponent, NgStyle, UserDrawerComponent],
  template: `
    @if (error(); as e) { <div class="empty">{{ e }}</div> }
    @if (!rows() && !error()) { <app-loader label="Loading users…" /> }
    @if (rows(); as list) {
      <div class="filters">
        @for (f of vipFilters; track f) {
          <button class="chip" [class.on]="vip() === f" (click)="vip.set(f)">{{ f }}</button>
        }
        <div class="grow"></div>
        <div class="count">{{ list.length }} users</div>
      </div>

      <div class="card">
        <div style="min-width:980px">
          <div class="g thead" [style.--cols]="COLS">
            <div>UUID</div><div>User</div><div>Level</div><div>Balance</div><div>Team</div>
            <div>KYC</div><div>Status</div><div>Joined</div><div></div>
          </div>
          @for (u of list; track u.id) {
            <div class="g trow" [style.--cols]="COLS">
              <div class="mono" style="font-weight:700;font-size:12px">{{ u.uuid }}</div>
              <div class="row gap12 minw0">
                <div class="avatar">{{ initials(u.name) }}</div>
                <div class="minw0">
                  <div class="strong">{{ u.phone }}</div>
                  <div class="sub">{{ u.name }}</div>
                </div>
              </div>
              <div><span class="tag" [ngStyle]="tagStyle('blue')">VIP {{ u.vip }}</span></div>
              <div class="strong tnum">{{ fmt(u.activeBalance) }} USDT</div>
              <div><button class="team-link" (click)="open.set({ id: u.id, tab: 'team' })">{{ u.teamSize }}</button></div>
              <div><span class="tag" [ngStyle]="tagStyle(KYC_TAG[u.kycStatus])">{{ KYC_LABEL[u.kycStatus] }}</span></div>
              <div>
                <span class="tag" [ngStyle]="tagStyle(u.status === 'active' ? 'green' : 'red')">
                  {{ u.status === 'active' ? 'Active' : 'Frozen' }}
                </span>
              </div>
              <div class="muted">{{ dateOnly(u.joined) }}</div>
              <div><button class="btn outline full" (click)="open.set({ id: u.id, tab: 'profile' })">View</button></div>
            </div>
          }
        </div>
      </div>
    }

    @if (open(); as o) {
      <app-user-drawer [userId]="o.id" [initialTab]="o.tab" (closed)="open.set(null)" (changed)="reload()" />
    }
  `,
})
export class UsersComponent {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  readonly vipFilters = ['All', 'VIP 0', 'VIP 1', 'VIP 2', 'VIP 3', 'VIP 4'];
  readonly COLS = '.9fr 1.4fr .7fr 1fr .6fr .9fr .8fr .9fr 90px';
  readonly fmt = fmt;
  readonly dateOnly = dateOnly;
  readonly initials = initials;
  readonly tagStyle = tagStyle;
  readonly KYC_TAG = KYC_TAG;
  readonly KYC_LABEL = KYC_LABEL;

  vip = signal('All');
  rows = signal<UserRow[] | null>(null);
  error = signal<string | null>(null);
  open = signal<{ id: string; tab: Tab } | null>(null);

  constructor() {
    // Reloads whenever the VIP filter or the global search changes.
    effect(() => {
      this.vip();
      this.ui.q();
      this.reload();
    });
  }

  reload(): void {
    this.api.get<UserRow[]>('/users', { vip: this.vip(), q: this.ui.q().trim() }).subscribe({
      next: (r) => { this.rows.set(r); this.error.set(null); },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
