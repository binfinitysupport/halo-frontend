// STEP 3 of 3 – turn the prototype into the Angular user app.
//
// Input  (from steps 1–2): <unpackDir>/logic.js and <unpackDir>/markup.html
// Output (in src/app/user): user-logic.ts, user-app.html, user-app.css  ← GENERATED, never edit them by hand
//
// What happens, in order:
//   3a. logic.js   → user-logic.ts   The prototype's React-style class becomes a plain TypeScript class.
//                                     A few small, named "patches" adjust it (each has a comment saying why).
//   3b. markup.html → user-app.html  The prototype's template tags (<sc-if>, <sc-for>, {{ }}, sc-camel-on-*)
//                                     become Angular syntax (@if, @for, (click) …). The phone frame is dropped.
//   3c. styles     → user-app.css    The prototype's CSS plus the responsive "shell" that replaces the phone frame.
//   Readability: user-logic.ts is printed with one property per line (formatTypeScript), and every screen and
//                sheet in user-app.html gets a "SCREEN: …" comment (labelScreens), so you can search for them.
//
// Usage:  node tools/convert.js <unpackDir> src/app/user      (see client/README.md "Regenerating the user app")
const fs = require('fs');
const path = require('path');
const [, , unpackDir, outputDir] = process.argv;
fs.mkdirSync(outputDir, { recursive: true });
const prototypeLogic = fs.readFileSync(path.join(unpackDir, 'logic.js'), 'utf8');
const prototypeMarkup = fs.readFileSync(path.join(unpackDir, 'markup.html'), 'utf8');

