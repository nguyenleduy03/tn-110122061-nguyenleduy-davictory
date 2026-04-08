import { useCallback } from 'react';

/**
 * Hook để xử lý Tab indent trong textarea
 * Tab = thêm 2 spaces
 * Shift + Tab = xóa 2 spaces ở đầu dòng
 * Escape = blur (thoát khỏi textarea để Tab navigation hoạt động)
 */
export const useTabIndent = () => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (e.shiftKey) {
        // Shift + Tab: Outdent (xóa 2 spaces ở đầu dòng hiện tại)
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineText = value.substring(lineStart, start);
        
        if (lineText.startsWith('  ')) {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
          textarea.value = newValue;
          textarea.selectionStart = textarea.selectionEnd = start - 2;
          
          // Trigger onChange event
          const event = new Event('input', { bubbles: true });
          textarea.dispatchEvent(event);
        }
      } else {
        // Tab: Indent (thêm 2 spaces)
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        textarea.value = newValue;
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        
        // Trigger onChange event
        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);
      }
    } else if (e.key === 'Escape') {
      // Escape: Blur để có thể Tab navigation
      e.target.blur();
    }
  }, []);

  return { handleKeyDown };
};
