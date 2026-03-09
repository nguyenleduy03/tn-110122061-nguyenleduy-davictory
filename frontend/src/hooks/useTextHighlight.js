import { useState, useEffect, useCallback } from 'react';

export const useTextHighlight = (containerRef) => {
    const [selectionInfo, setSelectionInfo] = useState(null);

    const handleSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setSelectionInfo(null);
            return;
        }

        const range = selection.getRangeAt(0);

        // Ensure the selection is within our container
        if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
            setSelectionInfo(null);
            return;
        }

        const text = selection.toString().trim();
        if (!text) {
            setSelectionInfo(null);
            return;
        }

        const rect = range.getBoundingClientRect();

        setSelectionInfo({
            top: rect.top - 40, // Position above the text
            left: rect.left + rect.width / 2,
            range: range.cloneRange(),
            text: text
        });
    }, [containerRef]);

    useEffect(() => {
        document.addEventListener('mouseup', handleSelection);
        return () => {
            document.removeEventListener('mouseup', handleSelection);
        };
    }, [handleSelection]);

    const highlightText = () => {
        if (!selectionInfo || !selectionInfo.range) return;

        try {
            const range = selectionInfo.range;

            // Check if we are selecting wholly inside a text node
            if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
                const mark = document.createElement('mark');
                mark.style.backgroundColor = '#ffe600';
                mark.style.color = 'inherit';
                mark.className = 'custom-highlight';
                mark.onclick = () => {
                    // Remove highlight on click
                    const parent = mark.parentNode;
                    while (mark.firstChild) {
                        parent.insertBefore(mark.firstChild, mark);
                    }
                    parent.removeChild(mark);
                };
                range.surroundContents(mark);
            } else {
                // For complex selections across multiple nodes, we use execCommand or manual walking.
                // The easiest and most robust cross-node approach (though deprecated, it works perfectly for this):
                document.designMode = "on";
                if (selectionInfo.range) {
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(selectionInfo.range);
                    document.execCommand("hiliteColor", false, "#ffe600");
                }
                document.designMode = "off";

                // Make them clickable to remove
                const fontTags = document.querySelectorAll('span[style*="background-color: rgb(255, 230, 0)"], font[style*="background-color"]');
                fontTags.forEach(tag => {
                    tag.classList.add('custom-highlight');
                    tag.onclick = function () {
                        const parent = this.parentNode;
                        while (this.firstChild) {
                            parent.insertBefore(this.firstChild, this);
                        }
                        parent.removeChild(this);
                    };
                });
            }
        } catch (e) {
            console.error("Highlight error:", e);
        }

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setSelectionInfo(null);
    };

    const clearSelection = () => {
        setSelectionInfo(null);
        window.getSelection()?.removeAllRanges();
    };

    return { selectionInfo, highlightText, clearSelection };
};
