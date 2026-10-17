import DOMPurify from 'dompurify'

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    // 允许安全的 style 属性，但过滤 event handler 和 expression()
    ADD_ATTR: ['style'],
    ALLOWED_ATTR: ['style', 'class', 'id', 'src', 'href', 'alt', 'title', 'width', 'height', 'target', 'rel', 'bgcolor', 'color', 'face', 'size'],
  })
}
