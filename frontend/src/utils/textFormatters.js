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
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('id');
    });

    // Unwrap only span and div tags (keep strong, em, u, b, i, etc.)
    let changed = true;
    while (changed) {
      changed = false;
      const wrappers = temp.querySelectorAll('span, div');
      wrappers.forEach(el => {
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
