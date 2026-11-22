import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';
import { Html, escapeHtml } from './user-h';

// The [uMorph] directive: shows a view-model value that is an element built by h() (a coin, a chart, the order
// animation) or plain text. The generated template uses it like:  <span [uMorph]="vm.heroObj"></span>
//
// Why not just set innerHTML? Replacing innerHTML throws away the old elements and creates new ones, so any CSS
// animation inside restarts from the beginning (the order animation used to stutter because of this).
// Instead this directive compares the new HTML with what is already on the page and changes only what differs
// (like React does), so running animations and transitions continue smoothly.
@Directive({ selector: '[uMorph]', standalone: true })
export class UMorphDirective implements OnChanges {
  @Input() uMorph: unknown;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private lastRenderedHtml: string | null = null;

  // Runs whenever the bound value changes.
  ngOnChanges(): void {
    const html = toHtml(this.uMorph);
    if (html === this.lastRenderedHtml) return;
    this.lastRenderedHtml = html;
    const parsedTemplate = document.createElement('template');
    parsedTemplate.innerHTML = html;
    patchChildren(this.host, parsedTemplate.content);
  }
}

// Same rules as the prototype runtime: null/undefined/booleans render nothing, text goes in <span class="sc-interp">.
export function toHtml(value: unknown): string {
  if (value instanceof Html) return value.html;
  if (Array.isArray(value)) return value.map(toHtml).join('');
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  return '<span class="sc-interp">' + escapeHtml(value) + '</span>';
}

// Makes the children of `target` match the children of `desired`, reusing existing nodes by position.
function patchChildren(target: Node, desired: Node): void {
  const currentChildren = Array.from(target.childNodes);
  const desiredChildren = Array.from(desired.childNodes);
  desiredChildren.forEach((desiredChild, index) => {
    const currentChild = currentChildren[index];
    if (!currentChild) target.appendChild(desiredChild);
    else patchNode(target, currentChild, desiredChild);
  });
  for (let index = desiredChildren.length; index < currentChildren.length; index++) target.removeChild(currentChildren[index]);
}

// Makes one existing node match the desired one: replace it if it's a different kind of node,
// otherwise update its text or attributes and then its children.
function patchNode(parent: Node, currentNode: Node, desiredNode: Node): void {
  if (currentNode.nodeType !== desiredNode.nodeType || currentNode.nodeName !== desiredNode.nodeName) {
    parent.replaceChild(desiredNode, currentNode);
    return;
  }
  if (currentNode.nodeType !== Node.ELEMENT_NODE) {
    if (currentNode.nodeValue !== desiredNode.nodeValue) currentNode.nodeValue = desiredNode.nodeValue;
    return;
  }
  const currentElement = currentNode as Element, desiredElement = desiredNode as Element;
  for (const attribute of Array.from(desiredElement.attributes)) {
    if (currentElement.getAttribute(attribute.name) !== attribute.value) currentElement.setAttribute(attribute.name, attribute.value);
  }
  for (const attribute of Array.from(currentElement.attributes)) {
    if (!desiredElement.hasAttribute(attribute.name)) currentElement.removeAttribute(attribute.name);
  }
  patchChildren(currentElement, desiredElement);
}
