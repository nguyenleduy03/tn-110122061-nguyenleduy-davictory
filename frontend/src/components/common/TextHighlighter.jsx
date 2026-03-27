import React, { useEffect, useState } from 'react';
import { MessageSquareQuote, Highlighter, Trash2 } from 'lucide-react';

const TextHighlighter = ({ containerRef, onHighlightChange, onAddNote, currentPartIndex = 0 }) => {
    const [popup, setPopup] = useState(null);

    useEffect(() => {
        const handleMouseUp = (e) => {
            // Ignore mouseup from inside the popup — let the click handler handle it
            if (e.target.closest('.highlight-popup')) return;
            requestAnimationFrame(() => {
                const selection = window.getSelection();

                // Case 1: clicked on an existing highlight with no new selection
                const clickedHighlight = e.target.closest('.custom-highlight');
                if (clickedHighlight && containerRef.current?.contains(clickedHighlight)) {
                    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                        const rect = clickedHighlight.getBoundingClientRect();
                        setPopup({
                            top: rect.top + window.scrollY - 80,
                            left: rect.left + window.scrollX + rect.width / 2,
                            mode: 'clear',
                            highlightEl: clickedHighlight,
                        });
                        return;
                    }
                }

                // Case 2: new text selected
                if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                    setPopup(null);
                    return;
                }

                const range = selection.getRangeAt(0);
                if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
                    setPopup(null);
                    return;
                }

                const rect = range.getBoundingClientRect();
                setPopup({
                    top: rect.top + window.scrollY - 80,
                    left: rect.left + window.scrollX + rect.width / 2,
                    mode: 'new',
                    range: range.cloneRange(),
                    text: selection.toString().trim(),
                });
            });
        };

        const handleMouseDown = (e) => {
            if (e.target.closest('.highlight-popup')) return;
            setTimeout(() => {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed) setPopup(null);
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
        if (!popup?.range) return;
        try {
            const range = popup.range;
            document.designMode = 'on';
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            if (!document.execCommand('hiliteColor', false, 'rgb(255, 221, 0)')) {
                document.execCommand('BackColor', false, 'rgb(255, 221, 0)');
            }
            document.designMode = 'off';
            document.querySelectorAll('span[style*="background-color"], font[style*="background-color"]').forEach((mark) => {
                if (mark.classList.contains('custom-highlight')) return;
                if (mark.style.backgroundColor === 'rgb(255, 221, 0)') {
                    mark.classList.add('custom-highlight');
                    mark.title = 'Click to remove highlight';
                }
            });
        } catch (err) {
            console.error(err);
        }
        window.getSelection()?.removeAllRanges();
        setPopup(null);
        if (onHighlightChange && containerRef.current) onHighlightChange(containerRef.current.innerHTML);
    };

    const clearHighlight = () => {
        const el = popup?.highlightEl;
        if (!el) { setPopup(null); return; }
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        if (el.parentNode) parent.removeChild(el);
        setPopup(null);
        if (onHighlightChange && containerRef.current) onHighlightChange(containerRef.current.innerHTML);
    };

    if (!popup) return null;

    return (
        <div className="highlight-popup" style={{ top: `${popup.top}px`, left: `${popup.left}px` }}>
            {popup.mode === 'new' ? (
                <>
                    <button
                        className="highlight-popup-btn"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onAddNote && popup?.text) onAddNote(popup.text, currentPartIndex);
                            setPopup(null);
                            window.getSelection()?.removeAllRanges();
                        }}
                    >
                        <MessageSquareQuote size={20} />
                        <span>Note</span>
                    </button>
                    <div className="highlight-popup-divider" />
                    <button
                        className="highlight-popup-btn"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); highlightText(); }}
                    >
                        <Highlighter size={20} />
                        <span>Highlight</span>
                    </button>
                </>
            ) : (
                <button
                    className="highlight-popup-btn highlight-popup-btn--danger"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearHighlight(); }}
                >
                    <Trash2 size={20} />
                    <span>Delete Highlight</span>
                </button>
            )}
        </div>
    );
};

export default TextHighlighter;
