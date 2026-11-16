import { LoaderComponent } from '../components/loader.component';
import { Component, OnChanges, SimpleChanges, inject, input, output, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { UiStore } from '../core/ui.store';
import { Banner, ContentData } from '../core/models';
import { ToggleComponent } from '../components/toggle.component';

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

  item = input.required<Banner>();
  index = input.required<number>();
  label = input.required<string>();
  changed = output<void>();

  title = '';
  subtitle = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      this.title = this.item().title;
      this.subtitle = this.item().subtitle;
    }
  }

  save(): void {
    this.api.patch(`/content/banners/${this.item().id}`, { title: this.title, subtitle: this.subtitle }).subscribe({
      next: () => { this.ui.toast(`${this.label()} banner ${this.index() + 1} saved`); this.changed.emit(); },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }

  toggle(): void {
    const wasLive = this.item().isLive;
    this.api.patch(`/content/banners/${this.item().id}`, { isLive: !wasLive }).subscribe({
      next: () => {
        this.ui.toast(`${this.label()} banner ${this.index() + 1}${wasLive ? ' hidden' : ' is live'}`);
        this.changed.emit();
      },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }
}

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [LoaderComponent, BannerRowComponent, ToggleComponent],
  template: `
    @if (error(); as e) { <div class="empty">{{ e }}</div> }
    @if (!data() && !error()) { <app-loader label="Loading banners…" /> }
    @if (data(); as d) {
      @for (section of sections(d); track section.title) {
        <div class="card sm">
          <div class="card-title">{{ section.title }}</div>
          <div class="g thead bannerhead" style="--cols:60px minmax(0,1.2fr) minmax(0,1.6fr) 110px 80px;--gap:12px">
            <div>#</div><div>Title</div><div>Subtitle</div><div>Live</div><div></div>
          </div>
          @for (b of section.items; track b.id; let i = $index) {
            <app-banner-row [item]="b" [index]="i" [label]="section.label" (changed)="reload()" />
          }
        </div>
      }

      <div class="card sm">
        <div class="card-title">Announcement (running ticker)</div>
        <div class="g thead bannerhead" style="--cols:minmax(0,1fr) 110px 80px;--gap:12px">
          <div>Text</div><div>Live</div><div></div>
        </div>
        <div class="g annrow" style="--cols:minmax(0,1fr) 110px 80px;--gap:12px;padding:10px 16px">
          <input class="field" style="height:36px;font-weight:600" placeholder="Announcement text"
                 [value]="announcementText" (input)="announcementText = $any($event.target).value" />
          <div class="row gap8">
            <app-toggle [on]="d.announcement.isLive" (changed)="saveAnnouncement(!d.announcement.isLive, false)" />
            <div class="toggle-label">{{ d.announcement.isLive ? 'Live' : 'Hidden' }}</div>
          </div>
          <button class="btn outline full" (click)="saveAnnouncement(d.announcement.isLive, true)">Save</button>
        </div>
      </div>
    }
  `,
})
export class ContentComponent {
  private api = inject(ApiService);
  private ui = inject(UiStore);

  data = signal<ContentData | null>(null);
  error = signal<string | null>(null);
  announcementText = '';

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.get<ContentData>('/content').subscribe({
      next: (d) => {
        this.data.set(d);
        this.announcementText = d.announcement.text;
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  sections(d: ContentData) {
    return [
      { title: 'Home popup banners', label: 'Popup', items: d.popup },
      { title: 'Home page banners', label: 'Home', items: d.home },
    ];
  }

  saveAnnouncement(isLive: boolean, showMessage: boolean): void {
    this.api.put('/content/announcement', { text: this.announcementText, isLive }).subscribe({
      next: () => {
        if (showMessage) this.ui.toast('Announcement saved');
        this.reload();
      },
      error: (e) => this.ui.toast(errorMessage(e)),
    });
  }
}
