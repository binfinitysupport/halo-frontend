// The B-Infinity user app (the customer "journey"), served at "/".
//
// How it is built – read this first:
//   - The screens (user-app.html), the styles (user-app.css) and the logic (user-logic.ts) are GENERATED from
//     prototypes/b-infinity-prototype.html by tools/convert.js. Don't edit those three files by hand.
//   - user-logic.ts is the prototype's own code: a class with `state`, `setState()` and `renderVals()`.
//     `renderVals()` returns a "view model" – every value and click handler the screens need.
//   - This component connects that generated code to Angular:
//       state changes → `version` goes up → `vm` (the view model) is recalculated → the template re-renders.
//     It also zooms the 402px-wide design to fit any phone, and hands admin logins over to the admin panel.
//
// Map of this file (top to bottom):
//   1. Sizes and timers             – the numbers at the top (phone width, coin size, refresh times)
//   2. Fields                       – the variables this component keeps
//   3. Admin login hand-over        – tryAdminLogin()
//   4. Backend calls and helpers    – content, account, register/login, deposits, withdrawals, transfers, KYC,
//                                     password; plus the ticker, banner and popup helpers the template uses
//   5. Screen rendering             – vm, uShow()/uSync(), Angular lifecycle hooks, placeResultCoin(), fit(), bindRefs()
import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAuthService } from '../core/admin-auth.service';
import { UserAppLogic } from './user-logic';
import { UMorphDirective } from './user-morph.directive';
import { userApi, UserApiError, formatBillDate, toScreenBill, toScreenUser } from './user-api';

// The prototype screens are designed 402px wide. On phones (≤ 600px) the screen is zoomed to the phone's width;
// on wider screens it is shown as a centred 402px column at normal size.
const DESIGN_WIDTH = 402;
const PHONE_MAX = 600;

// Order result screen (see placeResultCoin). In the 874px-tall design the coin rests centred 128px from the top
// at 72% size, above the result card. These numbers describe that layout.
const RESULT_CARD_BOTTOM_GAP = 22;        // card's distance from the bottom of the screen
const MIN_SPACE_FOR_COIN = 92;            // space always left free above the card
const RESULT_CARD_BOTTOM_PADDING = 16;    // card's bottom padding (removed from scrollHeight when measuring)
const ROOM_NEEDED_FOR_DESIGN_COIN = 198;  // card top below this → the coin needs to move/shrink
const COIN_SIZE = 150;                    // coin diameter at 100% scale
const COIN_MAX_SCALE = 0.72;              // the design's scale for the resting coin
const COIN_MIN_SCALE = 0.4;               // never shrink the coin below this
const COIN_VERTICAL_MARGIN = 24;          // total space kept around the coin when sizing it
const COIN_TOP_MARGIN = 8;                // minimum gap between the coin and the top of the screen

