export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;

  const div = document.createElement('div');
  div.innerHTML = html;

  const allowedTags = new Set([
    'P', 'BR', 'STRONG', 'EM', 'U', 'S', 'A', 'UL', 'OL', 'LI',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'CODE', 'PRE',
    'IMG', 'SPAN', 'DIV', 'B', 'I', 'SMALL', 'SUB', 'SUP',
  ]);

  const allowedAttrs = new Set(['href', 'src', 'alt', 'title', 'class', 'id']);

  function walk(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (!allowedTags.has(el.tagName)) {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el);
        }
        el.remove();
        return;
      }

      const attrsToRemove: string[] = [];
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (!allowedAttrs.has(attr.name.toLowerCase())) {
          attrsToRemove.push(attr.name);
        }
      }
      attrsToRemove.forEach(name => el.removeAttribute(name));

      if (el.tagName === 'A') {
        const href = el.getAttribute('href');
        if (href && (href.startsWith('javascript:') || href.startsWith('data:'))) {
          el.removeAttribute('href');
        }
      }
    }

    const children = Array.from(node.childNodes);
    children.forEach(walk);
  }

  walk(div);
  return div.innerHTML;
}
