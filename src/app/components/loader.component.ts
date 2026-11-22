// Loading indicators for the admin.
// - <app-loader>: a spinner card shown where a page's content will appear, while its first load runs.
// - <app-progress-bar>: a thin bar at the top of the screen while any API request runs (see core/loading.ts).
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
  label = input('Loading…'); // text under the spinner
  compact = input(false); // smaller version without the card background (used in the user drawer)
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
