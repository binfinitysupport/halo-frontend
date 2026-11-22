// Admin panel layout (shown at "/admin").
// Draws the sidebar (or the slide-in menu on small screens), the top bar with the page title and
// global search, and the current admin page. Which page is shown is stored in UiStore.page().
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

// Below this width the sidebar is replaced by a menu button and a slide-in menu.
const MOBILE_BREAKPOINT_PX = 900;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IconComponent, ProgressBarComponent, SidebarComponent, DashboardComponent, UsersComponent, KycComponent,
    MoneyComponent, ContentComponent, SettingsComponent,
  ],
  template: `
    <!-- Thin loading bar at the very top while any API request is running -->
    <app-progress-bar />
    <div class="app">
      <!-- Navigation: fixed sidebar on desktop, slide-in menu on phones -->
      @if (!isMobile()) {
        <app-sidebar variant="side" [page]="ui.page()" (navigate)="go($event)" />
      }
      @if (isMobile() && isDrawerOpen()) {
        <app-sidebar variant="drawer" [page]="ui.page()" (navigate)="go($event)" (closed)="isDrawerOpen.set(false)" />
      }

      <main class="main">
        <!-- Top bar: menu button (phones), page title, global search -->
        <header class="topbar">
          @if (isMobile()) {
            <button class="icon-btn" (click)="isDrawerOpen.set(true)" aria-label="Open menu">
              <app-icon name="menu" [size]="18" [width]="2.2" />
            </button>
          }
          <div class="topbar-title">{{ title() }}</div>
          <label class="search">
            <app-icon name="search" [size]="16" [width]="2.2" stroke="rgba(255,255,255,.5)" />
            <input [value]="ui.searchText()" (input)="ui.search($any($event.target).value)"
                   placeholder="Search users, UUID, order ID" />
          </label>
        </header>

        <!-- Current page -->
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

      <!-- Short confirmation message (e.g. "Saved"), see UiStore.toast() -->
      @if (ui.message(); as toastMessage) {
        <div class="toast">{{ toastMessage }}</div>
      }
    </div>
  `,
})
export class AppComponent {
  readonly ui = inject(UiStore);

  // Current browser width; updated on every window resize (see onResize).
  readonly viewportWidth = signal(window.innerWidth);
  readonly isMobile = computed(() => this.viewportWidth() < MOBILE_BREAKPOINT_PX);

  // Whether the slide-in menu is open (phones only).
  readonly isDrawerOpen = signal(false);

  // Page title in the top bar: the label of the current page from the navigation list.
  readonly title = computed(() => NAV.find((navItem) => navItem.id === this.ui.page())?.label ?? 'Dashboard');

  constructor() {
    // Load the sidebar badge counts (pending KYC and withdrawals) once when the admin opens.
    this.ui.refreshMeta();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  // Called when a menu item is clicked: show that page and close the phone menu.
  go(page: PageId): void {
    this.ui.go(page);
    this.isDrawerOpen.set(false);
  }
}
