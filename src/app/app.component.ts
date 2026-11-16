import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { IconComponent } from './components/icon.component';
import { ProgressBarComponent } from './components/loader.component';
import { SidebarComponent } from './components/sidebar.component';
import { DashboardComponent } from './pages/dashboard.component';
import { UsersComponent } from './pages/users.component';
import { KycComponent } from './pages/kyc.component';
import { MoneyComponent } from './pages/money.component';
import { ContentComponent } from './pages/content.component';
import { SettingsComponent } from './pages/settings.component';
import { NAV } from './core/nav';
import { PageId } from './core/models';
import { UiStore } from './core/ui.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IconComponent, ProgressBarComponent, SidebarComponent, DashboardComponent, UsersComponent, KycComponent,
    MoneyComponent, ContentComponent, SettingsComponent,
  ],
  template: `
    <app-progress-bar />
    <div class="app">
      @if (!isMobile()) {
        <app-sidebar variant="side" [page]="ui.page()" (navigate)="go($event)" />
      }
      @if (isMobile() && drawer()) {
        <app-sidebar variant="drawer" [page]="ui.page()" (navigate)="go($event)" (closed)="drawer.set(false)" />
      }

      <main class="main">
        <header class="topbar">
          @if (isMobile()) {
            <button class="icon-btn" (click)="drawer.set(true)" aria-label="Open menu">
              <app-icon name="menu" [size]="18" [width]="2.2" />
            </button>
          }
          <div class="topbar-title">{{ title() }}</div>
          <label class="search">
            <app-icon name="search" [size]="16" [width]="2.2" stroke="rgba(255,255,255,.5)" />
            <input [value]="ui.q()" (input)="ui.search($any($event.target).value)"
                   placeholder="Search users, UUID, order ID" />
          </label>
        </header>

        <div class="content">
          @switch (ui.page()) {
            @case ('users') { <app-users /> }
            @case ('kyc') { <app-kyc /> }
            @case ('deposits') { <app-money type="deposit" /> }
            @case ('withdrawals') { <app-money type="withdrawal" /> }
            @case ('content') { <app-content /> }
            @case ('settings') { <app-settings /> }
            @default { <app-dashboard /> }
          }
        </div>
      </main>

      @if (ui.message(); as msg) {
        <div class="toast">{{ msg }}</div>
      }
    </div>
  `,
})
export class AppComponent {
  readonly ui = inject(UiStore);
  readonly width = signal(window.innerWidth);
  readonly isMobile = computed(() => this.width() < 900);
  readonly drawer = signal(false);
  readonly title = computed(() => NAV.find((n) => n.id === this.ui.page())?.label ?? 'Dashboard');

  constructor() {
    this.ui.refreshMeta();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.width.set(window.innerWidth);
  }

  go(page: PageId): void {
    this.ui.go(page);
    this.drawer.set(false);
  }
}
