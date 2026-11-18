import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { UserAppLogic } from './user-logic';
import { UMorphDirective } from './user-morph.directive';

// Design width of the prototype screens. Phones get the screen zoomed to their width; wider
// viewports show it as a centred column at 1:1.
const DESIGN_WIDTH = 402;
const PHONE_MAX = 600;

// The B-Infinity user app (mobile journey). Template and logic are generated from the prototype
// so the screens, animations and behaviour stay the same. Served at "/".
@Component({
  selector: 'app-user',
  standalone: true,
  imports: [UMorphDirective],
  templateUrl: './user-app.html',
  styleUrl: './user-app.css',
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: true,
})
export class UserAppComponent extends UserAppLogic implements AfterViewInit, AfterViewChecked, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private vmVersion = -1;
  private vmCache: any = null;
  private lastVersion = -1;
  private fitScreen = () => this.fit();

  constructor() {
    super({ startScreen: 'splash', accent: 'Blue', motion: true, maintenance: false });
  }

  // View model for the template: recomputed only when state changes.
  get vm(): any {
    if (this.vmVersion !== this.version) {
      this.vmCache = this.renderVals();
      this.vmVersion = this.version;
    }
    return this.vmCache;
  }

  // Same rules as the prototype runtime: null/undefined/booleans render nothing, other values
  // render inside <span class="sc-interp">.
  uShow(v: any): boolean {
    return v !== null && v !== undefined && typeof v !== 'boolean';
  }

  // Called after each input event so [value] bindings record what was typed; otherwise a
  // reset to '' (e.g. after sending a chat message) can look unchanged and leave stale text.
  uSync(): void {
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    this.bindRefs();
    this.fit();
    window.addEventListener('resize', this.fitScreen);
    this.componentDidMount();
  }

  ngAfterViewChecked(): void {
    if (this.version !== this.lastVersion) {
      this.lastVersion = this.version;
      this.bindRefs();
      this.componentDidUpdate();
    }
    if (this.pendingCallbacks.length) {
      const cbs = this.pendingCallbacks.splice(0);
      for (const cb of cbs) cb();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.fitScreen);
    this.componentWillUnmount();
  }

  private fit(): void {
    const el = this.host.nativeElement.querySelector<HTMLElement>('[data-ref="screenRef"]');
    if (!el) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const zoom = vw <= PHONE_MAX ? vw / DESIGN_WIDTH : 1;
    el.style.setProperty('zoom', String(zoom));
    el.style.height = vh / zoom + 'px';
  }

  bindRefs(): void {
    const root = this.host.nativeElement as HTMLElement;
    const q = (name: string) => root.querySelector<HTMLElement>('[data-ref="' + name + '"]');
    this.rootRef.current = q('rootRef');
    this.scrollRef.current = q('scrollRef');
    this.plansRef.current = q('plansRef');
    this.chatRef.current = q('chatRef');
  }
}