// ---------- 3a. logic: React class component -> plain TypeScript class (user-logic.ts) ----------
// The prototype class extends React's component base. We replace that with a tiny base of our own:
// `state` holds the data, `setState()` merges changes and bumps `version`, and Angular re-renders when
// `version` changes (see UserAppComponent.vm). React.createElement becomes h() from user-h.ts.
let logic = prototypeLogic
  .replace(/^\s*class Component extends DCLogic \{/m,
`export class UserAppLogic {
  version = 0;
  props: any = {};
  state: any = {};
  pendingCallbacks: Array<() => void> = [];
  setState(p: any, cb?: () => void): void {
    const patch = typeof p === 'function' ? p(this.state) : p;
    if (cb) this.pendingCallbacks.push(cb);
    if (!patch) return;
    this.state = Object.assign({}, this.state, patch);
    this.version++;
  }
  forceUpdate(): void { this.version++; }`)
  .replace(/React\.createElement/g, 'h')
  .replace(/React\.createRef\(\)/g, 'ref()')
  .replace(/\bsuper\(props\);/, 'this.props = props;');
if (/React\./.test(logic)) throw new Error('unconverted React usage: ' + logic.match(/.{40}React\..{40}/)[0]);

// Replaces exactly one occurrence in the logic; fails loudly if the prototype changed and the text is gone.
function patchOnce(from, to) {
  if (logic.split(from).length !== 2) throw new Error('expected one match for: ' + from);
  logic = logic.replace(from, to);
}

// Replaces the text from `startText` through `endText` (inclusive) with `to`. Both must match once, in that order.
// Used for multi-line prototype handlers that are swapped for a call to the component.
function patchRange(startText, endText, to) {
  if (logic.split(startText).length !== 2) throw new Error('expected one match for: ' + startText);
  const start = logic.indexOf(startText);
  const endAt = logic.indexOf(endText, start);
  if (endAt < 0) throw new Error('end not found for: ' + startText);
  logic = logic.slice(0, start) + to + logic.slice(endAt + endText.length);
}

// Order result: on phones shorter than the 874px design the result card reaches the coin's resting spot.
// The component measures the space above the card and sets resCoinY/resCoinScale; unset = prototype values.
patchOnce('coinY = done ? 128 : cy;', 'coinY = done ? (this.resCoinY ?? 128) : cy;');
patchOnce("transform: done ? 'scale(.72)' : 'scale(1)'", "transform: done ? 'scale(' + (this.resCoinScale ?? .72) + ')' : 'scale(1)'");

// startScreen 'login' (used when /admin redirects to the login form): show the auth screen in login mode,
// without the splash and without signing in the demo user.
patchOnce("screen: start || 'auth',", "screen: start === 'login' ? 'auth' : start || 'auth',");
patchOnce("user: start && start !== 'auth' ? seedUser : null", "user: start && start !== 'auth' && start !== 'login' ? seedUser : null");

// ---- Backend wiring ----
// The prototype's handlers keep their validation and screen text, but the data work is done by UserAppComponent
// (user-app.component.ts), which calls the server through user-api.ts. Inside these handlers `this` is that component.

// Login: the server checks the phone/email and password. An email that is not a user account is offered to the admin login.
patchRange("const acc = L.by === 'phone' ? s.accounts.find", "this.go('home');", "return this.loginAccount(L);");

// Register: the prototype's own checks stay; the account is created on the server.
patchRange("if (s.accounts.some(a => a.phone === digits && a.iso === R.iso))", "this.go('home'); this.toast('Account created successfully');", "return this.registerAccount(R, s.invite);");

patchOnce("logout: () => { this.setState({user: null, authMode: 'login', popupOpen: false}); this.go('auth'); this.toast('You have been logged out'); },", "logout: () => this.signOut(),");
patchRange("savePassword: () => { if (P.cur !== user.pwd)", "this.toast('Login password updated'); },", "savePassword: () => this.savePassword(P),");

patchRange("submitTransfer: () => { const a = parseFloat(T.amt) || 0;", "this.toast('Transfer successful'); },", "submitTransfer: () => this.sendTransfer(T),");

// Deposit: the address comes from the server (liveAddr); the prototype's demo address is only a fallback before a deposit starts.
patchRange("depContinue: () => { if (!depOk)", "exp: Date.now() + 30 * 60e3}})); },", "depContinue: () => this.continueDeposit(DP, NET, depOk),");
patchOnce("depLeft = DP.qr ? Math.max(0, DP.exp - Date.now()) : 0;", "depLeft = DP.qr ? Math.max(0, DP.exp - Date.now()) : 0, liveAddr = DP.live ? DP.live.addr : NET.addr;");
patchOnce("chainLabel: NET.chain, addr: NET.addr,", "chainLabel: NET.chain, addr: liveAddr,");
patchOnce("path: qrPath(NET.addr)", "path: qrPath(liveAddr)");
patchOnce("depCopy: () => this.copy(NET.addr,", "depCopy: () => this.copy(liveAddr,");
patchOnce("copyAddress: () => this.copy(NET.addr,", "copyAddress: () => this.copy(liveAddr,");
patchRange("depPaid: () => { if (depLeft <= 0)", "null), 3200); },", "depPaid: () => this.confirmDepositPayment(DP, NET, depLeft),");

// Withdrawal and KYC.
patchRange("submitWithdraw: () => { const a = parseFloat(WD.amt) || 0;", "st.bills]})); },", "submitWithdraw: () => this.requestWithdrawal(WD),");
patchOnce("if (f) this.upd('kyc', {[key]: URL.createObjectURL(f)}); };", "if (f) this.readImageFile(f, (url) => this.upd('kyc', {[key]: url})); };");
patchOnce("kycSubmit: () => { if (!K.front || !K.back) return this.toast('Upload both photos to continue'); this.upd('kyc', {status: 'pending'}); this.toast('Submitted for review'); },", "kycSubmit: () => { if (!K.front || !K.back) return this.toast('Upload both photos to continue'); this.submitKyc(K); },");

// Screens that need a signed-in user go to the login screen instead of using a demo account.
patchOnce("const authed = (fn) => () => { if (!s.user) this.setState({user: s.accounts[0]}); fn(); };", "const authed = (fn) => () => { if (!s.user) return this.go('auth'); fn(); };");
patchOnce("else { this.setState({splash: false, user: s.user || s.accounts[0]}); this.go(id); }", "else { if (!s.user) return this.go('auth'); this.setState({splash: false}); this.go(id); }");

// Maintenance from the admin (apiMaintenanceOn) in addition to the prototype's own preview switch.
patchOnce("const maintActive = s.maint || !!this.props.maintenance,", "const maintActive = s.maint || s.apiMaintenanceOn || !!this.props.maintenance,");

// Popup: the admin's first popup banner; the popup only opens when there is one.
patchOnce("const popup = {tag:'Airdrop event'", "const popup = this.popupContent({tag:'Airdrop event'");
patchOnce("cta:'Join now'};", "cta:'Join now'});");
patchOnce("popupOpen: s.popupOpen && s.screen === 'home',", "popupOpen: s.popupOpen && s.screen === 'home' && this.hasPopupBanner(),");

// Home banners: the admin's titles and subtitles (slides without an admin banner keep the prototype text).
patchOnce("      banners: [\n", "      banners: this.bannerSlides([\n");
patchOnce("      ],\n      dots:", "      ]),\n      dots:");

// Ticker: the admin's announcement when live; otherwise the prototype's lines.
patchOnce("go(screen, extra) {", "go(screen: string, extra?: any) {");

// Register: the invite code comes only from a referral link (?tid=...). Without one the field is empty.
patchRange("let invite = 'QXP8L9';", "catch (e) {}", "let invite = '';\n    try { invite = new URLSearchParams(location.search).get('tid') || ''; } catch (e) {}");
// Register: Submit is grey and does nothing until the Privacy Policy box is ticked (it is ticked by default).
patchOnce("agreeBg: R.agree ? 'var(--acc,#6B7280)' : 'transparent',", "submitBg: R.agree ? 'var(--acc,#6B7280)' : '#26272B', submitColor: R.agree ? '#fff' : 'rgba(255,255,255,.5)', submitCursor: R.agree ? 'pointer' : 'default', agreeBg: R.agree ? 'var(--acc,#6B7280)' : 'transparent',");
patchOnce("if (!R.agree) return this.toast('Please agree to the Privacy Policy');", "if (!R.agree) return;");
patchOnce("const items = ['Welcome to B-Infinity", "const items = this.tickerItems(['Welcome to B-Infinity");
patchOnce("'Airdrop event: 100,000 USDT giveback is live'];", "'Airdrop event: 100,000 USDT giveback is live']);");
if (/DCLogic/.test(logic)) throw new Error('DCLogic left');
// The header every generated logic file starts with (@ts-nocheck: the prototype code is plain JavaScript).
logic = `// @ts-nocheck
// GENERATED FILE – do not edit by hand.
// Made by tools/convert.js from prototypes/b-infinity-prototype.html (the prototype's logic; React calls replaced by h()/ref()).
// To change it, change the converter or the prototype and regenerate (see client/README.md).
import { h, ref } from './user-h';
` + logic.trim() + '\n';

// ---------- Readable layout for user-logic.ts ----------
// The prototype puts many objects on one long line. TypeScript's own printer re-lays the code out: every object,
// array and block is printed over several lines and the comments are kept. Only the layout changes; the code
// does exactly the same thing (the build and a check of the compiled output confirm it).
const ts = require('typescript');
function formatTypeScript(source) {
  const sourceFile = ts.createSourceFile('user-logic.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  // Makes a copy of `node` that is always printed over several lines. The copy keeps the original position,
  // so the comments that belong to it are still printed.
  const copyAsMultiLine = (node, copy) => {
    ts.setTextRange(copy, node);
    ts.setOriginalNode(copy, node);
    return copy;
  };
  const spreadOutTransformer = (context) => {
    const visit = (node) => {
      const visited = ts.visitEachChild(node, visit, context); // handle the inner parts first
      if (ts.isObjectLiteralExpression(visited)) return copyAsMultiLine(node, ts.factory.createObjectLiteralExpression(visited.properties, true));
      if (ts.isArrayLiteralExpression(visited)) return copyAsMultiLine(node, ts.factory.createArrayLiteralExpression(visited.elements, true));
      if (ts.isBlock(visited)) return copyAsMultiLine(node, ts.factory.createBlock(visited.statements, true));
      return visited;
    };
    return (root) => ts.visitNode(root, visit);
  };
  const result = ts.transform(sourceFile, [spreadOutTransformer]);
  return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(result.transformed[0]);
}
logic = formatTypeScript(logic);
fs.writeFileSync(path.join(outputDir, 'user-logic.ts'), logic);

// Some template values are not text but whole elements (coins, charts, the order animation) built with h().
// To render those correctly we must know which view-model keys hold elements. We find the class methods that
// return elements, then check each key's assignment in the logic for a call to one of them.
const elementBuilderMethods = new Set();
const methodDeclarationPattern = /^\s{2}([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{/gm;
const methodStarts = []; // [methodName, startIndex]
let methodMatch;
while ((methodMatch = methodDeclarationPattern.exec(prototypeLogic))) methodStarts.push([methodMatch[1], methodMatch.index]);
methodStarts.forEach(([methodName, startIndex], position) => {
  const endIndex = position + 1 < methodStarts.length ? methodStarts[position + 1][1] : prototypeLogic.length;
  const methodBody = prototypeLogic.slice(startIndex, endIndex);
  if (/return\s+(React\.createElement|e\(|h\()/.test(methodBody) || /^\s{2}\w+\([^)]*\)\s*\{\s*return React\.createElement/.test(methodBody)) {
    elementBuilderMethods.add(methodName);
  }
});
const elementValuePattern = new RegExp('React\\.createElement\\(|\\be\\(\'|\\bhb\\(|this\\.(' + [...elementBuilderMethods].join('|') + ')\\(');
// True when some view-model key with this name is assigned an element (rather than text) in the logic.
function isElementKey(key) {
  const assignmentPattern = new RegExp('[{,\\s]' + key + '\\s*:\\s*([^\\n]{0,240})', 'g');
  let assignment;
  while ((assignment = assignmentPattern.exec(prototypeLogic))) {
    if (elementValuePattern.test(assignment[1].slice(0, 160))) return true;
  }
  return false;
}

// ---------- 3b. markup: dc-runtime template -> Angular template (user-app.html) ----------
// The prototype's <helmet> block holds its <style> tags: one with @font-face rules, one with the app CSS.
const helmet = prototypeMarkup.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
const helmetStyles = [...helmet.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((styleMatch) => styleMatch[1]);
const fontCss = helmetStyles.find((css) => css.includes('@font-face')) || '';
const appCss = helmetStyles.find((css) => css.includes('@keyframes')) || '';

// The app screen is the 402x874 div inside the phone frame; everything outside it (frame, demo box) is dropped.
const screenOpenTagStart = prototypeMarkup.indexOf('<div style="width:402px;height:874px;');
const screenOpenTagEnd = prototypeMarkup.indexOf('>', screenOpenTagStart) + 1;
const frameCloseIndex = prototypeMarkup.lastIndexOf('</x-import>');
const screenCloseIndex = prototypeMarkup.lastIndexOf('</div>', frameCloseIndex);
let screenStyle = prototypeMarkup.slice(screenOpenTagStart, screenOpenTagEnd).match(/style="([^"]*)"/)[1]
  .replace('width:402px;height:874px;', 'width:100%;height:100%;');
let screenBody = prototypeMarkup.slice(screenOpenTagEnd, screenCloseIndex);

const openBlockScopes = []; // innermost first: '@if' or the loop variable name of an enclosing @for
const usedElementKeys = new Set();
// Prefixes a template expression with "vm." unless it starts with a loop variable or is a literal.
function scoped(expression) {
  expression = expression.trim();
  if (expression === 'true' || expression === 'false' || expression === 'null') return expression;
  const rootName = expression.split('.')[0];
  for (const scopeName of openBlockScopes) if (scopeName === rootName) return expression;
  return 'vm.' + expression;
}
const interpolationOnly = /^\{\{\s*([^}]+?)\s*\}\}$/;
const escapeTemplateText = (text) => text.replace(/@/g, '&#64;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
const DOM_EVENT_NAMES = { click: 'click', input: 'input', blur: 'blur', 'key-down': 'keydown', scroll: 'scroll',
  'pointer-move': 'pointermove', 'pointer-leave': 'pointerleave', 'pointer-up': 'pointerup', 'pointer-down': 'pointerdown', 'pointer-cancel': 'pointercancel' };

// Converts one HTML tag of the prototype template into its Angular form:
//   <sc-if value="{{ x }}">           → @if (vm.x) {
//   <sc-for list="{{ xs }}" as="x">   → @for (x of vm.xs; track $index) {
//   </sc-if>, </sc-for>               → }
//   sc-camel-on-click="{{ f }}"       → (click)="vm.f($event)"
//   attr="{{ x }}"                    → [attr.attr]="vm.x"
function convertTag(tag) {
  if (/^<sc-if\b/.test(tag)) {
    const condition = tag.match(/value="\{\{\s*([^}]+?)\s*\}\}"/)[1];
    openBlockScopes.unshift('@if');
    return '@if (' + scoped(condition) + ') {';
  }
  if (/^<sc-for\b/.test(tag)) {
    const listExpression = tag.match(/list="\{\{\s*([^}]+?)\s*\}\}"/)[1];
    const loopVariable = tag.match(/as="([^"]+)"/)[1];
    const forBlock = '@for (' + loopVariable + ' of ' + scoped(listExpression) + '; track $index) {';
    openBlockScopes.unshift(loopVariable);
    return forBlock;
  }
  if (/^<\/sc-(if|for)>/.test(tag)) { openBlockScopes.shift(); return '}'; }
  if (/^<\//.test(tag) || /^<!/.test(tag)) return tag;

  const tagParts = tag.match(/^<([a-zA-Z][\w-]*)([\s\S]*?)(\/?)>$/);
  if (!tagParts) throw new Error('bad tag ' + tag);
  const [, tagName, attributeText, selfClose] = tagParts;
  const isFileInput = /type="file"/.test(attributeText);
  const convertedAttributes = [];
  const attributePattern = /([^\s=]+)(?:="([^"]*)")?/g;
  let attributeMatch;
  while ((attributeMatch = attributePattern.exec(attributeText))) {
    let [, attributeName, attributeValue] = attributeMatch;
    if (attributeName.startsWith('hint-')) continue;
    if (attributeName === 'ref') { convertedAttributes.push('data-ref="' + attributeValue.match(interpolationOnly)[1] + '"'); continue; }
    if (attributeName === 'sc-camel-view-box') { convertedAttributes.push('viewBox="' + attributeValue + '"'); continue; }
    const eventMatch = attributeName.match(/^sc-camel-on-(.+)$/);
    if (eventMatch) {
      let domEventName = eventMatch[1] === 'change' ? (isFileInput ? 'change' : 'input') : DOM_EVENT_NAMES[eventMatch[1]];
      if (!domEventName) throw new Error('unknown event ' + attributeName);
      // Controlled inputs: sync bindings right after typing so a later reset to '' is detected.
      const syncAfterInput = domEventName === 'input' || domEventName === 'change' ? '; uSync()' : '';
      convertedAttributes.push('(' + domEventName + ')="' + scoped(attributeValue.match(interpolationOnly)[1]) + '($event)' + syncAfterInput + '"');
      continue;
    }
    if (attributeValue === undefined) { convertedAttributes.push(attributeName); continue; }
    if (!attributeValue.includes('{{')) { convertedAttributes.push(attributeName + '="' + attributeValue + '"'); continue; }
    if (attributeName === 'style' || attributeName === 'placeholder') {
      convertedAttributes.push(attributeName + '="' + attributeValue.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => '{{ ' + scoped(expression) + ' }}') + '"');
      continue;
    }
    const singleInterpolation = attributeValue.match(interpolationOnly);
    if (singleInterpolation) {
      convertedAttributes.push((attributeName === 'value' ? '[value]' : '[attr.' + attributeName + ']') + '="' + scoped(singleInterpolation[1]) + '"');
      continue;
    }
    // Mixed text and interpolations -> one string-concatenation binding.
    const concatenatedParts = attributeValue.split(/(\{\{\s*[^}]+?\s*\}\})/).filter(Boolean).map((segment) => {
      const interpolation = segment.match(interpolationOnly);
      return interpolation ? '(' + scoped(interpolation[1]) + ')' : "'" + segment.replace(/'/g, "\\'") + "'";
    });
    convertedAttributes.push('[attr.' + attributeName + ']="' + concatenatedParts.join(' + ') + '"');
  }
  return '<' + tagName + (convertedAttributes.length ? ' ' + convertedAttributes.join(' ') : '') + selfClose + '>';
}

// Converts the text between tags. Each {{ value }} becomes one of:
//   - inside an SVG: plain text (an HTML <span> is not drawn inside SVG)
//   - an element value: <span [uMorph]> which renders the element and keeps its animations running
//   - plain text: <span class="sc-interp">, exactly like the prototype's runtime does
function convertText(text) {
  return text.split(/(\{\{\s*[^}]+?\s*\}\})/).map((segment) => {
    const interpolation = segment.match(interpolationOnly);
    if (!interpolation) return escapeTemplateText(segment);
    const expression = interpolation[1].trim();
    const key = expression.split('.').pop(); // "tx.title" -> "title"
    // Inside SVG an HTML span is not rendered (the prototype loses these labels); use plain text.
    if (svgDepth > 0) return '{{ uShow(' + scoped(expression) + ') ? ' + scoped(expression) + " : '' }}";
    // uMorph patches the DOM in place, so animations inside these elements keep running across re-renders.
    if (isElementKey(key)) { usedElementKeys.add(expression); return '<span style="display:contents" [uMorph]="' + scoped(expression) + '"></span>'; }
    return '@if (uShow(' + scoped(expression) + ')) {<span class="sc-interp">{{ ' + scoped(expression) + ' }}</span>}';
  }).join('');
}

// Walk the screen markup piece by piece: each piece is either a tag ("<...>") or the text between tags.
let html = '';
let svgDepth = 0; // > 0 while we are inside an <svg> element
const tagOrTextPattern = /<[^>]+>|[^<]+/g;
let token;
while ((token = tagOrTextPattern.exec(screenBody))) {
  const tokenText = token[0];
  if (/^<svg\b/.test(tokenText) && !/\/>$/.test(tokenText)) svgDepth++;
  if (/^<\/svg>/.test(tokenText)) svgDepth--;
  html += tokenText[0] === '<' ? convertTag(tokenText) : convertText(tokenText);
}
if (svgDepth) throw new Error('unbalanced svg');
if (openBlockScopes.length) throw new Error('unbalanced sc blocks');

// Full-height screens were fixed to the prototype phone's 874px; let them fill the real screen instead.
html = html.replace(/height:874px;/g, 'min-height:100%;');

// Exact-match replacement in the converted template (fails loudly if the text is not there exactly once).
function patchHtmlOnce(from, to) {
  if (html.split(from).length !== 2) throw new Error('expected one template match for: ' + from);
  html = html.replace(from, () => to);
}
// Register screen: the "Auto-filled from invite link" label only shows when a referral code is present.
patchHtmlOnce('<span style="color:var(--acc-l,#A3A9B3)">Auto-filled from invite link</span>', '@if (vm.invite) {<span style="color:var(--acc-l,#A3A9B3)">Auto-filled from invite link</span>}');
// Replaces the converted template text from `startText` through `endText` (inclusive). Both must match once, in order.
function patchHtmlRange(startText, endText, to) {
  if (html.split(startText).length !== 2) throw new Error('expected one template match for: ' + startText);
  const start = html.indexOf(startText);
  const endAt = html.indexOf(endText, start);
  if (endAt < 0) throw new Error('end not found for: ' + startText);
  html = html.slice(0, start) + to + html.slice(endAt + endText.length);
}
// "How B-Infinity works": the placeholder box becomes the explainer video (served from src/assets/videos).
// preload="metadata" so the video file is only downloaded when someone presses play.
patchHtmlRange(
  '<div (click)="vm.playVideo($event)" style="position:relative;height:204px;',
  'project explainer video</div>\n    </div>',
  '<div style="position:relative;height:204px;border-radius:24px;border:1px solid rgba(255,255,255,.09);overflow:hidden;background:#000">' +
  '<video src="/assets/videos/how-b-infinity-works.mp4" controls playsinline preload="metadata" ' +
  'style="width:100%;height:100%;object-fit:contain;display:block"></video></div>'
);
// Register screen: Submit colour follows the Privacy Policy box.
patchHtmlOnce('(click)="vm.submitRegister($event)" style="height:56px;border-radius:999px;background:var(--acc,#6B7280);', '(click)="vm.submitRegister($event)" style="height:56px;border-radius:999px;background:{{ vm.submitBg }};color:{{ vm.submitColor }};');
patchHtmlOnce('cursor:pointer;margin-top:4px" style-hover="background:var(--acc-h,#7C838E)">Submit</div>', 'cursor:{{ vm.submitCursor }};margin-top:4px" style-hover="background:var(--acc-h,#7C838E)">Submit</div>');

// ---------- Readable template: a comment before each screen and sheet ----------
// The template is one long tree, so these comments make each screen easy to find (search for "SCREEN:").
// A comment is removed when Angular builds the page, so the screen looks the same.
const SCREEN_LABELS = {
  isAuth: 'Sign in / sign up (start screen)',
  isRegister: 'Register form',
  isLogin: 'Login form',
  isHome: 'Home tab',
  isPlans: 'Subscription (plans) screen',
  isMarkets: 'Strategy (markets) tab',
  isDetail: 'Coin detail screen',
  isTrade: 'Trade (buy / sell) screen',
  isSuccess: 'Order result screen',
  isTeam: 'Team screen',
  isAssets: 'Assets tab (wallet)',
  isBills: 'Bills (billing history) screen',
  isHelp: 'Help center screen',
  isPoints: 'Points mall screen',
  isAgency: 'Agency alliance screen',
  isAbout: 'About us screen',
  isTxHistory: 'Transaction history screen',
  isProfile: 'Profile tab',
  isKyc: 'KYC (identity check) screen',
  sheetCountry: 'Sheet: country picker',
  sheetLang: 'Sheet: language picker',
  sheetChat: 'Sheet: chat with support',
  sheetInfo: 'Sheet: information message',
  sheetPassword: 'Sheet: change login password',
  sheetTransfer: 'Sheet: transfer',
  sheetDeposit: 'Sheet: deposit',
  sheetWithdraw: 'Sheet: withdraw',
  sheetSupport: 'Sheet: support',
  sheetServers: 'Sheet: choose a server (strategy order)',
  sheetSalary: 'Sheet: salary',
  popupOpen: 'Airdrop popup (over the home screen)',
  referOn: 'Refer-a-friend overlay',
  maintOn: 'Maintenance page (covers the app)',
  txOn: 'Transaction result overlay',
  depQrOn: 'Deposit QR overlay',
  fxOn: 'Order animation overlay',
  toastOn: 'Toast message',
};
const seenLabels = new Set();
html = html.replace(/^([ ]*)@if \(vm\.(\w+)\) \{/gm, (whole, indent, flag) => {
  const label = SCREEN_LABELS[flag];
  if (!label) return whole;
  // The second "isDetail" block is the bottom buy/sell bar of the same coin detail screen.
  const displayLabel = flag === 'isDetail' && seenLabels.has(flag) ? 'Coin detail: bottom buy / sell bar' : label;
  seenLabels.add(flag);
  return indent + '<!-- SCREEN: ' + displayLabel + ' -->\n' + whole;
});

// Phones are shorter than the 874px design: hooks so the server sheet can keep its button on screen (see CSS).
function addClassToOnlyMatch(divPattern, className) {
  const matchCount = (html.match(divPattern) || []).length;
  if (matchCount !== 1) throw new Error('expected one match for ' + divPattern + ', found ' + matchCount);
  html = html.replace(divPattern, (divTag) => divTag.replace('<div ', '<div class="' + className + '" '));
}
addClassToOnlyMatch(/<div style="position:absolute;left:0;right:0;bottom:0;z-index:61;max-height:82%;[^"]*">/, 'u-sheet');
addClassToOnlyMatch(/<div style="overflow-y:auto;flex:1;min-height:0;max-height:430px;[^"]*">/, 'u-srv-list');
addClassToOnlyMatch(/<div style="position:absolute;left:16px;right:16px;bottom:22px;z-index:151;[^"]*">/, 'u-res-card');
addClassToOnlyMatch(/<div style="display:flex;gap:10px;margin-top:12px;animation:hRise \.7s cubic-bezier\(\.2,\.8,\.2,1\) \.7s both">/, 'u-res-actions');
// Wrap the screen in our responsive shell (styled in user-app.css) instead of the prototype's phone frame.
const GENERATED_HTML_HEADER = `<!--
  GENERATED FILE – do not edit by hand.
  Made by tools/convert.js from prototypes/b-infinity-prototype.html (the prototype's screens).
  To change it, change the converter or the prototype and regenerate (see client/README.md).
-->
`;
const template = GENERATED_HTML_HEADER + `<div class="u-root" data-ref="rootRef">
  <div class="u-screen" data-ref="screenRef">
    <div style="${screenStyle}">${html}</div>
  </div>
</div>
`;
fs.writeFileSync(path.join(outputDir, 'user-app.html'), template);

// ---------- 3c. css: prototype styles + responsive shell (user-app.css) ----------
// Keep only the Inter font faces (Manrope comes from @fontsource) and point them at src/assets/fonts/.
const interFontFaces = (fontCss.match(/@font-face\s*\{[^}]*\}/g) || []).filter((fontFace) => /'Inter'/.test(fontFace));
const fontFiles = [];
const interFontCss = interFontFaces.map((fontFace) => fontFace.replace(/url\("([^"]+)"\)/, (_, fontFile) => {
  fontFiles.push(fontFile);
  return 'url("/assets/fonts/' + fontFile + '")';
})).join('\n');
// Global rules from the prototype (body, a, input placeholder) are limited to the user app (.u-root)
// so they don't leak into the admin panel.
const scopedAppCss = appCss
  .replace(/^body\{[^}]*\}\s*$/m, '')
  .replace(/^a\{/m, '.u-root a{').replace(/\}a:hover\{/, '}.u-root a:hover{')
  .replace(/^input::placeholder/m, '.u-root input::placeholder').trim();
fs.writeFileSync(path.join(outputDir, 'user-app.css'), `/* GENERATED FILE – do not edit by hand.
   Made by tools/convert.js from prototypes/b-infinity-prototype.html (the prototype's styles + the responsive shell).
   To change it, change the converter or the prototype and regenerate (see client/README.md). */
${interFontCss}
${scopedAppCss}

/* Responsive shell (replaces the prototype's phone frame). The screen keeps the 402px design width;
   the component zooms it to the phone's width so every screen matches the prototype on any phone. */
.u-root { width: 100%; height: 100dvh; overflow: hidden; display: flex; justify-content: center; background: #050506; }
.u-screen { position: relative; flex: none; width: 402px; height: 100dvh; overflow: hidden; background: #0A0A0A; }
@media (min-width: 601px) { .u-screen { box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 30px 80px rgba(0,0,0,.6); } }
/* The admin's global reset uses border-box; the prototype screens are laid out with the browser default. */
.u-screen *, .u-screen *::before, .u-screen *::after { box-sizing: content-box; }
/* Server sheet: lay out as a column so the server list shrinks and scrolls and "Order now" stays visible.
   (The prototype marks the list flex:1 and the rest flex:none, but its sheet is display:block.) */
.u-screen .u-sheet:has(> .u-srv-list) { display: flex !important; flex-direction: column; overflow: hidden !important; }
/* Order result card on very short phones (the component adds .u-res-fit only when the card doesn't fit):
   leave room above it for the coin, scroll its content, and keep "View bills / Done" pinned to its bottom. */
.u-screen .u-res-card.u-res-fit { max-height: calc(100% - 22px - 92px); overflow-y: auto; }
.u-screen .u-res-fit .u-res-actions { position: sticky; bottom: -16px; align-self: stretch; margin-top: 0 !important; margin-bottom: -16px; padding: 12px 0 16px; background: #111214; }
`);

// Font files the CSS references; copy these into src/assets/fonts/ if the prototype's fonts change.
fs.writeFileSync(path.join(unpackDir, 'fonts.txt'), fontFiles.join('\n'));
console.log('elem methods:', [...elementBuilderMethods].join(','));
console.log('elem keys used:', [...usedElementKeys].join(','));
console.log('html', template.length, 'logic', logic.length, 'fonts', fontFiles.length);
