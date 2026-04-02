import React from 'react';
import { applyDbFormattingMarkers } from '../../utils/textFormatters';
import BookmarkToggle from '../common/BookmarkToggle';

const SummaryCompletionSelectQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
    const summaryTextRef = React.useRef(null);
    const [activeBookmarkTop, setActiveBookmarkTop] = React.useState(null);

    const isAutoCompletionTitle = (value) => {
        const plain = String(value || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return /^(note|summary)\s*completion\s*\d*$/i.test(plain);
    };

    // Parse data if it's a JSON string
    let questionData = q;
    if (typeof q === 'string') {
        try {
            questionData = JSON.parse(q);
        } catch (e) {
            questionData = q;
        }
    }

    const resolveText = (value) => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
            return value.text || value.label || value.value || value.optionText || value.optionLabel || '';
        }
        return String(value ?? '');
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

        if (/rubricContent_/i.test(text) && text.includes('>')) {
            text = text.slice(text.indexOf('>') + 1).trim();
        }

        return text;
    };

    const payloadFromNoteText = parseEmbeddedQuestionPayload(questionData?.noteText);
    const payloadFromText = payloadFromNoteText || parseEmbeddedQuestionPayload(questionData?.text);

    const options = (questionData.optionBank || []).map(resolveText).filter(Boolean);
    const explicitInstructions = cleanInstructionText(payloadFromText?.instructions || questionData.instructions || '');
    const titleFallback = cleanInstructionText(payloadFromText?.title || '');
    const instructions = explicitInstructions || (isAutoCompletionTitle(titleFallback) ? '' : titleFallback);
    const noteText = payloadFromNoteText
        ? (payloadFromNoteText.noteText || payloadFromNoteText.text || '')
        : payloadFromText
            ? (payloadFromText.noteText || payloadFromText.text || questionData.noteText || '')
            : (questionData.noteText || questionData.text || '');
    const summarySubQuestions = questionData.subQuestions || [];
    const activeSummarySubQ = React.useMemo(() => {
        const activeNumber = Number(activeQuestion);
        if (!Number.isFinite(activeNumber)) return null;
        return summarySubQuestions.find((sq) => Number(sq.number) === activeNumber) || null;
    }, [activeQuestion, summarySubQuestions]);
    const allowOptionReuse = questionData.allowOptionReuse !== false;

    const [isDragOverBank, setIsDragOverBank] = React.useState(false);

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
    }, [syncBookmarkPosition, answers, noteText]);

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

        if (/<[a-z][\s\S]*>/i.test(withMarkers)) {
            return withMarkers.replace(/\\n/g, '<br/>');
        }

        return withMarkers.replace(/\\n|\n/g, '<br/>');
    };

    const normalizeBlankTokens = (text) => {
        let s = applyDbFormattingMarkers(String(text || ''));
        s = s.replace(/\s*(?:<p>\s*)?\{\s*"noteText"\s*:\s*""\s*,\s*"title"\s*:\s*""\s*\}(?:\s*<\/p>)?\s*$/gi, '');
        s = s.replace(/\s*(?:<p>\s*)?\{\s*"noteText"\s*:\s*""\s*,\s*"title"\s*:\s*""\s*,\s*"instructions"\s*:\s*""\s*\}(?:\s*<\/p>)?\s*$/gi, '');
        s = s.replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '[blank]');
        s = s.replace(/<button[^>]*data-del=["']true["'][^>]*>[\s\S]*?<\/button>/gi, '');
        s = s.replace(/<span[^>]*class=["'][^"']*rbe-blank-(?:num|del)[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');
        // Keep blanks inline even when editor inserts hard line breaks around them.
        s = s.replace(/<br\b[^>]*\/?>(?:\s|&nbsp;)*(\[(?:blank|\d+)\])/gi, ' $1');
        s = s.replace(/(\[(?:blank|\d+)\])(?:\s|&nbsp;)*<br\b[^>]*\/?>/gi, '$1 ');
        s = s.replace(/\\n\s*(\[(?:blank|\d+)\])/gi, ' $1');
        s = s.replace(/(\[(?:blank|\d+)\])\s*\\n/gi, '$1 ');
        s = s.replace(/\r?\n\s*(\[(?:blank|\d+)\])/gi, ' $1');
        s = s.replace(/(\[(?:blank|\d+)\])\s*\r?\n/gi, '$1 ');
        s = s.replace(/(\[(?:blank|\d+)\])\s*[x×]\s+/gi, '$1 ');
        s = s.replace(/<(p|div)\b[^>]*>\s*(\[(?:blank|\d+)\][\s\S]*?)\s*<\/\1>/gi, ' $2 ');
        s = s.replace(/<\/li>\s*([\s\S]*?\[(?:blank|\d+)\][\s\S]*?)(?=\s*(?:<li\b|<\/(?:ul|ol)\b))/gi, (_match, fragment) => {
            const merged = String(fragment || '')
                .trim()
                .replace(/^<(p|div)\b[^>]*>\s*/i, '')
                .replace(/\s*<\/(p|div)>$/i, '')
                .replace(/<\/li>\s*$/i, '')
                .trim();
            return merged ? ` ${merged} </li>` : '</li>';
        });
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
            const subQ = questionData.subQuestions?.[seqIndex] || null;
            blankState.cursor += 1;
            const fallbackNum = seqIndex + 1;
            const qNum = subQ?.number ?? fallbackNum;
            const qId = subQ ? subQ.id : `q${qNum}`;
            return { subQ, qNum, qId };
        }

        const subQ = questionData.subQuestions?.find((sq) => Number(sq.number) === numeric) || null;
        const qNum = subQ?.number ?? numeric;
        const qId = subQ ? subQ.id : `q${qNum}`;
        return { subQ, qNum, qId };
    };

    const renderDropToken = (tokenValue, key, blankState) => {
        const { subQ, qNum, qId } = resolveTokenTarget(tokenValue, blankState);
        const isActive = activeQuestion === qNum;
        const answer = answers?.[qId] || '';
        const isCorrect = answer === subQ?.correctAnswer;
        const displayAnswer = (isReview && !isCorrect) ? subQ?.correctAnswer : answer;

        return (
            <span
                key={key}
                id={`question-${qNum}`}
                className={`inline-question summary-inline-item ${isActive ? 'active-question-input' : ''} ${Boolean(bookmarks?.[qNum]) ? 'bookmarked-question-input' : ''} relative-pos`}
                onClick={() => setActiveQuestion?.(qNum)}
            >
                <span
                    ref={(el) => { if (inputRefs?.current) inputRefs.current[qNum] = el; }}
                    className={`inline-input summary-input drag-drop-blank ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                    onDrop={(e) => handleDrop(e, qId, qNum)}
                    onDragOver={handleDragOver}
                    onClick={() => { if (!isReview) setActiveQuestion?.(qNum); }}
                    style={{ minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: isReview ? 'default' : 'pointer' }}
                >
                    {displayAnswer ? (
                        <span
                            draggable={!isReview}
                            onDragStart={(e) => { if (!isReview) handleDragStart(e, displayAnswer, qId); }}
                            style={{
                                cursor: isReview ? 'default' : 'grab',
                                padding: '2px 4px'
                            }}
                        >
                            {displayAnswer}
                        </span>
                    ) : (
                        <span style={{ color: '#9ca3af' }}>{qNum}</span>
                    )}
                </span>
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
            rendered.push(renderDropToken(match[1], `${keyPrefix}-token-${cursor}`, blankState));
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

    const handleDragStart = (e, option, sourceQId = null) => {
        const optionText = resolveText(option);
        e.dataTransfer.setData('text/plain', optionText.replace(/<[^>]*>/g, ''));
        if (sourceQId) {
            e.dataTransfer.setData('sourceQId', String(sourceQId));
        }
    };

    const handleDrop = (e, qId, qNum) => {
        e.preventDefault();
        const droppedText = e.dataTransfer.getData('text/plain');
        const sourceQId = e.dataTransfer.getData('sourceQId');

        if (!isReview && droppedText) {
            handleAnswerChange?.(qId, droppedText);
            setActiveQuestion?.(qNum);

            // Clear source if dragging from another blank
            if (sourceQId && sourceQId !== String(qId)) {
                handleAnswerChange?.(sourceQId, '');
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleBankDrop = (e) => {
        e.preventDefault();
        setIsDragOverBank(false);
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (sourceQId && !isReview) {
            handleAnswerChange?.(sourceQId, '');
        }
    };

    const handleBankDragOver = (e) => {
        e.preventDefault();
        setIsDragOverBank(true);
    };

    const handleBankDragLeave = (e) => {
        e.preventDefault();
        setIsDragOverBank(false);
    };

    // Track used options
    const usedOptions = new Set();
    if (!allowOptionReuse) {
        Object.values(answers || {}).filter(Boolean).forEach(ans => usedOptions.add(ans));
    }

    const renderParagraph = () => {
        if (!noteText) return null;
        const normalizedText = normalizeBlankTokens(noteText);
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
            const renderedNode = renderDomNodeWithTokens(node, `summary-select-node-${idx}`, blankState);
            if (Array.isArray(renderedNode)) {
                return renderedNode.filter((entry) => entry !== null && entry !== undefined);
            }
            return renderedNode === null || renderedNode === undefined ? [] : [renderedNode];
        });
    };

    return (
        <div className="summary-completion-container">
            {instructions && (
                <p className="summary-instructions" dangerouslySetInnerHTML={{ __html: formatInlineHtml(instructions) }} />
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
            <div
                className={`summary-word-bank ${isDragOverBank ? 'drag-over' : ''}`}
                onDragOver={handleBankDragOver}
                onDragLeave={handleBankDragLeave}
                onDrop={handleBankDrop}
            >
                <div className="summary-bank-options">
                    {options.map((o, i) => {
                        const optionText = resolveText(o);
                        const isUsed = !allowOptionReuse && usedOptions.has(optionText);

                        if (isUsed && !isReview) return null;

                        return (
                            <div
                                key={i}
                                className={`summary-bank-chip ${isUsed ? 'used' : ''}`}
                                draggable={!isReview}
                                onDragStart={(e) => handleDragStart(e, o)}
                            >
                                {optionText}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SummaryCompletionSelectQuestion;
