import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';
import { Html, escapeHtml } from './user-h';

// Renders a slot that holds an element built by h() (coins, charts, the order animation) or plain text.
// Instead of replacing innerHTML, it patches the existing DOM in place (like React's reconciliation),
// so running CSS animations and transitions are not restarted when the element is re-rendered.
@Directive({ selector: '[uMorph]', standalone: true })
export class UMorphDirective implements OnChanges {
  @Input() uMorph: unknown;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private last: string | null = null;

  ngOnChanges(): void {
    const html = toHtml(this.uMorph);
    if (html === this.last) return;
    this.last = html;
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    patchChildren(this.host, tpl.content);
  }
}

// Same rules as the prototype runtime: null/undefined/booleans render nothing, text goes in <span class="sc-interp">.
export function toHtml(v: unknown): string {
  if (v instanceof Html) return v.html;
  if (Array.isArray(v)) return v.map(toHtml).join('');
  if (v === null || v === undefined || typeof v === 'boolean') return '';
  return '<span class="sc-interp">' + escapeHtml(v) + '</span>';
}

function patchChildren(target: Node, source: Node): void {
  const current = Array.from(target.childNodes);
  const next = Array.from(source.childNodes);
  next.forEach((n, i) => {
    const c = current[i];
    if (!c) target.appendChild(n);
    else patchNode(target, c, n);
  });
  for (let i = next.length; i < current.length; i++) target.removeChild(current[i]);
}

function patchNode(parent: Node, c: Node, n: Node): void {
  if (c.nodeType !== n.nodeType || c.nodeName !== n.nodeName) {
    parent.replaceChild(n, c);
    return;
  }
  if (c.nodeType !== Node.ELEMENT_NODE) {
    if (c.nodeValue !== n.nodeValue) c.nodeValue = n.nodeValue;
    return;
  }
  const ce = c as Element, ne = n as Element;
  for (const a of Array.from(ne.attributes)) {
    if (ce.getAttribute(a.name) !== a.value) ce.setAttribute(a.name, a.value);
  }
  for (const a of Array.from(ce.attributes)) {
    if (!ne.hasAttribute(a.name)) ce.removeAttribute(a.name);
  }
  patchChildren(ce, ne);
}
