import { Component, inject, input } from '@angular/core';
import { LoadingService } from '../core/loading';

// Spinner card shown in place of content while its first API load is pending.
@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="loader" [class.compact]="compact()" role="status" aria-live="polite">
      <div class="loader-ring"><span></span></div>
      <div class="loader-text">{{ label() }}</div>
    </div>
  `,
})
export class LoaderComponent {
  label = input('Loading…');
  compact = input(false);
}

// Thin animated bar at the very top of the admin while any request is in flight.
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `<div class="progress-bar" [class.on]="loading.busy()"><span></span></div>`,
})
export class ProgressBarComponent {
  readonly loading = inject(LoadingService);
}
