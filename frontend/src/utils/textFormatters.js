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
    .replace(/\\t|\/t|\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/\\n|\n/g, '<br/>');
};
