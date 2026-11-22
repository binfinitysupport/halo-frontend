// Admin "Users" page: a table of all users with a VIP-level filter and the global search box.
// Data comes from GET /api/users. "View" (or the team count) opens UserDrawerComponent for that user.
import { LoaderComponent } from '../components/loader.component';
import { Component, effect, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { UserRow } from '../core/models';
import { KYC_LABEL, KYC_TAG, dateOnly, fmt, initials, tagStyle } from '../core/format';
import { UserDrawerComponent } from '../components/user-drawer.component';

// Which tab the user drawer opens on.
type Tab = 'profile' | 'team';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [LoaderComponent, NgStyle, UserDrawerComponent],
  template: `
    <!-- Error / loading states -->
    @if (error(); as errorText) { <div class="empty">{{ errorText }}</div> }
    @if (!rows() && !error()) { <app-loader label="Loading users…" /> }
    @if (rows(); as list) {
      <!-- VIP filter chips and the user count -->
      <div class="filters">
        @for (vipFilter of vipFilters; track vipFilter) {
          <button class="chip" [class.on]="vip() === vipFilter" (click)="vip.set(vipFilter)">{{ vipFilter }}</button>
        }
        <div class="grow"></div>
        <div class="count">{{ list.length }} users</div>
      </div>

      <!-- Users table (scrolls sideways on small screens) -->
      <div class="card">
        <div style="min-width:980px">
          <div class="g thead" [style.--cols]="TABLE_COLUMNS">
            <div>UUID</div><div>User</div><div>Level</div><div>Balance</div><div>Team</div>
            <div>KYC</div><div>Status</div><div>Joined</div><div></div>
          </div>
          @for (user of list; track user.id) {
            <div class="g trow" [style.--cols]="TABLE_COLUMNS">
              <div class="mono" style="font-weight:700;font-size:12px">{{ user.uuid }}</div>
              <div class="row gap12 minw0">
                <div class="avatar">{{ initials(user.name) }}</div>
                <div class="minw0">
                  <div class="strong">{{ user.phone }}</div>
                  <div class="sub">{{ user.name }}</div>
                </div>
              </div>
              <div><span class="tag" [ngStyle]="tagStyle('blue')">VIP {{ user.vip }}</span></div>
              <div class="strong tnum">{{ fmt(user.activeBalance) }} USDT</div>
              <div><button class="team-link" (click)="openedUser.set({ id: user.id, tab: 'team' })">{{ user.teamSize }}</button></div>
              <div><span class="tag" [ngStyle]="tagStyle(KYC_TAG[user.kycStatus])">{{ KYC_LABEL[user.kycStatus] }}</span></div>
              <div>
                <span class="tag" [ngStyle]="tagStyle(user.status === 'active' ? 'green' : 'red')">
                  {{ user.status === 'active' ? 'Active' : 'Frozen' }}
                </span>
              </div>
              <div class="muted">{{ dateOnly(user.joined) }}</div>
              <div><button class="btn outline full" (click)="openedUser.set({ id: user.id, tab: 'profile' })">View</button></div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Side drawer with one user's profile, wallets and team -->
    @if (openedUser(); as opened) {
      <app-user-drawer [userId]="opened.id" [initialTab]="opened.tab" (closed)="openedUser.set(null)" (changed)="reload()" />
    }
  `,
})
export class UsersComponent {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  readonly vipFilters = ['All', 'VIP 0', 'VIP 1', 'VIP 2', 'VIP 3', 'VIP 4'];
  // CSS grid column widths for the table (header and rows share them).
  readonly TABLE_COLUMNS = '.9fr 1.4fr .7fr 1fr .6fr .9fr .8fr .9fr 90px';

  // Helpers made available to the template.
  readonly fmt = fmt;
  readonly dateOnly = dateOnly;
  readonly initials = initials;
  readonly tagStyle = tagStyle;
  readonly KYC_TAG = KYC_TAG;
  readonly KYC_LABEL = KYC_LABEL;

  vip = signal('All'); // selected VIP filter chip
  rows = signal<UserRow[] | null>(null); // null until the first load finishes
  error = signal<string | null>(null);
  openedUser = signal<{ id: string; tab: Tab } | null>(null); // user shown in the side drawer

  constructor() {
    // An effect re-runs whenever a signal it reads changes. This one reads the VIP filter and the
    // global search text, so the list reloads when either changes (and once when the page opens).
    effect(() => {
      this.vip();
      this.ui.searchText();
      this.reload();
    });
  }

  // Fetches the user list for the current filter and search. Also called after the drawer changes a user.
  reload(): void {
    const query = { vip: this.vip(), q: this.ui.searchText().trim() };
    this.api.get<UserRow[]>('/users', query).subscribe({
      next: (users) => {
        this.rows.set(users);
        this.error.set(null);
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }
}
