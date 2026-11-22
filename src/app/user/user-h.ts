// A tiny stand-in for React, used by the generated user-logic.ts.
//
// The prototype was written for React, so its code builds some pieces of the screen (coins, charts, the order
// animation) by calling React.createElement(tag, props, ...children). The converter renames those calls to h().
// Here h() does the same job but returns an HTML string wrapped in an `Html` object, e.g.
//   h('div', { style: { width: 10 } }, 'Hi')   →   <div style="width:10px">Hi</div>
// The template shows these values with the [uMorph] directive (user-morph.directive.ts).

const UNITLESS_STYLE_PROPERTIES = new Set(['opacity', 'zIndex', 'fontWeight', 'flex', 'flexGrow', 'flexShrink', 'lineHeight', 'order', 'scale']);
const VENDOR_PREFIX = /^(Webkit|Moz|ms)/;

// "borderTopColor" -> "border-top-color", "WebkitMaskImage" -> "-webkit-mask-image".
const toKebabCase = (camelName: string): string => {
  const withVendorDash = camelName.replace(VENDOR_PREFIX, (prefix) => '-' + prefix.toLowerCase());
  return withVendorDash.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()).replace(/^-/, '');
};

// React-style style object -> inline CSS text; numbers get "px" like React does.
const styleObjectToCss = (style: any): string => {
  if (!style) return '';
  return Object.keys(style)
    .filter((property) => style[property] !== undefined && style[property] !== null && style[property] !== false)
    .map((property) => {
      let value = style[property];
      if (typeof value === 'number' && !UNITLESS_STYLE_PROPERTIES.has(property)) value = value + 'px';
      return (property.startsWith('--') ? property : toKebabCase(property)) + ':' + value;
    })
    .join(';');
};

// Makes text safe to put inside HTML: & " < > become &amp; &quot; &lt; &gt; so text can never become a tag.
export const escapeHtml = (value: any): string =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Marks a string as "already HTML" (built by h()), so it is inserted as markup instead of being escaped as text.
export class Html {
  constructor(readonly html: string) {}
  toString(): string { return this.html; }
}

// Nested child arrays -> one flat list, dropping what React doesn't render (null, undefined, booleans).
const flattenChildren = (children: any[], result: any[] = []): any[] => {
  for (const child of children) {
    if (Array.isArray(child)) flattenChildren(child, result);
    else if (child !== null && child !== undefined && child !== false && child !== true) result.push(child);
  }
  return result;
};

// Builds one element as HTML text: h(tagName, props, ...children) – same arguments as React.createElement.
// props become attributes (style objects become CSS, className becomes class); children are text or other h() results.
export function h(tagName: string, props: any, ...children: any[]): Html {
  const attributes: string[] = [];
  const elementProps = props || {};
  for (const propName of Object.keys(elementProps)) {
    if (propName === 'key' || propName === 'children' || propName === 'ref') continue;
    const propValue = elementProps[propName];
    if (propValue === undefined || propValue === null || propValue === false) continue;
    if (propName === 'style') {
      const css = styleObjectToCss(propValue);
      if (css) attributes.push('style="' + escapeHtml(css) + '"');
      continue;
    }
    const attributeName = propName === 'className'
      ? 'class'
      : (propName === 'viewBox' || propName === 'd' || /^[a-z]+$/.test(propName) ? propName : toKebabCase(propName));
    attributes.push(attributeName + '="' + escapeHtml(propValue === true ? '' : propValue) + '"');
  }
  const innerHtml = flattenChildren(children).map((child) => (child instanceof Html ? child.html : escapeHtml(child))).join('');
  const attributeText = attributes.length ? ' ' + attributes.join(' ') : '';
  return new Html('<' + tagName + attributeText + '>' + innerHtml + '</' + tagName + '>');
}

// Same as React.createRef(): an object whose `current` is set to an element later (see UserAppComponent.bindRefs).
export const ref = (): { current: any } => ({ current: null });
