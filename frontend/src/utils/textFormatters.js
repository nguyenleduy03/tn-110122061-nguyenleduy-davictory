/**
 * Formats text content to correctly render whitespace and line breaks in HTML.
 * - Replaces "\t", "/t", and literal tab characters with 4 non-breaking spaces.
 * - Replaces "\n" and literal newline characters with <br/> tags.
 * 
 * @param {string} text The raw text to format.
 * @returns {string} The formatted HTML string.
 */
export const formatTextWithWhitespace = (text) => {
  if (typeof text !== 'string') return text || '';
  return text
    .replace(/\\t|\/t|\t/g, '    ')
    .replace(/\u00A0/g, ' ')
    .replace(/\\n|\n/g, '<br/>');
};

/**
 * Decode HTML entities if text was stored as escaped HTML.
 * Example: "&lt;b&gt;Hello&lt;/b&gt;" -> "<b>Hello</b>"
 */
export const decodeHtmlEntities = (text) => {
  if (typeof text !== 'string') return text || '';
  if (!/[&](lt|gt|amp|quot|#39);/i.test(text)) return text;

  try {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  } catch {
    return text;
  }
};

/**
 * Normalize rich HTML from editor/database so render is consistent.
 */
export const normalizeRichHtml = (text) => {
  if (typeof text !== 'string') return text || '';
  const decoded = decodeHtmlEntities(text);
  return decoded
    .replace(/\u00A0/g, ' ')
    .replace(/\\t|\/t|\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/\\n|\n/g, '<br/>');
};
