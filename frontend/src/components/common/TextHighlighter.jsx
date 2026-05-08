import React, { useEffect, useState } from 'react';
import { MessageSquareQuote, Highlighter, Trash2 } from 'lucide-react';

const TextHighlighter = ({
    containerRef,
    onHighlightChange,
    onAddNote,
    currentPartIndex = 0,
    persistenceKey = null,
    currentPart = null,
}) => {
    const [popup, setPopup] = useState(null);
    const questionHighlightStorageKey = persistenceKey ? `${persistenceKey}:question-highlights` : null;

    const getCurrentPartHighlightKeys = () => {
        const keys = [];

        const rawId = String(currentPart?.id ?? '').trim();
        if (rawId) {
            keys.push(rawId);
            keys.push(`id:${rawId}`);
        }

        const partNo = Number.parseInt(String(currentPart?.partNumber ?? ''), 10);
        if (Number.isFinite(partNo) && partNo > 0) {
            keys.push(`part:${partNo}`);
        }

        keys.push(`idx:${currentPartIndex}`);
        return Array.from(new Set(keys));
    };

    const getQuestionsRoot = () => {
        return containerRef.current?.querySelector('.questions-section .questions-content') || null;
    };

    const getTextOffsetForRangeBoundary = (root, boundaryNode, boundaryOffset) => {
        if (!root || !boundaryNode) return null;

        try {
            const boundaryRange = document.createRange();
            boundaryRange.selectNodeContents(root);
            boundaryRange.setEnd(boundaryNode, boundaryOffset);
            return boundaryRange.toString().length;
        } catch {
            return null;
        }
    };

    const snapshotRangeOffsets = (root, range) => {
        if (!root || !range || range.collapsed) return null;

        const start = getTextOffsetForRangeBoundary(root, range.startContainer, range.startOffset);
        const end = getTextOffsetForRangeBoundary(root, range.endContainer, range.endOffset);

        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

        return { start, end };
    };

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

    const unwrapHighlightElement = (element) => {
        const parent = element?.parentNode;
        if (!parent) return;

        while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
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

    const serializeQuestionHighlights = () => {
        const questionsRoot = getQuestionsRoot();
        if (!questionsRoot) return [];

        return Array.from(questionsRoot.querySelectorAll('.custom-highlight'))
            .map((highlightEl) => {
                if (!highlightEl?.isConnected) return null;

                const anchor = highlightEl.closest('[id^="question-"], .question-focus-frame[data-question-numbers]');
                if (!anchor) return null;

                let anchorKey = '';
                if (anchor.id && String(anchor.id).startsWith('question-')) {
                    anchorKey = `id:${anchor.id}`;
                } else {
                    const numbers = String(anchor.getAttribute('data-question-numbers') || '').trim();
                    if (!numbers) return null;
                    anchorKey = `block:${numbers}`;
                }

                const text = String(highlightEl.textContent || '');
                if (!text.trim()) return null;

                const prefixRange = document.createRange();
                prefixRange.selectNodeContents(anchor);
                prefixRange.setEndBefore(highlightEl);
                const start = prefixRange.toString().length;
                const end = start + text.length;

                return { anchorKey, start, end, text };
            })
            .filter(Boolean);
    };

    const findAnchorByKey = (questionsRoot, anchorKey) => {
        if (!questionsRoot || !anchorKey) return null;

        if (anchorKey.startsWith('id:')) {
            const idValue = anchorKey.slice(3);
            return document.getElementById(idValue);
        }

        if (anchorKey.startsWith('block:')) {
            const numbers = anchorKey.slice(6);
            const candidates = Array.from(questionsRoot.querySelectorAll('.question-focus-frame[data-question-numbers]'));
            return candidates.find((el) => String(el.getAttribute('data-question-numbers') || '').trim() === numbers) || null;
        }

        return null;
    };

    const createRangeFromTextOffsets = (root, start, end) => {
        if (!root || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let current = walker.nextNode();
        let consumed = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;

        while (current) {
            const textLength = current.nodeValue?.length || 0;
            const nextConsumed = consumed + textLength;

            if (!startNode && start >= consumed && start <= nextConsumed) {
                startNode = current;
                startOffset = Math.max(0, start - consumed);
            }

            if (!endNode && end >= consumed && end <= nextConsumed) {
                endNode = current;
                endOffset = Math.max(0, end - consumed);
                break;
            }

            consumed = nextConsumed;
            current = walker.nextNode();
        }

        if (!startNode || !endNode) return null;

        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
    };

    const persistQuestionHighlights = () => {
        if (!questionHighlightStorageKey) return;

        try {
            const currentMap = JSON.parse(sessionStorage.getItem(questionHighlightStorageKey) || '{}');
            const payload = serializeQuestionHighlights();
            const partKeys = getCurrentPartHighlightKeys();

            partKeys.forEach((key) => {
                currentMap[key] = payload;
            });

            sessionStorage.setItem(questionHighlightStorageKey, JSON.stringify(currentMap));
        } catch {
            // Ignore storage failures so highlight interaction remains uninterrupted.
        }
    };

    const restoreQuestionHighlights = () => {
        if (!questionHighlightStorageKey) return;

        const questionsRoot = getQuestionsRoot();
        if (!questionsRoot) return;

        let savedMap;
        try {
            savedMap = JSON.parse(sessionStorage.getItem(questionHighlightStorageKey) || '{}');
        } catch {
            return;
        }

        const partKeys = getCurrentPartHighlightKeys();
        let descriptors = null;
        for (const key of partKeys) {
            if (Array.isArray(savedMap?.[key])) {
                descriptors = savedMap[key];
                break;
            }
        }

        Array.from(questionsRoot.querySelectorAll('.custom-highlight')).forEach((el) => unwrapHighlightElement(el));

        if (!Array.isArray(descriptors) || descriptors.length === 0) return;

        const groupedByAnchor = descriptors.reduce((acc, item) => {
            const key = String(item?.anchorKey || '').trim();
            if (!key) return acc;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        Object.entries(groupedByAnchor).forEach(([anchorKey, items]) => {
            const anchor = findAnchorByKey(questionsRoot, anchorKey);
            if (!anchor) return;

            const sorted = [...items].sort((a, b) => Number(b.start || 0) - Number(a.start || 0));
            sorted.forEach((item) => {
                const range = createRangeFromTextOffsets(anchor, Number(item.start), Number(item.end));
                if (range) applyHighlightToRange(range);
            });
        });
    };

    useEffect(() => {
        if (!questionHighlightStorageKey) return undefined;
        const timer = window.setTimeout(() => {
            restoreQuestionHighlights();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [questionHighlightStorageKey, currentPartIndex, currentPart?.id, currentPart?.partNumber]);

    useEffect(() => {
        const handleMouseUp = (e) => {
            // Ignore mouseup from inside the popup — let the click handler handle it
            if (e.target.closest('.highlight-popup')) return;
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

            const snapshot = snapshotRangeOffsets(containerRef.current, range);
            setPopup({
                top: rect.top + window.scrollY - 80,
                left: rect.left + window.scrollX + rect.width / 2,
                mode: 'new',
                range: range.cloneRange(),
                selectionStart: snapshot?.start ?? null,
                selectionEnd: snapshot?.end ?? null,
                text: selection.toString().trim(),
            });
        };

        const handleMouseDown = (e) => {
            if (e.target.closest('.highlight-popup')) return;
            setTimeout(() => {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed) setPopup(null);
            }, 10);
        };

        document.addEventListener('mouseup', handleMouseUp, true);
        document.addEventListener('mousedown', handleMouseDown, true);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp, true);
            document.removeEventListener('mousedown', handleMouseDown, true);
        };
    }, [containerRef]);

    const highlightText = () => {
        const root = containerRef.current;
        const range = Number.isFinite(popup?.selectionStart) && Number.isFinite(popup?.selectionEnd)
            ? createRangeFromTextOffsets(root, popup.selectionStart, popup.selectionEnd)
            : popup?.range;

        if (!range) return;

        try {
            // Prefer explicit range wrapping over execCommand for repeatable behavior.
            applyHighlightToRange(range);
        } catch (err) {
            console.error(err);
        }

        window.getSelection()?.removeAllRanges();
        setPopup(null);
        persistQuestionHighlights();
        if (onHighlightChange && containerRef.current) onHighlightChange(containerRef.current.innerHTML);
    };

    const clearHighlight = () => {
        const el = popup?.highlightEl;
        if (!el) { setPopup(null); return; }
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        if (el.parentNode) parent.removeChild(el);
        setPopup(null);
        persistQuestionHighlights();
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