// How often the app asks the server for the latest content, and for a deposit's status while it waits.
const CONTENT_REFRESH_MS = 60 * 1000;
const DEPOSIT_POLL_MS = 5 * 1000;
// The deposit networks in the order the screen lists them (same order as DEPOSIT_OPTIONS on the server).
const DEPOSIT_OPTION_IDS = ['USDT-TRC20', 'USDT-BEP20', 'USDC-BEP20', 'ETH-BEP20'];

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [UMorphDirective],
  templateUrl: './user-app.html',
  styleUrl: './user-app.css',
  encapsulation: ViewEncapsulation.None, // the generated CSS is written for the whole page, like the prototype
  preserveWhitespaces: true,             // keep spaces between inline elements, like the prototype's runtime
})
export class UserAppComponent extends UserAppLogic implements AfterViewInit, AfterViewChecked, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private changeDetector = inject(ChangeDetectorRef);
  private router = inject(Router);
  private adminAuth = inject(AdminAuthService);

  // ---- 2. Fields ----
  // Cache for the view model (vm): it is rebuilt only when the state version changes.
  private vmVersion = -1;      // the state version the cached view model was built from
  private vmCache: any = null; // the cached view model
  private lastVersion = -1;    // the state version we last ran componentDidUpdate for
  private fitScreen = () => this.fit(); // the same function every time, so the resize listener can be removed

  // Set by placeResultCoin(); the generated logic reads them (undefined = use the prototype's values).
  resCoinY: number | undefined;
  resCoinScale: number | undefined;

  // Latest answer from GET /api/app/content: banners, announcement, support links, limits and maintenance.
  apiContent: any = null;
  private depositTimer: ReturnType<typeof setInterval> | undefined;  // checks a waiting deposit every few seconds
  private contentTimer: ReturnType<typeof setInterval> | undefined;  // reloads the content every minute

  // Runs once when Angular creates the component.
  constructor() {
    // "?mode=login" (e.g. after being redirected from /admin) skips the splash and opens the login form.
    const opensOnLogin = inject(ActivatedRoute).snapshot.queryParamMap.get('mode') === 'login';
    super({ startScreen: opensOnLogin ? 'login' : 'splash', accent: 'Blue', motion: true, maintenance: false });
  }

  // ---- 3. Admin login hand-over ----

  // Runs when an email login is not a user account: the server checks whether it is the admin login.
  // Yes → go to /admin. No → show the user's own error message.
  tryAdminLogin(email: string, password: string, userLoginError: string): void {
    this.adminAuth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl('/admin'),
      error: (error: unknown) => {
        const isLockedOut = error instanceof HttpErrorResponse && error.status === 429; // too many attempts
        const serverMessage = error instanceof HttpErrorResponse ? error.error?.message : null;
        this.toast(isLockedOut && serverMessage ? serverMessage : userLoginError);
      },
    });
  }

  // ---- 4. Backend calls (they use userApi from user-api.ts) ----

  // Runs once the screens exist: loads the public content and restores a saved login.
  private connectToBackend(): void {
    this.loadPublicContent();
    this.contentTimer = setInterval(() => this.loadPublicContent(), CONTENT_REFRESH_MS);
    if (userApi.hasSession()) {
      this.refreshAccount()
        .then(() => this.go('home'))
        .catch(() => userApi.clearSession()); // the saved login is no longer valid
    }
  }

  loadPublicContent(): void {
    userApi.content()
      .then((content) => {
        this.apiContent = content;
        this.setState({ apiMaintenanceOn: content.maintenance.on, maintEnd: content.maintenance.until ?? undefined });
      })
      .catch(() => undefined); // keep the last content if the server can't be reached
  }

  // Loads profile, wallets, bills and KYC status from the server into the screens' state.
  async refreshAccount(): Promise<void> {
    const [profile, wallets, bills, kyc] = await Promise.all([
      userApi.me(), userApi.wallets(), userApi.bills('All'), userApi.kycStatus(),
    ]);
    this.setState((state: any) => ({
      user: toScreenUser(profile.user),
      // Earnings figures are not stored on the server yet, so they start at 0 instead of the prototype's demo numbers.
      wallet: { ...state.wallet, flexible: wallets.flexible, active: wallets.active, today: 0, cumulative: 0 },
      bills: bills.map(toScreenBill),
      kyc: { ...state.kyc, status: kyc.status },
    }));
  }

  // Register or login succeeded: load the account and open the home screen with the airdrop popup.
  afterSignIn(): void {
    this.refreshAccount()
      .then(() => {
        this.setState((state: any) => ({ popupOpen: true, login: { ...state.login, pwd: '' } }));
        this.go('home');
      })
      .catch((error) => this.toast(error.message));
  }

  registerAccount(form: any, inviteCode: string): void {
    userApi.register({
      countryIso: form.iso, phone: form.phone, email: String(form.email).trim(),
      password: form.pwd, fundPassword: form.fund,
      inviteCode: inviteCode || '',
    })
      .then(() => {
        this.setState((state: any) => ({
          reg: { ...state.reg, phone: '', email: '', pwd: '', fund: '', captcha: '', emailTouched: false },
          captcha: this.genCaptcha(),
        }));
        this.afterSignIn();
        this.toast('Account created successfully');
      })
      .catch((error) => {
        this.setState((state: any) => ({ captcha: this.genCaptcha() }));
        this.toast(error.message);
      });
  }

  // Login form: a phone login sends phone + country; an email login sends the email.
  // An email that is not a user account (401) is also offered to the admin login (tryAdminLogin).
  loginAccount(form: any): void {
    const isEmail = form.by === 'email';
    const email = String(form.email || '').trim();
    const password = String(form.pwd || '');
    const details = isEmail ? { email } : { phone: String(form.phone || ''), countryIso: form.iso };
    userApi.login({ ...details, password })
      .then(() => this.afterSignIn())
      .catch((error) => {
        const isWrongDetails = error instanceof UserApiError && error.status === 401;
        if (isEmail && isWrongDetails) this.tryAdminLogin(email, password, error.message);
        else this.toast(error.message);
      });
  }

  signOut(): void {
    userApi.logout().catch(() => undefined);
    this.stopDepositWatch();
    this.setState({
      user: null, popupOpen: false, tx: null, bills: [], authMode: 'login',
      wallet: { flexible: 0, active: 0, today: 0, cumulative: 0 },
    });
    this.go('auth');
    this.toast('You have been logged out');
  }

  savePassword(form: any): void {
    if (!form.next) return this.toast('Enter a new password');
    if (form.next !== form.confirm) return this.toast('New passwords do not match');
    userApi.changePassword(form.cur, form.next)
      .then(() => {
        this.setState({ sheet: null, pwdForm: { cur: '', next: '', confirm: '' } });
        this.toast('Login password updated');
      })
      .catch((error) => this.toast(error.message));
  }

  // Deposit: ask the server for an address (valid for 30 minutes), then show the QR screen.
  continueDeposit(DP: any, NET: any, isAmountEnough: boolean): void {
    if (!isAmountEnough) {
      const amount = parseFloat(DP.amt) || 0;
      return this.toast(amount ? 'Minimum deposit is ' + NET.min + ' ' + NET.coin : 'Enter a deposit amount');
    }
    this.startDeposit(DEPOSIT_OPTION_IDS[DP.net], parseFloat(DP.amt) || 0);
  }

  startDeposit(optionId: string, amount: number): void {
    userApi.createDeposit(optionId, amount)
      .then((deposit) => {
        this.setState((state: any) => ({
          sheet: null,
          dep: {
            ...state.dep, qr: true, exp: deposit.expiresAt,
            live: { option: optionId, amount, trackId: deposit.trackId, addr: deposit.address },
          },
        }));
      })
      .catch((error) => this.toast(error.message));
  }

  // "I have made the payment": the deposit is now waiting for the network; the status is checked until it is credited.
  confirmDepositPayment(DP: any, NET: any, msLeft: number): void {
    const live = DP.live;
    if (!live) return;
    if (msLeft <= 0) return this.startDeposit(live.option, live.amount); // the address expired: make a new one
    this.setState((state: any) => ({
      dep: { ...state.dep, qr: false, amt: '' },
      sheet: null,
      tx: {
        kind: 'dep', state: 'pending', amt: live.amount, net: NET.coin + ' ' + NET.chain, coin: NET.coin,
        addr: live.addr, id: live.trackId, time: formatBillDate(new Date().toISOString()),
      },
    }));
    this.watchDeposit(live.trackId);
  }

  private watchDeposit(trackId: string): void {
    this.stopDepositWatch();
    this.depositTimer = setInterval(() => {
      userApi.depositStatus(trackId).then((deposit) => {
        if (deposit.status === 'Credited') {
          this.stopDepositWatch();
          this.setState((state: any) => (state.tx && state.tx.id === trackId
            ? { tx: { ...state.tx, state: 'done', hash: deposit.txHash || 'Confirmed on the network' } }
            : {}));
          this.refreshAccount().catch(() => undefined);
        } else if (deposit.status === 'Expired') {
          this.stopDepositWatch();
          this.setState({ tx: null });
          this.toast('No payment was received before the address expired');
        }
      }).catch(() => undefined);
    }, DEPOSIT_POLL_MS);
  }

  private stopDepositWatch(): void {
    if (this.depositTimer !== undefined) clearInterval(this.depositTimer);
    this.depositTimer = undefined;
  }

  // Withdrawal: the server holds the amount and takes the 6% fee. The network is chosen from the address format.
  requestWithdrawal(form: any): void {
    const amount = parseFloat(form.amt) || 0;
    const address = String(form.addr || '').trim();
    if (!address) return this.toast('Enter a valid TRC20 address');
    if (amount <= 0) return this.toast('Enter an amount');
    if (!form.fund) return this.toast('Enter your fund password');
    const network = address.startsWith('0x') ? 'BEP20' : 'TRC20';
    userApi.withdraw({ network, address, amount, fundPassword: form.fund })
      .then((withdrawal) => {
        this.setState((state: any) => ({
          sheet: null,
          wd: { addr: '', amt: '', fund: '' },
          tx: { kind: 'wd', state: 'review', amt: amount, addr: address, id: withdrawal.requestId, time: formatBillDate(new Date().toISOString()) },
        }));
        return this.refreshAccount();
      })
      .catch((error) => this.toast(error.message));
  }

  sendTransfer(form: any): void {
    const amount = parseFloat(form.amt) || 0;
    if (amount <= 0) return this.toast('Enter an amount');
    if (!form.fund) return this.toast('Enter your fund password');
    const request = form.mode === 'wallet'
      ? { mode: 'wallet' as const, amount, fundPassword: form.fund }
      : { mode: 'user' as const, recipientUuid: form.to, amount, fundPassword: form.fund };
    userApi.transfer(request)
      .then(() => {
        this.setState((state: any) => ({ sheet: null, transfer: { ...state.transfer, amt: '', to: '', fund: '' } }));
        return this.refreshAccount();
      })
      .then(() => this.toast('Transfer successful'))
      .catch((error) => this.toast(error.message));
  }

  // KYC: the photos are read as data URLs so they can be sent to the server.
  readImageFile(file: File, onLoaded: (dataUrl: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => onLoaded(String(reader.result));
    reader.readAsDataURL(file);
  }

  submitKyc(form: any): void {
    userApi.submitKyc({
      nationality: form.iso, fullName: String(form.name || '').trim(), idType: form.type,
      idNumber: String(form.number || '').trim(), frontImage: form.front, backImage: form.back,
    })
      .then(() => this.refreshAccount())
      .then(() => this.toast('Submitted for review'))
      .catch((error) => this.toast(error.message));
  }

  // Ticker: the admin's announcement when it is live; otherwise the prototype's default lines.
  tickerItems(fallback: string[]): string[] {
    const text = this.apiContent?.announcement;
    return text ? [text] : fallback;
  }

  // Home banners: the admin's titles and subtitles replace the prototype's text, slide by slide.
  bannerSlides(slides: any[]): any[] {
    const homeBanners = this.apiContent?.homeBanners || [];
    return slides.map((slide, index) => (homeBanners[index]
      ? { ...slide, title: homeBanners[index].title, sub: homeBanners[index].subtitle }
      : slide));
  }

  // The airdrop popup shows the admin's first popup banner; the popup only opens when there is one.
  hasPopupBanner(): boolean {
    return (this.apiContent?.popupBanners?.length || 0) > 0;
  }

  popupContent(fallback: any): any {
    const banner = this.apiContent?.popupBanners?.[0];
    if (!banner) return fallback;
    return { ...fallback, tag: 'Announcement', title: banner.title, sub: banner.subtitle, body: banner.subtitle };
  }

  // ---- 5. Screen rendering ----

  // The view model the template reads (vm.something). Rebuilt only when the state has changed.
  get vm(): any {
    if (this.vmVersion !== this.version) {
      this.vmCache = this.renderVals();
      this.vmVersion = this.version;
    }
    return this.vmCache;
  }

  // Used by the template to decide whether to show a value.
  // Same rule as the prototype: null, undefined, true and false show nothing.
  uShow(value: any): boolean {
    return value !== null && value !== undefined && typeof value !== 'boolean';
  }

  // Runs after every keystroke in an input field.
  // It makes Angular note what was typed right away; without it, clearing a field back to '' (e.g. after
  // sending a chat message) can look like "no change" and the old text stays visible.
  uSync(): void {
    this.changeDetector.detectChanges();
  }

  // Runs once, after the screens are first on the page.
  ngAfterViewInit(): void {
    this.bindRefs();
    this.fit();
    window.addEventListener('resize', this.fitScreen);
    this.componentDidMount();
    this.connectToBackend();
  }

  // Runs after every Angular update of the screens.
  ngAfterViewChecked(): void {
    // The state changed since last time: let the prototype logic react (like React's componentDidUpdate).
    if (this.version !== this.lastVersion) {
      this.lastVersion = this.version;
      this.bindRefs();
      this.componentDidUpdate();
    }
    // setState(change, callback): run the callbacks now that the screen shows the change.
    if (this.pendingCallbacks.length) {
      const callbacks = this.pendingCallbacks.splice(0);
      for (const callback of callbacks) callback();
    }
    this.placeResultCoin();
  }

  // Runs when the user leaves the user app: stop listening for resizes and stop the prototype's timers.
  ngOnDestroy(): void {
    window.removeEventListener('resize', this.fitScreen);
    this.stopDepositWatch();
    if (this.contentTimer !== undefined) clearInterval(this.contentTimer);
    this.componentWillUnmount();
  }

  // Order result screen on short phones. In the design the coin sits above the result card; on a short screen
  // the card would cover it. So we measure the free space above the card and move/shrink the coin to fit.
  // On very short phones the card itself is also limited in height (CSS class .u-res-fit in user-app.css).
  private placeResultCoin(): void {
    let coinCenterY: number | undefined;
    let coinScale: number | undefined;

    const resultIsShowing = this.state.task?.phase === 'done';
    const card = resultIsShowing ? this.host.nativeElement.querySelector<HTMLElement>('.u-res-card') : null;

    if (card && card.offsetParent) {
      // Limit the card (scrolling content, pinned buttons) only when it can't fit with room for the coin.
      const screenHeight = (card.offsetParent as HTMLElement).clientHeight;
      const maxCardHeight = screenHeight - RESULT_CARD_BOTTOM_GAP - MIN_SPACE_FOR_COIN;
      const isAlreadyLimited = card.classList.contains('u-res-fit');
      const naturalCardHeight = isAlreadyLimited ? card.scrollHeight - RESULT_CARD_BOTTOM_PADDING : card.offsetHeight;
      card.classList.toggle('u-res-fit', naturalCardHeight > maxCardHeight);
    }

    if (card && card.offsetTop < ROOM_NEEDED_FOR_DESIGN_COIN) {
      const spaceAboveCard = card.offsetTop;
      const scaleThatFits = (spaceAboveCard - COIN_VERTICAL_MARGIN) / COIN_SIZE;
      coinScale = Math.round(Math.max(COIN_MIN_SCALE, Math.min(COIN_MAX_SCALE, scaleThatFits)) * 100) / 100;
      coinCenterY = Math.round(Math.max(spaceAboveCard / 2, (COIN_SIZE * coinScale) / 2 + COIN_TOP_MARGIN));
    }

    if (coinCenterY === this.resCoinY && coinScale === this.resCoinScale) return; // nothing changed

    // Done on the next tick: Angular doesn't allow changing what the screen shows while it is drawing it.
    setTimeout(() => {
      this.resCoinY = coinCenterY;
      this.resCoinScale = coinScale;
      this.forceUpdate();
    });
  }

  // Runs on start and on every window resize: zoom the 402px design to the phone's width and fill its height.
  private fit(): void {
    const screenElement = this.host.nativeElement.querySelector<HTMLElement>('[data-ref="screenRef"]');
    if (!screenElement) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const zoom = viewportWidth <= PHONE_MAX ? viewportWidth / DESIGN_WIDTH : 1;
    screenElement.style.setProperty('zoom', String(zoom));
    screenElement.style.height = viewportHeight / zoom + 'px'; // zoomed, so divide to fill the real height
  }

  // The prototype logic uses React-style refs (rootRef.current etc.) to reach a few elements.
  // Point them at the elements marked data-ref="..." in the template. Runs after every update.
  bindRefs(): void {
    const hostElement = this.host.nativeElement as HTMLElement;
    const findRef = (name: string) => hostElement.querySelector<HTMLElement>('[data-ref="' + name + '"]');
    this.rootRef.current = findRef('rootRef');
    this.scrollRef.current = findRef('scrollRef');
    this.plansRef.current = findRef('plansRef');
    this.chatRef.current = findRef('chatRef');
  }
}
