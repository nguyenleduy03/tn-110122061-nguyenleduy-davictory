import React from 'react';
import { applyDbFormattingMarkers } from '../../utils/textFormatters';
import { isQuestionMetaLabel } from '../../utils/questionLabelUtils';
import BookmarkToggle from '../common/BookmarkToggle';
import { resolveDrivePreviewUrl } from '../../utils/mediaUrl';

const resolveImageWidthPercent = (value, fallback = 100) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace('%', '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const resolvePinBoxWidthPx = (value, fallback = 60) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace('px', '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

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
    const titleText = cleanInstructionText(q?.title || payloadFromText?.title || '');
    const title = isQuestionMetaLabel(titleText) ? '' : titleText;
    const instructionsText = explicitInstructions;
    const imagePinSubQuestions = summarySubQuestions
        .filter((subQ) => subQ?.top != null || subQ?.left != null)
        .sort((a, b) => Number(a?.number || 0) - Number(b?.number || 0));
    const isImageNoteForm = Boolean(q?.imageUrl && q?.imagePosition && (q?.topNoteText !== undefined || q?.bottomNoteText !== undefined || imagePinSubQuestions.length > 0));

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

        // Preserve line breaks from builder content for both plain text and rich HTML.
        return withMarkers.replace(/\\n|\r?\n/g, '<br/>');
    };

    const toReactStyleObject = (rawStyle) => {
        if (typeof rawStyle !== 'string') return undefined;

        const styleObj = {};
        rawStyle.split(';').forEach((declaration) => {
            const [rawName, ...rawValueParts] = declaration.split(':');
            if (!rawName || !rawValueParts.length) return;

            const propName = rawName.trim();
            const propValue = rawValueParts.join(':').trim();
            if (!propName || !propValue) return;

            if (propName.startsWith('--')) {
                styleObj[propName] = propValue;
                return;
            }

            const camelName = propName.toLowerCase().replace(/-([a-z])/g, (_m, letter) => letter.toUpperCase());
            styleObj[camelName] = propValue;
        });

        return Object.keys(styleObj).length ? styleObj : undefined;
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
        // Legacy parser bug sometimes left the delete marker "×" right after blank.
        s = s.replace(/(\[(?:blank|\d+)\])\s*[x×]\s+/gi, '$1 ');
        // Normalize token form
        s = s.replace(/\[\s*blank\s*\]/gi, '[blank]');
        return s;
    };

    const mapDomAttributesToProps = (node, key) => {
        const props = { key };
        const tagName = String(node?.tagName || '').toLowerCase();
        const rawStyle = String(node?.getAttribute?.('style') || '');
        const hasFontTagFace = Boolean(node?.hasAttribute?.('face'));
        const hasFontTagSize = Boolean(node?.hasAttribute?.('size'));
        const hasFontOverride = hasFontTagFace || hasFontTagSize || /(?:^|;)\s*(?:font-size|font-family|font)\s*:/i.test(rawStyle);
        const hasSpecialTag = ['strong', 'b', 'em', 'i', 'u', 'mark', 'sup', 'sub', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
        const hasSpecialInlineStyle = /(?:^|;)\s*(?:font-weight|font-style|text-decoration|text-align|color|background(?:-color)?|text-transform|letter-spacing|word-spacing)\s*:/i.test(rawStyle);
        const hasSpecialAlignAttr = /^(center|right|justify)$/i.test(String(node?.getAttribute?.('align') || ''));
        const hasSpecialDescendant = typeof node?.querySelector === 'function' && Boolean(
            node.querySelector('strong,b,em,i,u,mark,sup,sub,h1,h2,h3,h4,h5,h6,[align="center"],[align="right"],[align="justify"],[style*="font-weight"],[style*="font-style"],[style*="text-decoration"],[style*="text-align"],[style*="color"],[style*="background"],[style*="text-transform"],[style*="letter-spacing"],[style*="word-spacing"]')
        );
        const shouldPreserveTypographyOverride = hasSpecialTag || hasSpecialInlineStyle || hasSpecialAlignAttr || (hasFontOverride && hasSpecialDescendant);

        Array.from(node.attributes || []).forEach((attr) => {
            const attrName = String(attr.name || '').toLowerCase();
            if (!attrName || attrName === 'contenteditable' || attrName.startsWith('on')) return;
            if (attrName === 'face') {
                if (!shouldPreserveTypographyOverride) return;
                const faceValue = String(attr.value || '').trim();
                if (faceValue) {
                    props.style = { ...(props.style || {}), fontFamily: faceValue };
                }
                return;
            }
            if (attrName === 'size') {
                if (!shouldPreserveTypographyOverride) return;
                const rawSize = String(attr.value || '').trim();
                const htmlSizeMap = { 1: 10, 2: 13, 3: 16, 4: 18, 5: 24, 6: 32, 7: 48 };
                if (/^\d+$/.test(rawSize)) {
                    const mapped = htmlSizeMap[Number(rawSize)] || 16;
                    props.style = { ...(props.style || {}), fontSize: `${mapped}px` };
                } else if (/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i.test(rawSize)) {
                    props.style = { ...(props.style || {}), fontSize: rawSize };
                }
                return;
            }
            if (attrName === 'class') {
                props.className = attr.value;
                return;
            }
            if (attrName === 'style') {
                const styleObj = toReactStyleObject(attr.value);
                if (styleObj) {
                    if (!shouldPreserveTypographyOverride) {
                        // Plain text should follow runtime typography defaults.
                        delete styleObj.fontSize;
                        delete styleObj.fontFamily;
                        delete styleObj.font;
                    }
                    props.style = { ...(props.style || {}), ...styleObj };
                }
                return;
            }
            if (attrName === 'align') {
                const alignValue = String(attr.value || '').trim().toLowerCase();
                if (alignValue) {
                    props.style = { ...(props.style || {}), textAlign: alignValue };
                }
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
            const qNum = subQ?.number ?? null;
            const qId = subQ?.id ?? null;
            return { subQ, qNum, qId };
        }

        const subQ = q.subQuestions?.find((sq) => Number(sq.number) === numeric) || null;
        const qNum = subQ?.number ?? (Number.isFinite(numeric) ? numeric : null);
        const qId = subQ?.id ?? null;
        return { subQ, qNum, qId };
    };

    const renderInputToken = (tokenValue, key, blankState) => {
        const { subQ, qNum, qId } = resolveTokenTarget(tokenValue, blankState);
        const isActive = qNum != null && activeQuestion === qNum;
        const answer = qId ? (answers?.[qId] || '') : '';
        const isCorrect = checkAnswer(answer, subQ?.correctAnswer);
        const displayAnswer = (isReview && !isCorrect)
            ? String(subQ?.correctAnswer || '').split('|')[0]
            : String(answer || '');

        return (
            <span
                key={key}
                id={qNum != null ? `question-${qNum}` : undefined}
                className={`inline-question summary-inline-item ${isActive ? 'active-question-input' : ''} ${qNum != null && Boolean(bookmarks?.[qNum]) ? 'bookmarked-question-input' : ''} relative-pos`}
                onClick={() => { if (qNum != null) setActiveQuestion?.(qNum); }}
            >
                <input
                    ref={(el) => {
                        if (!inputRefs?.current) return;
                        if (qNum != null) inputRefs.current[qNum] = el;
                    }}
                    type="text"
                    className={`inline-input summary-input ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                    placeholder={qNum != null ? qNum.toString() : ''}
                    value={displayAnswer}
                    onChange={(e) => {
                        if (!isReview && qId) handleAnswerChange?.(qId, e.target.value);
                    }}
                    onFocus={() => {
                        if (!isReview && qNum != null) setActiveQuestion?.(qNum);
                    }}
                    autoComplete="off"
                    spellCheck="false"
                    readOnly={isReview || !qId}
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

    const renderRichText = (text, keyPrefix, blankState = { cursor: 0 }) => {
        if (!text) return null;

        const normalizedText = normalizeBlankTokens(text);
        const htmlText = formatInlineHtml(normalizedText);

        if (typeof DOMParser === 'undefined') {
            return <span dangerouslySetInnerHTML={{ __html: htmlText }} />;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${htmlText}</div>`, 'text/html');
        const root = doc.body.firstElementChild;
        if (!root) return null;

        return Array.from(root.childNodes || []).flatMap((node, idx) => {
            const renderedNode = renderDomNodeWithTokens(node, `${keyPrefix}-${idx}`, blankState);
            if (Array.isArray(renderedNode)) {
                return renderedNode.filter((entry) => entry !== null && entry !== undefined);
            }
            return renderedNode === null || renderedNode === undefined ? [] : [renderedNode];
        });
    };

    const renderImageNoteForm = () => {
        const imagePosition = q?.imagePosition || 'middle';
        const imageWidth = resolveImageWidthPercent(q?.imageWidth);
        const pinBoxWidth = resolvePinBoxWidthPx(q?.pinBoxWidth, 60);
        const topText = q?.topNoteText ?? '';
        const bottomText = q?.bottomNoteText ?? '';
        const sharedBlankState = { cursor: 0 };
        const renderImage = () => (
            <div style={{ margin: '16px auto', textAlign: 'center' }}>
                {q?.imageUrl ? (
                    <div style={{ position: 'relative', width: `${imageWidth}%`, margin: '0 auto' }}>
                        <img
                            src={resolveDrivePreviewUrl(q.imageUrl)}
                            alt="Question diagram"
                            style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        />
                        {imagePinSubQuestions.map((subQ) => {
                            const answer = answers?.[subQ.id] || '';
                            const isCorrect = checkAnswer(answer, subQ?.correctAnswer);
                            const displayAnswer = (isReview && !isCorrect)
                                ? String(subQ?.correctAnswer || '').split('|')[0]
                                : String(answer || '');
                            const isActive = activeQuestion === subQ.number;
                            const isBookmarked = Boolean(bookmarks?.[subQ.number]);
                            // Builder pin content footprint is wider than the slider minimum,
                            // so keep runtime pin width near builder visual center.
                            const boxWidth = Math.min(480, Math.max(80, pinBoxWidth));

                            return (
                                <input
                                    key={subQ.id}
                                    id={`question-${subQ.number}`}
                                    ref={(el) => { if (inputRefs?.current) inputRefs.current[subQ.number] = el; }}
                                    type="text"
                                    className={`inline-input summary-input summary-image-pin ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                                    placeholder={String(subQ.number)}
                                    value={displayAnswer}
                                    onChange={(e) => { if (!isReview) handleAnswerChange?.(subQ.id, e.target.value); }}
                                    onClick={() => { if (!isReview) setActiveQuestion?.(subQ.number); }}
                                    onFocus={() => { if (!isReview) setActiveQuestion?.(subQ.number); }}
                                    readOnly={isReview}
                                    style={{
                                        position: 'absolute',
                                        left: subQ.left || '50%',
                                        top: subQ.top || '50%',
                                        width: `${boxWidth}px`,
                                        minWidth: `${boxWidth}px`,
                                        maxWidth: `${boxWidth}px`,
                                        boxSizing: 'border-box',
                                        borderColor: isBookmarked ? '#fea706' : (isActive ? '#5b9bd5' : undefined),
                                        boxShadow: isBookmarked
                                            ? '0 0 0 1px rgba(254, 167, 6, 0.35)'
                                            : (isActive ? '0 0 0 1px #5b9bd5' : undefined),
                                    }}
                                />
                            );
                        })}
                    </div>
                ) : null}
            </div>
        );

        if (imagePosition === 'top') {
            return (
                <>
                    {renderImage()}
                    {topText && <>{renderRichText(topText, 'summary-top', sharedBlankState)}</>}
                </>
            );
        }

        if (imagePosition === 'bottom') {
            return (
                <>
                    {topText && <>{renderRichText(topText, 'summary-top', sharedBlankState)}</>}
                    {bottomText && <>{renderRichText(bottomText, 'summary-bottom', sharedBlankState)}</>}
                    {renderImage()}
                </>
            );
        }

        return (
            <>
                {topText && <>{renderRichText(topText, 'summary-top', sharedBlankState)}</>}
                {renderImage()}
                {bottomText && <>{renderRichText(bottomText, 'summary-bottom', sharedBlankState)}</>}
            </>
        );
    };

    return (
        <div className="summary-completion-container">
            {instructionsText && (
                <div className="summary-instructions" dangerouslySetInnerHTML={{ __html: formatInlineHtml(instructionsText) }} />
            )}
            {title && (
                <div className="summary-title" dangerouslySetInnerHTML={{ __html: formatInlineHtml(title) }} />
            )}
            <div className="summary-text" ref={summaryTextRef}>
                {isImageNoteForm ? renderImageNoteForm() : renderRichText(textToRender, 'summary-node')}
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
