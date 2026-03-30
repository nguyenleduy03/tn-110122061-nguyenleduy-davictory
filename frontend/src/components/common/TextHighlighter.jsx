import React, { useEffect, useState } from 'react';
import { MessageSquareQuote, Highlighter, Trash2 } from 'lucide-react';

const TextHighlighter = ({ containerRef, onHighlightChange, onAddNote, currentPartIndex = 0 }) => {
    const [popup, setPopup] = useState(null);

    const createHighlightNode = () => {
        const highlight = document.createElement('span');
        highlight.className = 'custom-highlight';
        highlight.title = 'Click to remove highlight';
        highlight.setAttribute('data-highlight-id', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        return highlight;
    };

    const isHighlightElement = (node) => {
        return node?.nodeType === Node.ELEMENT_NODE && node.classList?.contains('custom-highlight');
    };

    const mergeAdjacentHighlights = (node) => {
        if (!isHighlightElement(node)) return node;

        // Merge previous sibling highlight into current node.
        const prev = node.previousSibling;
        if (isHighlightElement(prev)) {
            while (node.firstChild) {
                prev.appendChild(node.firstChild);
            }
            node.remove();
            node = prev;
        }

        // Merge next sibling highlight into current node.
        const next = node.nextSibling;
        if (isHighlightElement(next)) {
            while (next.firstChild) {
                node.appendChild(next.firstChild);
            }
            next.remove();
        }

        return node;
    };

    const getSelectedTextNodes = (range) => {
        const nodes = [];
        const ancestor = range.commonAncestorContainer;
        const root = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode : ancestor;
        if (!root) return nodes;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node?.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                try {
                    return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                } catch {
                    return NodeFilter.FILTER_REJECT;
                }
            },
        });

        let current = walker.nextNode();
        while (current) {
            nodes.push(current);
            current = walker.nextNode();
        }

        return nodes;
    };

    const normalizeHighlightsInContainer = () => {
        const root = containerRef.current;
        if (!root) return;

        root.querySelectorAll('.custom-highlight').forEach((node) => {
            if (!node.isConnected) return;
            mergeAdjacentHighlights(node);
        });
    };

    const applyHighlightToRange = (range) => {
        if (!range || range.collapsed) return false;

        const textNodes = getSelectedTextNodes(range);
        if (!textNodes.length) return false;

        let changed = false;

        // Iterate from the end so earlier wraps do not invalidate later offsets.
        for (let i = textNodes.length - 1; i >= 0; i -= 1) {
            const node = textNodes[i];
            if (!node?.isConnected) continue;

            // Avoid nested highlights when selecting text already highlighted.
            if (node.parentElement?.closest('.custom-highlight')) continue;

            const startOffset = node === range.startContainer ? range.startOffset : 0;
            const endOffset = node === range.endContainer ? range.endOffset : node.nodeValue.length;
            if (endOffset <= startOffset) continue;

            const nodeRange = document.createRange();
            nodeRange.setStart(node, startOffset);
            nodeRange.setEnd(node, endOffset);

            const highlight = createHighlightNode();
            try {
                nodeRange.surroundContents(highlight);
                changed = true;
            } catch {
                // Skip invalid fragments to keep content intact.
            }
        }

        if (changed) normalizeHighlightsInContainer();
        return changed;
    };

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

            // Prefer explicit range wrapping over execCommand for repeatable behavior.
            applyHighlightToRange(range);
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
