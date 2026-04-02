/**
 * Decode HTML entities if text was stored as escaped HTML.
 * Example: "&lt;b&gt;Hello&lt;/b&gt;" -> "<b>Hello</b>"
 */
export const decodeHtmlEntities = (text) => {
  if (typeof text !== 'string') return text || '';
  if (!/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(text)) return text;

  try {
    const textarea = document.createElement('textarea');
    let current = text;
    for (let i = 0; i < 3; i += 1) {
      textarea.innerHTML = current;
      const decoded = textarea.value;
      if (decoded === current) break;
      current = decoded;
    }
    return current;
  } catch {
    return text;
  }
};

const applyBlockAlignmentMarkers = (text) => {
  return text
    .replace(/\[(center|left|right)\]([\s\S]+?)\[\/\1\]/gi, (_m, align, content) => `<div style="text-align:${String(align).toLowerCase()};">${content}</div>`)
    .replace(/\{(center|left|right)\}([\s\S]+?)\{\/\1\}/gi, (_m, align, content) => `<div style="text-align:${String(align).toLowerCase()};">${content}</div>`);
};

const applyInlineMarkers = (text) => {
  return text
    // Markdown-style
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([\s\S]+?)__/g, '<strong>$1</strong>')
    .replace(/~~([\s\S]+?)~~/g, '<del>$1</del>')
    .replace(/==([\s\S]+?)==/g, '<mark>$1</mark>')

    // BBCode-style + brace-style
    .replace(/\[(b|strong)\]([\s\S]+?)\[\/\1\]/gi, '<strong>$2</strong>')
    .replace(/\{(b|strong)\}([\s\S]+?)\{\/\1\}/gi, '<strong>$2</strong>')
    .replace(/\[(i|em)\]([\s\S]+?)\[\/\1\]/gi, '<em>$2</em>')
    .replace(/\{(i|em)\}([\s\S]+?)\{\/\1\}/gi, '<em>$2</em>')
    .replace(/\[(u)\]([\s\S]+?)\[\/\1\]/gi, '<u>$2</u>')
    .replace(/\{(u)\}([\s\S]+?)\{\/\1\}/gi, '<u>$2</u>')
    .replace(/\[(s|strike|del)\]([\s\S]+?)\[\/\1\]/gi, '<del>$2</del>')
    .replace(/\{(s|strike|del)\}([\s\S]+?)\{\/\1\}/gi, '<del>$2</del>')
    .replace(/\[(mark)\]([\s\S]+?)\[\/\1\]/gi, '<mark>$2</mark>')
    .replace(/\[(sup)\]([\s\S]+?)\[\/\1\]/gi, '<sup>$2</sup>')
    .replace(/\[(sub)\]([\s\S]+?)\[\/\1\]/gi, '<sub>$2</sub>')

    // Optional explicit formatting tokens that may come from imported DB content
    .replace(/\[color=(#[0-9a-f]{3,8}|[a-z]+)\]([\s\S]+?)\[\/color\]/gi, (_m, color, content) => `<span style="color:${String(color).toLowerCase()};">${content}</span>`)
    .replace(/\[bg=(#[0-9a-f]{3,8}|[a-z]+)\]([\s\S]+?)\[\/bg\]/gi, (_m, bg, content) => `<span style="background-color:${String(bg).toLowerCase()};">${content}</span>`)
    .replace(/\[size=(\d{1,2})\]([\s\S]+?)\[\/size\]/gi, (_m, size, content) => {
      const px = Math.max(10, Math.min(48, Number(size)));
      return `<span style="font-size:${px}px;">${content}</span>`;
    })

    // Common line-break markers in plain text payloads
    .replace(/\[(br|linebreak)\]|\{(br|linebreak)\}|<br\s*\/?>/gi, '<br/>');
};

/**
 * Convert DB marker syntax to renderable HTML while keeping existing HTML intact.
 */
export const applyDbFormattingMarkers = (text) => {
  if (typeof text !== 'string') return text || '';
  const decoded = decodeHtmlEntities(text);
  const withBlockMarkers = applyBlockAlignmentMarkers(decoded);
  return applyInlineMarkers(withBlockMarkers);
};

/**
 * Format text content so marker syntax, whitespace, and line-breaks render consistently.
 */
export const formatTextWithWhitespace = (text) => {
  if (typeof text !== 'string') return text || '';
  const withMarkers = applyDbFormattingMarkers(text);
  return withMarkers
    .replace(/\u00A0/g, ' ')
    .replace(/\\t|\/t|\t/g, '    ')
    .replace(/\\n|\n/g, '<br/>');
};

/**
 * Normalize rich HTML from editor/database so render is consistent.
 */
export const normalizeRichHtml = (text) => {
  if (typeof text !== 'string') return text || '';
  const withMarkers = applyDbFormattingMarkers(text);
  return withMarkers
    .replace(/\u00A0/g, ' ')
    .replace(/\\t|\/t|\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/\\n|\n/g, '<br/>');
};

const shouldPreserveAlignment = (node) => {
  if (!node || !node.querySelector) return false;

  const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return false;

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const directBlockTags = new Set(['p', 'div', 'section', 'article', 'header', 'footer', 'blockquote', 'figure', 'figcaption', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const directBlockChildren = Array.from(node.children || []).filter((child) => directBlockTags.has(String(child.tagName || '').toLowerCase()));
  const brCount = (node.innerHTML.match(/<br\s*\/?\s*>/gi) || []).length;

  // A single centered title/heading should stay centered.
  if (directBlockChildren.length === 0 && brCount <= 1) return true;

  // Multi-line / multi-block content should not inherit one alignment for the whole paragraph.
  return wordCount <= 10 && directBlockChildren.length <= 1 && brCount <= 1;
};

const getFontSizeValue = (node) => {
  const raw = String(node?.getAttribute?.('style') || '');
  const size = raw.match(/(?:^|;)\s*font-size\s*:\s*([^;]+)\s*(?:;|$)/i)?.[1];
  if (!size) return '';

  const normalized = String(size).trim();
  return /^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(normalized) ? normalized : '';
};

/**
 * Serialize a contentEditable element so root text alignment survives save/load.
 * This preserves innerHTML and wraps it when the editable itself is centered/right-aligned.
 */
export const serializeContentEditableHtml = (el) => {
  if (!el) return '';

  const html = el.innerHTML || '';
  const align = String(el.style?.textAlign || '').toLowerCase();
  const computedAlign = typeof window !== 'undefined' && el.ownerDocument?.defaultView
    ? String(el.ownerDocument.defaultView.getComputedStyle(el).textAlign || '').toLowerCase()
    : '';

  const resolvedAlign = align || computedAlign;
  if (!resolvedAlign || ['left', 'start', 'initial', 'unset', 'inherit', ''].includes(resolvedAlign)) {
    return html;
  }

  if (!shouldPreserveAlignment(el)) {
    return html;
  }

  return `<div style="text-align:${resolvedAlign};">${html}</div>`;
};

const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const isBoldStyle = (style = '') => /(^|;)\s*font-weight\s*:\s*(bold|[6-9]00|[1-9]\d{2,})/i.test(style);
const isItalicStyle = (style = '') => /(^|;)\s*font-style\s*:\s*italic/i.test(style);
const isUnderlineStyle = (style = '') => /(^|;)\s*text-decoration[^:]*:\s*[^;]*underline/i.test(style) || /(^|;)\s*text-decoration\s*:\s*underline/i.test(style);
const isStrikeStyle = (style = '') => /(^|;)\s*text-decoration[^:]*:\s*[^;]*line-through/i.test(style) || /(^|;)\s*text-decoration\s*:\s*line-through/i.test(style);
const getTextAlign = (node) => {
  const raw = String(node?.getAttribute?.('style') || '');
  const alignStyle = raw.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/i)?.[1];
  const alignAttr = node?.getAttribute?.('align');
  return String(alignStyle || alignAttr || '').toLowerCase();
};

const collapseRepeatedBreaks = (html) => {
  if (typeof html !== 'string') return html || '';
  return html
    .replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br/>')
    .replace(/^(?:<br\s*\/?>\s*)+/i, '')
    .replace(/(?:<br\s*\/?>\s*)+$/i, '');
};

const normalizePlainPasteText = (text) => {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''));

  const blocks = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    const content = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    if (content) blocks.push(`<p>${escapeHtml(content)}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(`<${tag}>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`);
    listItems = [];
    listType = null;
  };

  const pushParagraphLine = (line) => {
    const cleaned = line.trim();
    if (!cleaned) return;
    paragraph.push(cleaned);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^(?:[•\-*–—]|\u2022)\s+(.+)$/);
    const orderedMatch = line.match(/^(\d{1,3})[.)]\s+(.+)$/);

    if (bulletMatch) {
      if (paragraph.length) flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bulletMatch[1].trim());
      continue;
    }

    if (orderedMatch) {
      if (paragraph.length) flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(orderedMatch[2].trim());
      continue;
    }

    if (listItems.length) flushList();
    pushParagraphLine(line);
  }

  flushParagraph();
  flushList();

  return collapseRepeatedBreaks(blocks.join('<br/>'));
};

/**
 * Sanitize pasted HTML while preserving common semantic formatting.
 * Keeps strong/em/u/del and turns block boundaries into simple line breaks.
 */
export const sanitizeRichPasteHtml = (html) => {
  if (typeof html !== 'string') return '';
  const raw = decodeHtmlEntities(html);

  if (!raw.includes('<')) {
    return normalizePlainPasteText(raw);
  }

  try {
    const temp = document.createElement('div');
    temp.innerHTML = raw;

    const serialize = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeHtml(node.textContent || '').replace(/\r?\n/g, '<br/>');
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const tag = node.tagName.toLowerCase();
      if (tag === 'br') return '<br/>';

      const children = Array.from(node.childNodes).map(serialize).join('');
      const style = node.getAttribute?.('style') || '';
      const align = getTextAlign(node);
      const fontSize = getFontSizeValue(node);
      const isEmptyBlock = !children || !children.replace(/<br\s*\/?>/gi, '').trim();

      // Drop empty wrappers from ChatGPT-style copied content.
      if (isEmptyBlock && ['p', 'div', 'section', 'article', 'header', 'footer', 'blockquote', 'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tag)) {
        return '';
      }

      let content = children;
      if (isStrikeStyle(style)) content = `<del>${content}</del>`;
      if (isUnderlineStyle(style)) content = `<u>${content}</u>`;
      if (isItalicStyle(style)) content = `<em>${content}</em>`;
      if (isBoldStyle(style)) content = `<strong>${content}</strong>`;
      if (fontSize) content = `<span style="font-size:${fontSize};">${content}</span>`;

      switch (tag) {
        case 'strong':
        case 'b':
          return `<strong>${content}</strong>`;
        case 'em':
        case 'i':
          return `<em>${content}</em>`;
        case 'u':
          return `<u>${content}</u>`;
        case 'del':
        case 's':
          return `<del>${content}</del>`;
        case 'mark':
          return `<mark>${content}</mark>`;
        case 'sup':
          return `<sup>${content}</sup>`;
        case 'sub':
          return `<sub>${content}</sub>`;
        case 'a': {
          const href = node.getAttribute('href') || '#';
          return `<a href="${escapeHtml(href)}">${content}</a>`;
        }
        case 'li':
          return `${content}<br/>`;
        case 'p':
        case 'div':
        case 'section':
        case 'article':
        case 'header':
        case 'footer':
        case 'blockquote':
        case 'figure':
        case 'figcaption':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          if (align) {
            return isEmptyBlock
              ? '<br/>'
              : `<div style="text-align:${align}; margin:0;">${content}</div><br/>`;
          }
          return `${isEmptyBlock ? '<br/>' : `${content}<br/>`}`;
        case 'span':
          return content;
        case 'ul':
        case 'ol':
          return content;
        default:
          return content;
      }
    };

    return collapseRepeatedBreaks(Array.from(temp.childNodes).map(serialize).join('').trim());
  } catch {
    return normalizePlainPasteText(raw);
  }
};

/**
 * Strip inline styles and unwanted attributes from HTML
 * Keep semantic tags like <strong>, <em>, <u>, <b>, <i>
 */
export const stripInlineStyles = (html) => {
  if (typeof html !== 'string') return html || '';

  try {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove style, class, id from all elements
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
      const style = String(el.getAttribute('style') || '');
      const align = style.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/i)?.[1];
      const fontSize = style.match(/(?:^|;)\s*font-size\s*:\s*([^;]+)\s*(?:;|$)/i)?.[1];
      if (align && shouldPreserveAlignment(el)) el.setAttribute('data-rte-align', align.toLowerCase());
      if (fontSize && /^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(fontSize.trim())) {
        el.setAttribute('data-rte-font-size', fontSize.trim());
      }
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('id');
    });

    // Keep block wrappers that carry alignment/size, unwrap only inline wrappers.
    let changed = true;
    while (changed) {
      changed = false;
      const wrappers = temp.querySelectorAll('span, div, p, section, article, header, footer, blockquote, figure, figcaption, h1, h2, h3, h4, h5, h6');
      wrappers.forEach(el => {
        const fontSize = el.getAttribute('data-rte-font-size');
        if (el.getAttribute('data-rte-align')) {
          const align = el.getAttribute('data-rte-align');
          el.removeAttribute('data-rte-align');
          if (fontSize) el.removeAttribute('data-rte-font-size');
          el.style.textAlign = align;
          if (fontSize) el.style.fontSize = fontSize;
          // Keep block wrappers so alignment is preserved.
          return;
        }

        if (fontSize) {
          el.removeAttribute('data-rte-font-size');
          el.style.fontSize = fontSize;
          return;
        }

        if (el.parentNode) {
          while (el.firstChild) {
            el.parentNode.insertBefore(el.firstChild, el);
          }
          el.parentNode.removeChild(el);
          changed = true;
        }
      });
    }

    // Remove HTML comments
    let result = temp.innerHTML.trim();
    result = result.replace(/<!--[\s\S]*?-->/g, '');

    return result;
  } catch (e) {
    // Fallback to regex if DOM parsing fails
    return html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<span[^>]*>/gi, '')
      .replace(/<\/span>/gi, '')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '')
      .trim();
  }
};
