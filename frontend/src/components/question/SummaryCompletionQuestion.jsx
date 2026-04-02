import React from 'react';
import { applyDbFormattingMarkers } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';

const SummaryCompletionQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    const opts = q.validationOptions || {};
    const summaryTextRef = React.useRef(null);
    const [activeBookmarkTop, setActiveBookmarkTop] = React.useState(null);
    const summarySubQuestions = q.subQuestions || [];
    const activeSummarySubQ = React.useMemo(() => {
        const activeNumber = Number(activeQuestion);
        if (!Number.isFinite(activeNumber)) return null;
        return summarySubQuestions.find((sq) => Number(sq.number) === activeNumber) || null;
    }, [activeQuestion, summarySubQuestions]);

    const isAutoCompletionTitle = (value) => {
        const plain = String(value || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return /^(note|summary)\s*completion\s*\d*$/i.test(plain);
    };

    const parseEmbeddedQuestionPayload = (rawText) => {
        if (typeof rawText !== 'string') return null;
        const candidate = rawText.trim();
        if (!candidate.startsWith('{') || !candidate.endsWith('}')) return null;

        try {
            const parsed = JSON.parse(candidate);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    };

    const cleanInstructionText = (value) => {
        let text = String(value || '').trim();
        if (!text) return '';

        // Some legacy payloads include wrapper fragments like rubricContent_xxx">...
        if (/rubricContent_/i.test(text) && text.includes('>')) {
            text = text.slice(text.indexOf('>') + 1).trim();
        }

        return text;
    };

    const payloadFromText = parseEmbeddedQuestionPayload(q?.text);
    const textToRender = payloadFromText
        ? (payloadFromText.noteText || payloadFromText.text || q?.noteText || '')
        : (q?.noteText || q?.text || '');
    const explicitInstructions = cleanInstructionText(payloadFromText?.instructions || q?.instructions || '');
    const titleFallback = cleanInstructionText(payloadFromText?.title || '');
    const instructionsText = explicitInstructions || (isAutoCompletionTitle(titleFallback) ? '' : titleFallback);

    const syncBookmarkPosition = React.useCallback(() => {
        if (isReview || !activeSummarySubQ) {
            setActiveBookmarkTop(null);
            return;
        }

        const container = summaryTextRef.current;
        if (!container) {
            setActiveBookmarkTop(null);
            return;
        }

        const activeNode = container.querySelector(`#question-${activeSummarySubQ.number}`);
        if (!activeNode) {
            setActiveBookmarkTop(null);
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const activeRect = activeNode.getBoundingClientRect();
        const top = activeRect.top - containerRect.top + (activeRect.height / 2);
        setActiveBookmarkTop(top);
    }, [activeSummarySubQ, isReview]);

    React.useLayoutEffect(() => {
        syncBookmarkPosition();
    }, [syncBookmarkPosition, answers, textToRender]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => syncBookmarkPosition();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [syncBookmarkPosition]);

    const formatInlineHtml = (value) => {
        if (typeof value !== 'string') return value || '';

        const withMarkers = applyDbFormattingMarkers(value)
            .replace(/\u00A0/g, ' ')
            .replace(/\\t|\/t|\t/g, '    ');

        // Keep existing HTML structure intact; only convert escaped \n markers.
        if (/<[a-z][\s\S]*>/i.test(withMarkers)) {
            return withMarkers.replace(/\\n/g, '<br/>');
        }

        return withMarkers.replace(/\\n|\n/g, '<br/>');
    };

    const normalizeBlankTokens = (text) => {
        let s = applyDbFormattingMarkers(String(text || ''));
        // Some legacy payloads accidentally append serialized empty JSON at the end.
        s = s.replace(/\s*(?:<p>\s*)?\{\s*"noteText"\s*:\s*""\s*,\s*"title"\s*:\s*""\s*\}(?:\s*<\/p>)?\s*$/gi, '');
        s = s.replace(/\s*(?:<p>\s*)?\{\s*"noteText"\s*:\s*""\s*,\s*"title"\s*:\s*""\s*,\s*"instructions"\s*:\s*""\s*\}(?:\s*<\/p>)?\s*$/gi, '');
        // Replace editor blank chips with [blank]
        s = s.replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '[blank]');
        // Remove legacy blank-chip controls that leaked into stored HTML.
        s = s.replace(/<button[^>]*data-del=["']true["'][^>]*>[\s\S]*?<\/button>/gi, '');
        s = s.replace(/<span[^>]*class=["'][^"']*rbe-blank-(?:num|del)[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');
        // Keep blanks inline even when editor inserts hard line breaks around them.
        s = s.replace(/<br\b[^>]*\/?>(?:\s|&nbsp;)*(\[(?:blank|\d+)\])/gi, ' $1');
        s = s.replace(/(\[(?:blank|\d+)\])(?:\s|&nbsp;)*<br\b[^>]*\/?>/gi, '$1 ');
        s = s.replace(/\\n\s*(\[(?:blank|\d+)\])/gi, ' $1');
        s = s.replace(/(\[(?:blank|\d+)\])\s*\\n/gi, '$1 ');
        s = s.replace(/\r?\n\s*(\[(?:blank|\d+)\])/gi, ' $1');
        s = s.replace(/(\[(?:blank|\d+)\])\s*\r?\n/gi, '$1 ');
        // Legacy parser bug sometimes left the delete marker "×" right after blank.
        s = s.replace(/(\[(?:blank|\d+)\])\s*[x×]\s+/gi, '$1 ');
        // Flatten standalone block wrappers around blank fragments.
        s = s.replace(/<(p|div)\b[^>]*>\s*(\[(?:blank|\d+)\][\s\S]*?)\s*<\/\1>/gi, ' $2 ');
        // Some legacy content places blank fragments between </li> and the next list item/end.
        s = s.replace(/<\/li>\s*([\s\S]*?\[(?:blank|\d+)\][\s\S]*?)(?=\s*(?:<li\b|<\/(?:ul|ol)\b))/gi, (_match, fragment) => {
            const merged = String(fragment || '')
                .trim()
                .replace(/^<(p|div)\b[^>]*>\s*/i, '')
                .replace(/\s*<\/(p|div)>$/i, '')
                .replace(/<\/li>\s*$/i, '')
                .trim();
            return merged ? ` ${merged} </li>` : '</li>';
        });
        // Normalize token form
        s = s.replace(/\[\s*blank\s*\]/gi, '[blank]');
        return s;
    };

    const mapDomAttributesToProps = (node, key) => {
        const props = { key };
        Array.from(node.attributes || []).forEach((attr) => {
            const attrName = String(attr.name || '').toLowerCase();
            if (!attrName || attrName === 'style' || attrName === 'contenteditable') return;
            if (attrName === 'class') {
                props.className = attr.value;
                return;
            }
            props[attr.name] = attr.value;
        });
        return props;
    };

    const resolveTokenTarget = (tokenValue, blankState) => {
        const token = String(tokenValue || '').toLowerCase();
        const numeric = Number(tokenValue);

        if (token === 'blank' || Number.isNaN(numeric)) {
            const seqIndex = blankState.cursor;
            const subQ = q.subQuestions?.[seqIndex] || null;
            blankState.cursor += 1;
            const fallbackNum = seqIndex + 1;
            const qNum = subQ?.number ?? fallbackNum;
            const qId = subQ ? subQ.id : `q${qNum}`;
            return { subQ, qNum, qId };
        }

        const subQ = q.subQuestions?.find((sq) => Number(sq.number) === numeric) || null;
        const qNum = subQ?.number ?? numeric;
        const qId = subQ ? subQ.id : `q${qNum}`;
        return { subQ, qNum, qId };
    };

    const renderInputToken = (tokenValue, key, blankState) => {
        const { subQ, qNum, qId } = resolveTokenTarget(tokenValue, blankState);
        const isActive = activeQuestion === qNum;
        const answer = answers?.[qId] || '';
        const isCorrect = checkAnswer(answer, subQ?.correctAnswer);
        const displayAnswer = (isReview && !isCorrect)
            ? String(subQ?.correctAnswer || '').split('|')[0]
            : String(answer || '');

        return (
            <span
                key={key}
                id={`question-${qNum}`}
                className={`inline-question summary-inline-item ${isActive ? 'active-question-input' : ''} ${Boolean(bookmarks?.[qNum]) ? 'bookmarked-question-input' : ''} relative-pos`}
                onClick={() => setActiveQuestion?.(qNum)}
            >
                <input
                    ref={(el) => { if (inputRefs?.current) inputRefs.current[qNum] = el; }}
                    type="text"
                    className={`inline-input summary-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                    placeholder={qNum.toString()}
                    value={displayAnswer}
                    onChange={(e) => { if (!isReview) handleAnswerChange?.(qId, e.target.value); }}
                    onFocus={() => { if (!isReview) setActiveQuestion?.(qNum); }}
                    autoComplete="off"
                    spellCheck="false"
                    readOnly={isReview}
                />
            </span>
        );
    };

    const renderTextNodeWithTokens = (text, keyPrefix, blankState) => {
        const tokenRegex = /\[(blank|\d+)\]/gi;
        const rawText = String(text || '');
        const rendered = [];
        let cursor = 0;
        let match;

        while ((match = tokenRegex.exec(rawText)) !== null) {
            const before = rawText.slice(cursor, match.index);
            if (before) rendered.push(before);
            rendered.push(renderInputToken(match[1], `${keyPrefix}-token-${cursor}`, blankState));
            cursor = tokenRegex.lastIndex;
        }

        const after = rawText.slice(cursor);
        if (after) rendered.push(after);

        if (!rendered.length) return rawText;
        return rendered;
    };

    const renderDomNodeWithTokens = (node, keyPrefix, blankState) => {
        if (!node) return null;

        if (node.nodeType === 3) {
            return renderTextNodeWithTokens(node.textContent || '', keyPrefix, blankState);
        }

        if (node.nodeType !== 1) return null;

        const tagName = String(node.tagName || '').toLowerCase();
        if (!tagName || tagName === 'script' || tagName === 'style') return null;

        const children = Array.from(node.childNodes || []).flatMap((child, idx) => {
            const childNode = renderDomNodeWithTokens(child, `${keyPrefix}-${idx}`, blankState);
            if (Array.isArray(childNode)) {
                return childNode.filter((entry) => entry !== null && entry !== undefined);
            }
            return childNode === null || childNode === undefined ? [] : [childNode];
        });

        const props = mapDomAttributesToProps(node, keyPrefix);
        return React.createElement(tagName, props, children.length ? children : undefined);
    };

    const normalizeAnswer = (text) => {
        let s = String(text || '').trim();
        if (opts.ignoreCase !== false) s = s.toLowerCase();
        if (opts.ignoreSpaces) s = s.replace(/\s+/g, '');
        if (opts.ignorePunctuation) s = s.replace(/[.,!?;:'"()]/g, '');
        if (opts.ignoreChars) {
            const chars = opts.ignoreChars.split('');
            chars.forEach(c => { s = s.split(c).join(''); });
        }
        return s;
    };

    const checkAnswer = (userAnswer, correctAnswer) => {
        const normalized = normalizeAnswer(userAnswer);
        const acceptedAnswers = String(correctAnswer || '').split('|').map(a => normalizeAnswer(a));
        return acceptedAnswers.includes(normalized);
    };

    // Parse text to find placeholders like [blank] or [24]
    const renderParagraph = () => {
        if (!textToRender) return null;

        const normalizedText = normalizeBlankTokens(textToRender);
        const htmlText = formatInlineHtml(normalizedText);

        if (typeof DOMParser === 'undefined') {
            return <span dangerouslySetInnerHTML={{ __html: htmlText }} />;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${htmlText}</div>`, 'text/html');
        const root = doc.body.firstElementChild;
        if (!root) return null;

        const blankState = { cursor: 0 };
        return Array.from(root.childNodes || []).flatMap((node, idx) => {
            const renderedNode = renderDomNodeWithTokens(node, `summary-node-${idx}`, blankState);
            if (Array.isArray(renderedNode)) {
                return renderedNode.filter((entry) => entry !== null && entry !== undefined);
            }
            return renderedNode === null || renderedNode === undefined ? [] : [renderedNode];
        });
    };

    return (
        <div className="summary-completion-container">
            {instructionsText && (
                <p className="summary-instructions" dangerouslySetInnerHTML={{ __html: formatInlineHtml(instructionsText) }} />
            )}
            <div className="summary-text" ref={summaryTextRef}>
                {renderParagraph()}
                {!isReview && activeSummarySubQ && activeBookmarkTop !== null && (
                    <BookmarkToggle
                        className="question-bookmark summary-floating-bookmark"
                        style={{ top: `${activeBookmarkTop}px` }}
                        active={Boolean(bookmarks?.[activeSummarySubQ.number])}
                        onToggle={() => toggleBookmark?.(activeSummarySubQ.number)}
                    />
                )}
            </div>
        </div>
    );
};

export default SummaryCompletionQuestion;
