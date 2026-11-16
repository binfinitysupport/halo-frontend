// Minimal replacement for React.createElement / createRef used by the ported prototype logic.
// h() returns an Html value; the Angular template inserts it with [innerHTML] via node().

const UNITLESS = new Set(['opacity', 'zIndex', 'fontWeight', 'flex', 'flexGrow', 'flexShrink', 'lineHeight', 'order', 'scale']);
const VENDOR = /^(Webkit|Moz|ms)/;

const kebab = (name: string): string => {
  let n = name.replace(VENDOR, (m) => '-' + m.toLowerCase());
  return n.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()).replace(/^-/, '');
};

const styleString = (style: any): string => {
  if (!style) return '';
  return Object.keys(style)
    .filter((k) => style[k] !== undefined && style[k] !== null && style[k] !== false)
    .map((k) => {
      let v = style[k];
      if (typeof v === 'number' && !UNITLESS.has(k)) v = v + 'px';
      return (k.startsWith('--') ? k : kebab(k)) + ':' + v;
    })
    .join(';');
};

export const escapeHtml = (v: any): string =>
  String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class Html {
  constructor(readonly html: string) {}
  toString(): string { return this.html; }
}

const flatten = (xs: any[], out: any[] = []): any[] => {
  for (const x of xs) {
    if (Array.isArray(x)) flatten(x, out);
    else if (x !== null && x !== undefined && x !== false && x !== true) out.push(x);
  }
  return out;
};

export function h(type: string, props: any, ...children: any[]): Html {
  const attrs: string[] = [];
  const p = props || {};
  for (const key of Object.keys(p)) {
    if (key === 'key' || key === 'children' || key === 'ref') continue;
    const val = p[key];
    if (val === undefined || val === null || val === false) continue;
    if (key === 'style') {
      const s = styleString(val);
      if (s) attrs.push('style="' + escapeHtml(s) + '"');
      continue;
    }
    const name = key === 'className' ? 'class' : (key === 'viewBox' || key === 'd' || /^[a-z]+$/.test(key) ? key : kebab(key));
    attrs.push(name + '="' + escapeHtml(val === true ? '' : val) + '"');
  }
  const inner = flatten(children).map((c) => (c instanceof Html ? c.html : escapeHtml(c))).join('');
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
  return new Html('<' + type + attrStr + '>' + inner + '</' + type + '>');
}

export const ref = (): { current: any } => ({ current: null });
