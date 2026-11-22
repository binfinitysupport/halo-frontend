// Admin navigation menu, built from the NAV list in core/nav.ts.
// variant "side": fixed sidebar on desktop, with the admin profile and a log-out button at the bottom.
// variant "drawer": slide-in menu on phones, with a close button and "Log out" at the bottom.
import { Component, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent, ICON } from './icon.component';
import { NAV, NavItem } from '../core/nav';
import { PageId } from '../core/models';
import { UiStore } from '../core/ui.store';
import { AdminAuthService } from '../core/admin-auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [IconComponent, NgTemplateOutlet],
  template: `
    <!-- Desktop sidebar -->
    @if (variant() === 'side') {
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">H</div>
          <div class="brand-text">
            <div class="brand-name">Halo</div>
            <div class="brand-sub">ADMIN</div>
          </div>
        </div>
        <ng-container *ngTemplateOutlet="items" />
        <div style="flex:1"></div>
        <ng-container *ngTemplateOutlet="profile" />
      </aside>
    } @else {
      <!-- Phone menu: dark overlay (tap to close) and the slide-in panel -->
      <div class="overlay" (click)="closed.emit()"></div>
      <aside class="drawer">
        <div class="brand">
          <div class="brand-mark">H</div>
          <div class="grow brand-name">Halo Admin</div>
          <button class="close-x" (click)="closed.emit()" aria-label="Close menu">
            <app-icon name="close" [size]="16" [width]="2.4" />
          </button>
        </div>
        <ng-container *ngTemplateOutlet="items" />
        <div style="flex:1"></div>
        <button class="nav-item lg" (click)="adminAuth.logout()">
          <app-icon name="logout" stroke="rgba(255,255,255,.65)" />
          <span class="grow" style="text-align:left">Log out</span>
        </button>
      </aside>
    }

    <!-- The menu items, shared by both variants. Badges show pending counts. -->
    <ng-template #items>
      @for (item of nav; track item.id) {
        <button class="nav-item" [class.on]="page() === item.id" [class.lg]="variant() === 'drawer'"
                (click)="navigate.emit(item.id)">
          <app-icon [name]="item.icon" [stroke]="page() === item.id ? '#fff' : 'rgba(255,255,255,.65)'" />
          <span class="grow" style="text-align:left">{{ item.label }}</span>
          @if (count(item) > 0) {
            <span class="badge">{{ count(item) }}</span>
          }
        </button>
      }
    </ng-template>

    <!-- Admin profile card with the log-out button (desktop only) -->
    <ng-template #profile>
      <div class="profile">
        <div class="avatar grad" style="width:34px;height:34px">SA</div>
        <div class="grow">
          <div class="profile-name">Super Admin</div>
          <div class="profile-mail">admin&#64;halo.app</div>
        </div>
        <button class="icon-btn logout-btn" (click)="adminAuth.logout()" aria-label="Log out" title="Log out">
          <app-icon name="logout" [size]="16" [width]="2.2" stroke="rgba(255,255,255,.75)" />
        </button>
      </div>
    </ng-template>
  `,
})
export class SidebarComponent {
  ui = inject(UiStore);
  adminAuth = inject(AdminAuthService);
  page = input.required<PageId>(); // the current page, highlighted in the menu
  variant = input<'side' | 'drawer'>('side');
  navigate = output<PageId>(); // emitted when a menu item is clicked
  closed = output<void>(); // emitted when the phone menu should close
  readonly nav: NavItem[] = NAV;
  readonly icons = ICON;

  // The badge number for a menu item (0 = no badge).
  count(item: NavItem): number {
    return item.badge ? this.ui.meta()[item.badge] : 0;
  }
}
