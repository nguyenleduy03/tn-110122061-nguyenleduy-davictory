import React, { useEffect, useState, useRef } from 'react';


const TextHighlighter = ({ containerRef, onHighlightChange }) => {
    const [selectionInfo, setSelectionInfo] = useState(null);

    useEffect(() => {
        const handleMouseUp = () => {
            requestAnimationFrame(() => {
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                    setSelectionInfo(null);
                    return;
                }

                const range = selection.getRangeAt(0);

                // Ensure selection is inside the valid container
                if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
                    setSelectionInfo(null);
                    return;
                }

                const rect = range.getBoundingClientRect();

                // Compute position relative to viewport
                setSelectionInfo({
                    top: rect.top + window.scrollY - 50, // 50px above selection
                    left: rect.left + window.scrollX + (rect.width / 2),
                    range: range.cloneRange(),
                    text: selection.toString().trim(),
                });
            });
        };

        const handleMouseDown = (e) => {
            // Document click to clear popup if clicking outside selection/popup
            if (e.target.closest('.highlight-popup')) return;
            // Delay to allow new selection to occur
            setTimeout(() => {
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed) setSelectionInfo(null);
            }, 10);
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousedown', handleMouseDown);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [containerRef]);

    const highlightText = () => {
        if (!selectionInfo || !selectionInfo.range) return;

        try {
            const range = selectionInfo.range;

            // Allow execCommand to work on non-editable text
            document.designMode = "on";

            // Re-apply selection so execCommand targets the right text
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            if (!document.execCommand('hiliteColor', false, 'rgb(255, 221, 0)')) {
                // Fallback for browsers not supporting hiliteColor
                document.execCommand('BackColor', false, 'rgb(255, 221, 0)');
            }

            document.designMode = "off";
            let marks = document.querySelectorAll('span[style*="background-color"], font[style*="background-color"]');
            marks.forEach(mark => {
                if (mark.style.backgroundColor === 'rgb(255, 221, 0)' || mark.style.backgroundColor === '#fff5b0') {
                    mark.classList.add('custom-highlight');
                    mark.style.borderRadius = '3px';
                    mark.style.padding = '2px 0';
                    mark.style.cursor = 'pointer';
                    mark.title = 'Click to remove highlight';
                    mark.onclick = function () {
                        const parent = this.parentNode;
                        while (this.firstChild) {
                            parent.insertBefore(this.firstChild, this);
                        }
                        if (this.parentNode) parent.removeChild(this); // Clean up span
                        if (onHighlightChange && containerRef.current) {
                            onHighlightChange(containerRef.current.innerHTML);
                        }
                    };
                }
            });

        } catch (e) {
            console.error(e);
        }

        window.getSelection()?.removeAllRanges();
        setSelectionInfo(null);
        if (onHighlightChange && containerRef.current) {
            onHighlightChange(containerRef.current.innerHTML);
        }
    };

    const clearSelection = () => {
        setSelectionInfo(null);
        window.getSelection()?.removeAllRanges();
    };

    if (!selectionInfo) return null;

    return (
        <div
            className="highlight-popup"
            style={{
                position: 'absolute',
                top: `${selectionInfo.top}px`,
                left: `${selectionInfo.left}px`,
                transform: 'translateX(-50%)',
                backgroundColor: '#333',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 9999,
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                animation: 'fadeIn 0.2s ease-in-out'
            }}
        >
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); highlightText(); }}
            >
                Highlight
            </div>
            <div
                style={{ width: '1px', height: '14px', backgroundColor: '#666' }}
            ></div>
            <div
                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ccc', cursor: 'pointer' }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearSelection(); }}
            >
                Clear
            </div>
        </div>
    );
};

export default TextHighlighter;
