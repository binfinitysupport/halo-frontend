import { Component, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent, ICON } from './icon.component';
import { NAV, NavItem } from '../core/nav';
import { PageId } from '../core/models';
import { UiStore } from '../core/ui.store';

// 'side' = desktop sidebar. 'drawer' = slide-in menu on small screens.
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [IconComponent, NgTemplateOutlet],
  template: `
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
      </aside>
    }

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

    <ng-template #profile>
      <div class="profile">
        <div class="avatar grad" style="width:34px;height:34px">SA</div>
        <div class="grow">
          <div class="profile-name">Super Admin</div>
          <div class="profile-mail">admin&#64;halo.app</div>
        </div>
      </div>
    </ng-template>
  `,
})
export class SidebarComponent {
  ui = inject(UiStore);
  page = input.required<PageId>();
  variant = input<'side' | 'drawer'>('side');
  navigate = output<PageId>();
  closed = output<void>();
  readonly nav: NavItem[] = NAV;
  readonly icons = ICON;

  count(item: NavItem): number {
    return item.badge ? this.ui.meta()[item.badge] : 0;
  }
}
