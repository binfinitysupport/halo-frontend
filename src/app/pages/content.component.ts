// Admin "Banners & announcements" page: edit the banners and the scrolling announcement shown in the user app.
// Data comes from GET /api/content. Each banner row saves itself (PATCH /api/content/banners/:id);
// the announcement is saved with PUT /api/content/announcement.
import { LoaderComponent } from '../components/loader.component';
import { Component, OnChanges, SimpleChanges, inject, input, output, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { Banner, ContentData } from '../core/models';
import { ToggleComponent } from '../components/toggle.component';

// One editable banner row: title, subtitle, Live/Hidden toggle and Save button.
// Tells the parent page to reload (the `changed` output) after a successful save or toggle.
@Component({
  selector: 'app-banner-row',
  standalone: true,
  imports: [ToggleComponent],
  template: `
    <div class="g bannerrow" style="--cols:60px minmax(0,1.2fr) minmax(0,1.6fr) 110px 80px;--gap:12px">
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.6)">{{ index() + 1 }}</div>
      <input class="field" style="height:36px;font-weight:700" [value]="title" (input)="title = $any($event.target).value" />
      <input class="field" style="height:36px;font-weight:600" [value]="subtitle" (input)="subtitle = $any($event.target).value" />
      <div class="row gap8">
        <app-toggle [on]="item().isLive" (changed)="toggle()" />
        <div class="toggle-label">{{ item().isLive ? 'Live' : 'Hidden' }}</div>
      </div>
      <button class="btn outline full" (click)="save()">Save</button>
    </div>
  `,
})
export class BannerRowComponent implements OnChanges {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  item = input.required<Banner>(); // the banner to edit
  index = input.required<number>(); // its position, shown as "1, 2, 3…"
  label = input.required<string>(); // "Popup" or "Home", used in the toast text
  changed = output<void>();

  // Edited values; reset from the banner whenever it reloads.
  title = '';
  subtitle = '';

  // Runs when the parent passes a new banner (e.g. after a reload): copy its texts into the inputs.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      this.title = this.item().title;
      this.subtitle = this.item().subtitle;
    }
  }

  // Saves the edited title and subtitle.
  save(): void {
    const changes = { title: this.title, subtitle: this.subtitle };
    this.api.patch(`/content/banners/${this.item().id}`, changes).subscribe({
      next: () => {
        this.ui.toast(`${this.label()} banner ${this.index() + 1} saved`);
        this.changed.emit();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }

  // Switches the banner between Live and Hidden.
  toggle(): void {
    const wasLive = this.item().isLive;
    this.api.patch(`/content/banners/${this.item().id}`, { isLive: !wasLive }).subscribe({
      next: () => {
        this.ui.toast(`${this.label()} banner ${this.index() + 1}${wasLive ? ' hidden' : ' is live'}`);
        this.changed.emit();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }
}

// The page itself: one card per banner group, plus the announcement card.
@Component({
  selector: 'app-content',
  standalone: true,
  imports: [LoaderComponent, BannerRowComponent, ToggleComponent],
  template: `
    <!-- Error / loading states -->
    @if (error(); as errorText) { <div class="empty">{{ errorText }}</div> }
    @if (!data() && !error()) { <app-loader label="Loading banners…" /> }
    @if (data(); as content) {
      <!-- Banner groups: popup banners and home page banners -->
      @for (section of sections(content); track section.title) {
        <div class="card sm">
          <div class="card-title">{{ section.title }}</div>
          <div class="g thead bannerhead" style="--cols:60px minmax(0,1.2fr) minmax(0,1.6fr) 110px 80px;--gap:12px">
            <div>#</div><div>Title</div><div>Subtitle</div><div>Live</div><div></div>
          </div>
          @for (banner of section.items; track banner.id; let i = $index) {
            <app-banner-row [item]="banner" [index]="i" [label]="section.label" (changed)="reload()" />
          }
        </div>
      }

      <!-- Announcement (scrolling text on the user app's home screen) -->
      <div class="card sm">
        <div class="card-title">Announcement (running ticker)</div>
        <div class="g thead bannerhead" style="--cols:minmax(0,1fr) 110px 80px;--gap:12px">
          <div>Text</div><div>Live</div><div></div>
        </div>
        <div class="g annrow" style="--cols:minmax(0,1fr) 110px 80px;--gap:12px;padding:10px 16px">
          <input class="field" style="height:36px;font-weight:600" placeholder="Announcement text"
                 [value]="announcementText" (input)="announcementText = $any($event.target).value" />
          <div class="row gap8">
            <app-toggle [on]="content.announcement.isLive" (changed)="saveAnnouncement(!content.announcement.isLive, false)" />
            <div class="toggle-label">{{ content.announcement.isLive ? 'Live' : 'Hidden' }}</div>
          </div>
          <button class="btn outline full" (click)="saveAnnouncement(content.announcement.isLive, true)">Save</button>
        </div>
      </div>
    }
  `,
})
export class ContentComponent {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  data = signal<ContentData | null>(null); // null until the first load finishes
  error = signal<string | null>(null);
  announcementText = ''; // what is typed in the announcement box

  constructor() {
    this.reload();
  }

  // Fetches all banners and the announcement. Also called after any banner is saved.
  reload(): void {
    this.api.get<ContentData>('/content').subscribe({
      next: (content) => {
        this.data.set(content);
        this.announcementText = content.announcement.text;
      },
      error: (error) => this.error.set(errorMessage(error)),
    });
  }

  // The two banner groups, in the order they are shown.
  sections(content: ContentData) {
    return [
      { title: 'Home popup banners', label: 'Popup', items: content.popup },
      { title: 'Home page banners', label: 'Home', items: content.home },
    ];
  }

  // Saves the announcement text and Live state. The toggle saves silently; the Save button shows a toast.
  saveAnnouncement(isLive: boolean, showMessage: boolean): void {
    this.api.put('/content/announcement', { text: this.announcementText, isLive }).subscribe({
      next: () => {
        if (showMessage) this.ui.toast('Announcement saved');
        this.reload();
      },
      error: (error) => this.ui.toast(errorMessage(error)),
    });
  }
}
