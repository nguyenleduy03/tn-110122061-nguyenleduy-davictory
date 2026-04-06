import React from 'react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import { isQuestionMetaLabel } from '../../utils/questionLabelUtils';
import { resolveDrivePreviewUrl } from '../../utils/mediaUrl';
import BookmarkToggle from '../common/BookmarkToggle';

const formatAndClean = (text) => formatTextWithWhitespace(text);

const normalizeGroupType = (rawType) => String(rawType || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

const resolveImageWidthPercent = (value, fallback = 100) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace('%', '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const parseFlowNodeText = (text) => {
    const segments = (text ?? '').split(/\[blank\]/gi);
    const result = [];
    segments.forEach((seg, i) => {
        if (seg) result.push({ type: 'text', content: seg });
        if (i < segments.length - 1) result.push({ type: 'blank' });
    });
    return result;
};

const DragDropGroupQuestion = ({ q, resolvedType, activeQuestion, setActiveQuestion, answers, handleAnswerChange, bookmarks, toggleBookmark, isReview }) => {
    const resolveText = (value) => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
            return value.text || value.label || value.value || value.optionText || value.optionLabel || value.key || '';
        }
        return String(value ?? '');
    };

    const questionType = normalizeGroupType(resolvedType || q?.type);
    const normalizeBlankTokens = (text) => {
        let s = String(text || '');
        s = s.replace(/<span[^>]*data-blank=["']true["'][^>]*>[\s\S]*?<\/span>/gi, '[blank]');
        s = s.replace(/\[\s*blank\s*\]/gi, '[blank]');
        return s;
    };

    const extractInlineBlankParts = (text) => {
        const normalized = normalizeBlankTokens(text);
        const match = normalized.match(/\[blank\]/i);
        if (!match || typeof match.index !== 'number') return null;

        const tokenStart = match.index;
        const tokenEnd = tokenStart + match[0].length;
        const before = normalized.slice(0, tokenStart);
        const afterRaw = normalized.slice(tokenEnd);
        const after = afterRaw.replace(/\[blank\]/gi, '');

        return { before, after };
    };

    const handleDragStart = (e, option, sourceQId = null) => {
        e.dataTransfer.setData('text/plain', option);
        if (sourceQId) {
            e.dataTransfer.setData('sourceQId', String(sourceQId));
        }
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, subQId) => {
        if (isReview) return;
        e.preventDefault();
        const option = e.dataTransfer.getData('text/plain');
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (option) {
            handleAnswerChange(subQId, option);
            if (sourceQId && sourceQId !== String(subQId)) {
                handleAnswerChange(sourceQId, '');
            }
        }
    };

    const handleBankDrop = (e) => {
        e.preventDefault();
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (sourceQId) {
            handleClear(sourceQId);
        }
    };

    const handleClear = (subQId) => {
        handleAnswerChange(subQId, '');
    };

    const hasFewerOptionsThanZones = (options, zoneCount) => {
        const totalOptions = (options || []).filter((opt) => String(opt || '').trim() !== '').length;
        return totalOptions > 0 && totalOptions < zoneCount;
    };

    const isMatchingHeading = questionType === 'matching_heading';
    const isMatchingInfo = questionType === 'matching_info' || questionType === 'drag_drop_group';
    const isMatchingFeatures = questionType === 'matching_features';
    const isFlowChart = questionType === 'flow_chart';
    const isImageDragDrop = questionType === 'image_drag_drop';
    const previewBankOptions = (q.bankOptions || []).map(resolveText).filter(Boolean);

    // Debug matching_info
    if (isMatchingInfo) {
        console.log('[DragDropGroupQuestion] matching_info data:', {
            questionId: q.id,
            type: questionType,
            leftHeader: q.leftHeader,
            rightHeader: q.rightHeader,
            bankOptions: previewBankOptions.slice(0, 3),
            subQuestionsCount: (q.subQuestions || []).length
        });
    }

    const matchingHeadingContainerRef = React.useRef(null);
    const [headingOptionsBookmarkTop, setHeadingOptionsBookmarkTop] = React.useState(null);
    const activeHeadingSubQ = React.useMemo(() => {
        if (!isMatchingHeading) return null;
        const activeNumber = Number(activeQuestion);
        if (!Number.isFinite(activeNumber)) return null;
        return (q.subQuestions || []).find((sq) => Number(sq.number) === activeNumber) || null;
    }, [activeQuestion, isMatchingHeading, q.subQuestions]);

    const syncHeadingOptionsBookmarkPosition = React.useCallback(() => {
        if (!isMatchingHeading || isReview || !activeHeadingSubQ) {
            setHeadingOptionsBookmarkTop(null);
            return;
        }

        const container = matchingHeadingContainerRef.current;
        if (!container) {
            setHeadingOptionsBookmarkTop(null);
            return;
        }

        const activeGap = document.querySelector(`.passage-section .heading-gap[data-number="${activeHeadingSubQ.number}"]`);
        if (!activeGap) {
            setHeadingOptionsBookmarkTop(null);
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const gapRect = activeGap.getBoundingClientRect();
        const rawTop = gapRect.top - containerRect.top;
        setHeadingOptionsBookmarkTop(rawTop);
    }, [activeHeadingSubQ, isMatchingHeading, isReview]);

    React.useLayoutEffect(() => {
        syncHeadingOptionsBookmarkPosition();
    }, [syncHeadingOptionsBookmarkPosition, answers]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleResize = () => syncHeadingOptionsBookmarkPosition();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [syncHeadingOptionsBookmarkPosition]);

    const imageDragDropContainerRef = React.useRef(null);
    const [imageBookmarkTop, setImageBookmarkTop] = React.useState(null);
    const imageSubQuestions = q.subQuestions || [];
    const activeImageSubQ = React.useMemo(() => {
        if (!isImageDragDrop) return null;
        const activeNumber = Number(activeQuestion);
        if (!Number.isFinite(activeNumber)) return null;
        return imageSubQuestions.find((sq) => Number(sq.number) === activeNumber) || null;
    }, [activeQuestion, imageSubQuestions, isImageDragDrop]);

    const syncImageBookmarkPosition = React.useCallback(() => {
        if (!isImageDragDrop || isReview || !activeImageSubQ) {
            setImageBookmarkTop(null);
            return;
        }

        const container = imageDragDropContainerRef.current;
        if (!container) {
            setImageBookmarkTop(null);
            return;
        }

        const activeNode = container.querySelector(`#question-${activeImageSubQ.number}`);
        if (!activeNode) {
            setImageBookmarkTop(null);
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const activeRect = activeNode.getBoundingClientRect();
        const top = activeRect.top - containerRect.top + (activeRect.height / 2);
        setImageBookmarkTop(top);
    }, [activeImageSubQ, isImageDragDrop, isReview]);

    React.useLayoutEffect(() => {
        syncImageBookmarkPosition();
    }, [syncImageBookmarkPosition, answers]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => syncImageBookmarkPosition();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [syncImageBookmarkPosition]);

    const matchingInfoContainerRef = React.useRef(null);
    const [ddBookmarkTop, setDdBookmarkTop] = React.useState(null);
    const activeMatchingSubQ = React.useMemo(() => {
        if (!isMatchingInfo) return null;
        const activeNumber = Number(activeQuestion);
        if (!Number.isFinite(activeNumber)) return null;
        return (q.subQuestions || []).find((sq) => Number(sq.number) === activeNumber) || null;
    }, [activeQuestion, isMatchingInfo, q.subQuestions]);

    const syncDdBookmarkPosition = React.useCallback(() => {
        if (!isMatchingInfo || isReview || !activeMatchingSubQ) {
            setDdBookmarkTop(null);
            return;
        }

        const container = matchingInfoContainerRef.current;
        if (!container) {
            setDdBookmarkTop(null);
            return;
        }

        const activeNode = container.querySelector(`#question-${activeMatchingSubQ.number}`);
        if (!activeNode) {
            setDdBookmarkTop(null);
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const activeRect = activeNode.getBoundingClientRect();
        const top = activeRect.top - containerRect.top;
        setDdBookmarkTop(top);
    }, [activeMatchingSubQ, isMatchingInfo, isReview]);

    React.useLayoutEffect(() => {
        syncDdBookmarkPosition();
    }, [syncDdBookmarkPosition, answers]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => syncDdBookmarkPosition();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [syncDdBookmarkPosition]);

    const flowChartContainerRef = React.useRef(null);
    const [flowBookmarkTop, setFlowBookmarkTop] = React.useState(null);
    const activeFlowSubQ = React.useMemo(() => {
        if (!isFlowChart) return null;
        const activeNumber = Number(activeQuestion);
        if (!Number.isFinite(activeNumber)) return null;
        return (q.subQuestions || []).find((sq) => Number(sq.number) === activeNumber) || null;
    }, [activeQuestion, isFlowChart, q.subQuestions]);

    const syncFlowBookmarkPosition = React.useCallback(() => {
        if (!isFlowChart || isReview || !activeFlowSubQ) {
            setFlowBookmarkTop(null);
            return;
        }

        const container = flowChartContainerRef.current;
        if (!container) {
            setFlowBookmarkTop(null);
            return;
        }

        const activeNode = container.querySelector(`#question-${activeFlowSubQ.number}`);
        if (!activeNode) {
            setFlowBookmarkTop(null);
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const activeRect = activeNode.getBoundingClientRect();
        const top = activeRect.top - containerRect.top;
        setFlowBookmarkTop(top);
    }, [activeFlowSubQ, isFlowChart, isReview]);

    React.useLayoutEffect(() => {
        syncFlowBookmarkPosition();
    }, [syncFlowBookmarkPosition, answers]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => syncFlowBookmarkPosition();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [syncFlowBookmarkPosition]);

    // Calculate max length of bank options for sizing dropzones
    const bankOptions = (q.bankOptions || []).map(resolveText).filter(Boolean);
    const totalDropZones = (q.subQuestions || []).length;

    // Debug: Log bankOptions for matching_heading
    if (isMatchingHeading) {
        console.log('[DragDropGroupQuestion] matching_heading data:', {
            questionId: q.id,
            rawBankOptions: q.bankOptions,
            processedBankOptions: bankOptions,
            subQuestionsCount: totalDropZones
        });
    }
    // Reuse cards by default for "machine" drag/drop styles.
    // You can explicitly override per-question/group via q.allowOptionReuse (boolean).
    const allowOptionReuse = (typeof q.allowOptionReuse === 'boolean')
        ? q.allowOptionReuse
        : true;
    const maxOptionChars = Math.max(0, ...bankOptions.map(opt => String(opt).length));
    const fixedBankWidth = Math.max(220, Math.min(720, Math.ceil(maxOptionChars * 8 + 30)));
    const rowHeight = isMatchingHeading ? 52 : 48;
    const titleHeight = (isMatchingHeading || isMatchingInfo) ? 44 : 0;
    const fixedBankHeight = Math.max(180, bankOptions.length * rowHeight + titleHeight + 16);
    const responsiveInfoWidth = Math.max(220, Math.min(720, fixedBankWidth));
    const dropZoneWidth = isMatchingInfo
        ? `clamp(160px, 34vw, ${responsiveInfoWidth}px)`
        : '150px';

    // Gather all currently used options to highlight or disable them
    const usedOptions = (q.subQuestions || []).map(subQ => answers[subQ.id]).filter(Boolean);

    const renderBank = () => (
        <div className={`bank-section ${isMatchingHeading ? 'bank-heading' : ''} ${(isMatchingHeading || isMatchingInfo) ? 'bank-drop-target' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleBankDrop}
            style={(isMatchingHeading || isMatchingInfo)
                ? {
                    '--dd-bank-fixed-width': `${fixedBankWidth}px`,
                    '--dd-bank-fixed-height': `${fixedBankHeight}px`
                }
                : undefined}
        >
            {isMatchingHeading && <h4 className="bank-section-title">List of Headings</h4>}
            {isMatchingInfo && <h4 className="bank-section-title info-title" dangerouslySetInnerHTML={{ __html: q.rightHeader || 'Options' }} />}
            <div className="options-bank">
                {bankOptions.map((opt, idx) => {
                    const isUsed = usedOptions.includes(opt);
                    if (isUsed && !isReview && !allowOptionReuse) return null;
                    return (
                        <div
                            key={idx}
                            draggable={!isReview}
                            onDragStart={(e) => { if (!isReview) handleDragStart(e, opt, null); }}
                            className={`bank-option ${isUsed ? 'used' : ''} ${isMatchingHeading ? 'bank-option-heading' : ''}`}
                            style={{
                                width: isMatchingInfo ? dropZoneWidth : undefined
                            }}
                        >
                            {opt}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderQuestions = () => (
        <div className={`dd-sub-questions ${isMatchingInfo ? 'dd-info-padded' : ''}`}>
            {isMatchingInfo && <h4 className="bank-section-title info-title" dangerouslySetInnerHTML={{ __html: q.leftHeader || 'Questions' }} />}
            <div className="dd-questions-list">
                {(q.subQuestions || []).map((subQ) => {
                    const isActive = activeQuestion === subQ.number;
                    const answer = resolveText(answers[subQ.id]);
                    const normalizedAnswer = String(answer || '').trim().toLowerCase();
                    const normalizedCorrect = String(subQ.correctAnswer || '').trim().toLowerCase();
                    const isCorrect = normalizedAnswer === normalizedCorrect;
                    const displayAnswer = (isReview && !isCorrect)
                        ? resolveText(subQ.correctAnswer || '')
                        : String(answer || '');
                    const hasDisplayAnswer = displayAnswer.trim() !== '';
                    const inlineBlankParts = extractInlineBlankParts(subQ.text || '');
                    const hasInlineBlank = !isMatchingInfo && !!inlineBlankParts;
                    const infoText = isMatchingInfo
                        ? normalizeBlankTokens(subQ.text || '').replace(/\[blank\]/gi, '').trim()
                        : (subQ.text || '');

                    const answerCharWidth = Math.max(8, displayAnswer.length + 2);
                    const filledDropStyle = hasDisplayAnswer
                        ? {
                            width: hasInlineBlank
                                ? `clamp(88px, ${answerCharWidth}ch, 360px)`
                                : (isMatchingInfo
                                    ? `clamp(120px, ${answerCharWidth}ch, ${responsiveInfoWidth}px)`
                                    : `clamp(150px, ${answerCharWidth}ch, 520px)`),
                        }
                        : undefined;
                    const fixedInfoStyle = (!hasDisplayAnswer && isMatchingInfo)
                        ? { width: dropZoneWidth }
                        : undefined;
                    const dropZoneStyle = filledDropStyle || fixedInfoStyle;

                    const dropZoneNode = (
                        <div
                            onDrop={isReview ? undefined : (e) => handleDrop(e, subQ.id)}
                            onDragOver={isReview ? undefined : handleDragOver}
                            draggable={!isReview && hasDisplayAnswer}
                            onDragStart={(e) => {
                                if (isReview || !hasDisplayAnswer) return;
                                handleDragStart(e, displayAnswer, subQ.id);
                            }}
                            className={`dd-drop-zone ${isMatchingInfo ? 'dd-drop-info' : ''} ${hasInlineBlank ? 'dd-drop-inline' : ''} ${hasDisplayAnswer ? 'dd-drop-filled' : ''} ${isActive && !hasDisplayAnswer ? 'dd-drop-active' : ''} ${Boolean(bookmarks?.[subQ.number]) ? 'dd-drop-bookmarked' : ''} ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''} relative-pos`}
                            style={dropZoneStyle}
                        >
                            {hasDisplayAnswer ? (
                                <span className="dd-drop-answer">
                                    {displayAnswer}
                                </span>
                            ) : (
                                isMatchingInfo ? (
                                    <div className="dd-drop-number">
                                        {subQ.number}
                                    </div>
                                ) : (
                                    <span className="dd-drop-placeholder">Drop here</span>
                                )
                            )}
                        </div>
                    );

                    return (
                        <div
                            key={subQ.id}
                            id={`question-${subQ.number}`}
                            className={`dd-question-row ${isMatchingInfo ? 'dd-row-info' : 'dd-row-default'}`}
                            onClick={() => setActiveQuestion?.(subQ.number)}
                        >
                            {isMatchingInfo && infoText ? (
                                <div className={`dd-info-text ${hasInlineBlank ? 'dd-info-inline' : ''}`}>
                                    {hasInlineBlank ? (
                                        <span className="dd-inline-content">
                                            <span dangerouslySetInnerHTML={{ __html: formatAndClean(inlineBlankParts.before) }} />
                                            {dropZoneNode}
                                            <span dangerouslySetInnerHTML={{ __html: formatAndClean(inlineBlankParts.after) }} />
                                        </span>
                                    ) : (
                                        <span dangerouslySetInnerHTML={{ __html: formatAndClean(infoText) }} />
                                    )}
                                </div>
                            ) : null}

                            <div className="dd-default-meta">
                                {!isMatchingInfo && <div className="dd-default-label">
                                    <span className="dd-question-num">{subQ.number}</span>
                                </div>}
                                {!isMatchingInfo && (
                                    hasInlineBlank ? (
                                        <span className="dd-question-text dd-question-inline">
                                            <span className="dd-inline-content">
                                                <span dangerouslySetInnerHTML={{ __html: formatAndClean(inlineBlankParts.before) }} />
                                                {dropZoneNode}
                                                <span dangerouslySetInnerHTML={{ __html: formatAndClean(inlineBlankParts.after) }} />
                                            </span>
                                        </span>
                                    ) : (
                                        <>
                                            <span className="dd-question-text" dangerouslySetInnerHTML={{ __html: formatAndClean(subQ.text || '') }} />
                                            {dropZoneNode}
                                        </>
                                    )
                                )}

                                {isMatchingInfo && dropZoneNode}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderFlowChart = () => {
        const flowNodes = q.flowNodes ?? [];
        const subQuestions = q.subQuestions ?? [];
        const chartTitle = isQuestionMetaLabel(q.title) ? '' : (q.title || '');
        const bankTitle = isQuestionMetaLabel(q.bankTitle) ? '' : (q.bankTitle || '');

        let blankCounter = 0;
        const nodeRenderData = flowNodes.map((node) => {
            const parts = parseFlowNodeText(node.text).map((part) => {
                if (part.type === 'blank') {
                    return { ...part, subQ: subQuestions[blankCounter++] ?? null };
                }
                return part;
            });
            return { node, parts };
        });

        const usedAnswers = Object.values(answers || {}).filter(Boolean);
        const allowReuse = (typeof q.allowOptionReuse === 'boolean') ? q.allowOptionReuse : true;

        return (
            <div className="fc-container" ref={flowChartContainerRef}>
                <div className="fc-layout">
                    <div className="fc-chart">
                        {chartTitle && <div className="fc-chart-title">{chartTitle}</div>}
                        <div className="fc-flow-stack">
                            {nodeRenderData.map(({ node, parts }, idx) => (
                                <React.Fragment key={node.id ?? idx}>
                                    <div className="fc-node">
                                        <p className="fc-node-text">
                                            {parts.map((part, pidx) => {
                                                if (part.type === 'text') {
                                                    return <span key={pidx}>{part.content}</span>;
                                                }

                                                const subQ = part.subQ;
                                                const answer = subQ ? answers[subQ.id] : undefined;
                                                const normalizedAnswer = String(answer || '').trim().toLowerCase();
                                                const normalizedCorrect = String(subQ?.correctAnswer || '').trim().toLowerCase();
                                                const isCorrect = normalizedAnswer === normalizedCorrect;
                                                const displayAnswer = (isReview && !isCorrect)
                                                    ? String(subQ?.correctAnswer || '')
                                                    : String(answer || '');
                                                const hasDisplayAnswer = displayAnswer.trim() !== '';
                                                const isActive = subQ ? activeQuestion === subQ.number : false;
                                                const showQuestionNumber = !hasDisplayAnswer;

                                                return (
                                                    <span
                                                        key={pidx}
                                                        id={subQ ? `question-${subQ.number}` : undefined}
                                                        className={`fc-blank${hasDisplayAnswer ? ' fc-blank-filled' : ''}${isActive && showQuestionNumber ? ' fc-blank-active' : ''}${Boolean(bookmarks?.[subQ?.number]) ? ' fc-blank-bookmarked' : ''} ${isReview && subQ ? (isCorrect ? 'review-correct' : 'review-wrong') : ''} relative-pos`}
                                                        onClick={(e) => { e.stopPropagation(); if (subQ && !isReview) setActiveQuestion(subQ.number); }}
                                                        onDragOver={isReview ? undefined : handleDragOver}
                                                        onDrop={isReview ? undefined : (e) => subQ && handleDrop(e, subQ.id)}
                                                        draggable={!isReview && !!answer}
                                                        onDragStart={(e) => { if (!isReview && answer) handleDragStart(e, answer, subQ?.id); }}
                                                        tabIndex={subQ && !isReview ? 0 : -1}
                                                        onFocus={() => { if (subQ && !isReview) setActiveQuestion(subQ.number); }}
                                                    >
                                                        {showQuestionNumber && <strong className="fc-blank-num">{subQ?.number}</strong>}
                                                        {hasDisplayAnswer && <span className="fc-blank-answer">{displayAnswer}</span>}
                                                    </span>
                                                );
                                            })}
                                        </p>
                                    </div>
                                    {idx < nodeRenderData.length - 1 && (
                                        <div className="fc-arrow">↓</div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="fc-bank" onDragOver={handleDragOver} onDrop={handleBankDrop}>
                        {bankTitle && <div className="fc-bank-title">{bankTitle}</div>}
                        {(q.bankOptions ?? []).map((opt, i) => {
                            if (usedAnswers.includes(opt) && !allowReuse) return null;
                            return (
                                <div
                                    key={i}
                                    className="fc-bank-chip"
                                    draggable={!isReview}
                                    onDragStart={(e) => { if (!isReview) handleDragStart(e, opt); }}
                                >
                                    {opt}
                                </div>
                            );
                        })}
                    </div>
                </div>
                {!isReview && activeFlowSubQ && flowBookmarkTop !== null && (
                    <BookmarkToggle
                        className="question-bookmark flow-floating-bookmark"
                        style={{ top: `${flowBookmarkTop}px` }}
                        active={Boolean(bookmarks?.[activeFlowSubQ.number])}
                        onToggle={() => toggleBookmark?.(activeFlowSubQ.number)}
                    />
                )}
            </div>
        );
    };

    const renderImageDragDrop = () => {
        const usedOptions = Object.values(answers || {}).filter(Boolean);
        const subQuestions = q.subQuestions || [];
        const numbers = subQuestions.map((subQ) => subQ.number).filter((n) => Number.isFinite(n));
        const minNum = numbers.length ? Math.min(...numbers) : null;
        const maxNum = numbers.length ? Math.max(...numbers) : null;
        const fallbackHeading = (minNum !== null && maxNum !== null)
            ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}–${maxNum}`)
            : '';
        const heading = q.heading || fallbackHeading;
        const instruction = q.instruction || '';
        const imageWidth = resolveImageWidthPercent(q.imageWidth);
        const pinBoxWidth = Number.isFinite(Number(q.pinBoxWidth)) ? Number(q.pinBoxWidth) : 60;
        const constrainHalfPage = Boolean(q.constrainHalfPage);
        const allowReuse = (typeof q.allowOptionReuse === 'boolean') ? q.allowOptionReuse : true;

        return (
            <div className="image-drag-drop-container" ref={imageDragDropContainerRef}>
                <div className="image-drag-drop-body">
                    <div className={`image-area${constrainHalfPage ? ' half-page' : ''}`}>
                        <div style={{ position: 'relative', width: `${imageWidth}%`, margin: '0 auto' }}>
                            {q.imageUrl ? (
                                <img
                                    src={resolveDrivePreviewUrl(q.imageUrl)}
                                    alt="Map"
                                    className="idd-map-image"
                                    style={{ width: '100%', display: 'block' }}
                                    onLoad={syncImageBookmarkPosition}
                                />
                            ) : (
                                <div className="image-placeholder">
                                    Image Placeholder (Add imageUrl to data)
                                </div>
                            )}

                            {subQuestions.map((subQ) => {
                                const answer = answers[subQ.id];
                                const normalizedAnswer = String(answer || '').trim().toLowerCase();
                                const normalizedCorrect = String(subQ.correctAnswer || '').trim().toLowerCase();
                                const isCorrect = normalizedAnswer === normalizedCorrect;
                                const displayAnswer = (isReview && !isCorrect)
                                    ? String(subQ.correctAnswer || '')
                                    : String(answer || '');
                                const hasAnswer = displayAnswer.trim() !== '';
                                const isActive = activeQuestion === subQ.number;
                                const basePinWidth = Math.max(56, Number(pinBoxWidth) || 60);
                                const answerCharWidth = Math.max(8, displayAnswer.length + 2);
                                const resolvedPinWidth = hasAnswer
                                    ? `clamp(${basePinWidth}px, ${answerCharWidth}ch, 320px)`
                                    : `${basePinWidth}px`;

                                return (
                                    <div
                                        key={subQ.id}
                                        id={`question-${subQ.number}`}
                                        className={`drop-zone ml-drop-zone ${isActive && !hasAnswer ? 'active' : ''} ${hasAnswer ? 'has-answer' : ''} ${Boolean(bookmarks?.[subQ.number]) ? 'drop-zone-bookmarked' : ''} ${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                                        onClick={() => { if (!isReview) setActiveQuestion?.(subQ.number); }}
                                        onDrop={isReview ? undefined : (e) => handleDrop(e, subQ.id)}
                                        onDragOver={isReview ? undefined : handleDragOver}
                                        style={{
                                            top: `${subQ.pinY ?? 50}%`,
                                            left: `${subQ.pinX ?? 50}%`,
                                            width: resolvedPinWidth,
                                            minWidth: `${basePinWidth}px`,
                                            maxWidth: hasAnswer ? '320px' : `${basePinWidth}px`,
                                            justifyContent: hasAnswer ? 'flex-start' : 'center'
                                        }}
                                    >
                                        {!hasAnswer && (
                                            <strong className="drop-zone-number">{subQ.number}</strong>
                                        )}

                                        {answer ? (
                                            <div
                                                className="dz-answered"
                                                draggable={!isReview}
                                                onDragStart={(e) => {
                                                    if (isReview) return;
                                                    handleDragStart(e, answer, subQ.id);
                                                }}
                                            >
                                                {displayAnswer}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bank-area" onDragOver={handleDragOver} onDrop={handleBankDrop}>
                        {!isQuestionMetaLabel(q.rightTitle) && q.rightTitle && (
                            <div className="dd-bank-title" dangerouslySetInnerHTML={{ __html: formatAndClean(q.rightTitle) }} />
                        )}
                        <div className="bank-options-list">
                            {(q.bankOptions || []).map((opt, idx) => {
                                const isUsed = usedOptions.includes(opt);
                                if (isUsed && !allowReuse) return null;

                                return (
                                    <div
                                        key={idx}
                                        className="bank-option-item"
                                        draggable={!isReview}
                                        onDragStart={(e) => { if (!isReview) handleDragStart(e, opt); }}
                                    >
                                        {opt}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {!isReview && activeImageSubQ && imageBookmarkTop !== null && (
                    <BookmarkToggle
                        className="question-bookmark image-dd-floating-bookmark"
                        style={{ top: `${imageBookmarkTop}px` }}
                        active={Boolean(bookmarks?.[activeImageSubQ.number])}
                        onToggle={() => toggleBookmark?.(activeImageSubQ.number)}
                    />
                )}
            </div>
        );
    };

    const renderMatchingFeatures = () => {
        const categories = (q.categories || []).length > 0
            ? q.categories
            : ['A', 'B', 'C', 'D', 'E'].map((label) => ({ label, text: '' }));
        const subQuestions = q.subQuestions || [];
        const answerMap = answers || {};

        // Check if options can be reused (default: true)
        const allowOptionReuse = (typeof q.allowOptionReuse === 'boolean')
            ? q.allowOptionReuse
            : true;

        console.log('🔍 Matching Features allowOptionReuse:', allowOptionReuse, 'from q:', q.allowOptionReuse);

        // Track used options if reuse is disabled
        const usedOptions = new Set();
        if (!allowOptionReuse) {
            Object.values(answerMap).filter(Boolean).forEach(opt => usedOptions.add(opt));
        }

        console.log('🔍 Used options:', Array.from(usedOptions), 'answerMap:', answerMap);

        const numbers = subQuestions.map((sq) => sq.number).filter((n) => Number.isFinite(n));
        const minNum = numbers.length ? Math.min(...numbers) : null;
        const maxNum = numbers.length ? Math.max(...numbers) : null;
        const heading = (isQuestionMetaLabel(q.heading) ? '' : q.heading)
            || (minNum !== null && maxNum !== null
                ? (minNum === maxNum ? `Question ${minNum}` : `Questions ${minNum}–${maxNum}`)
                : 'Questions');

        const instruction = (isQuestionMetaLabel(q.instruction) ? '' : q.instruction)
            || `Choose the correct group (${categories[0]?.label || 'A'}–${categories[categories.length - 1]?.label || 'E'}) for each item. You may choose any group more than once.`;

        const handleSelect = (questionId, label) => {
            if (isReview) return;
            const current = answerMap[questionId];
            handleAnswerChange?.(questionId, current === label ? '' : label);
        };

        return (
            <div className="mf-container">
                <div className="question-header-container">
                    <p className="question-heading">{heading}</p>
                    <p
                        className="question-instruction"
                        dangerouslySetInnerHTML={{ __html: formatAndClean(instruction) }}
                    />
                </div>

                {categories.length > 0 && (
                    <div className="mf-categories-box">
                        {q.categoryTitle && (
                            <div
                                className="mf-category-title"
                                dangerouslySetInnerHTML={{ __html: formatAndClean(q.categoryTitle) }}
                            />
                        )}
                        <div className="mf-category-list">
                            {categories.map((cat) => (
                                <div key={cat.label} className="mf-category-row">
                                    <span className="mf-cat-label">{cat.label}</span>
                                    <span
                                        className="mf-cat-text"
                                        dangerouslySetInnerHTML={{ __html: formatAndClean(cat.text || '') }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mf-table-wrap">
                    <table className="mf-table">
                        <thead>
                            <tr className="mf-header-row">
                                <th className="mf-th-item"></th>
                                {categories.map((cat) => (
                                    <th key={cat.label} className="mf-th-cat">{cat.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {subQuestions.map((subQ) => {
                                const isActive = activeQuestion === subQ.number;
                                const selectedLabel = answerMap[subQ.id] || '';
                                const isCorrect = String(selectedLabel).trim() === String(subQ.correctAnswer || '').trim();

                                return (
                                    <tr
                                        key={subQ.id}
                                        id={`question-${subQ.number}`}
                                        className={`mf-question-row ${isActive ? 'mf-row-active' : ''}`}
                                        onClick={() => setActiveQuestion?.(subQ.number)}
                                    >
                                        <td className="mf-td-item">
                                            <div className="mf-item-inner">
                                                {!isReview && isActive && (
                                                    <BookmarkToggle
                                                        className="question-bookmark"
                                                        active={Boolean(bookmarks?.[subQ.number])}
                                                        onToggle={() => toggleBookmark?.(subQ.number)}
                                                    />
                                                )}
                                                <span className="mf-q-num">{subQ.number}</span>
                                                <span
                                                    className="mf-q-text"
                                                    dangerouslySetInnerHTML={{
                                                        __html: formatAndClean(subQ.text || '')
                                                    }}
                                                />
                                            </div>
                                        </td>

                                        {categories.map((cat) => {
                                            const isSelected = selectedLabel === cat.label;
                                            const isCorrectCell = isReview && cat.label === String(subQ.correctAnswer || '').trim();
                                            const isWrongCell = isReview && isSelected && !isCorrect;

                                            // Disable option if already used and reuse is not allowed
                                            const isUsed = !allowOptionReuse && usedOptions.has(cat.label) && selectedLabel !== cat.label;
                                            const isDisabled = !isReview && isUsed;

                                            let cellClass = 'mf-choice-cell';
                                            if (isSelected && !isReview) cellClass += ' mf-selected';
                                            if (isCorrectCell) cellClass += ' mf-review-correct';
                                            if (isWrongCell) cellClass += ' mf-review-wrong';
                                            if (isReview && isSelected && isCorrect) cellClass += ' mf-review-correct';
                                            if (isDisabled) cellClass += ' mf-disabled';

                                            return (
                                                <td
                                                    key={cat.label}
                                                    className={cellClass}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isDisabled) {
                                                            handleSelect(subQ.id, cat.label);
                                                        }
                                                    }}
                                                    title={isReview ? undefined : (isDisabled ? 'Đã sử dụng' : `Chọn ${cat.label}`)}
                                                    style={isDisabled ? { cursor: 'not-allowed', opacity: 0.4 } : undefined}
                                                >
                                                    {isSelected && (
                                                        <span className="mf-check-mark">
                                                            {isReview
                                                                ? (isCorrect ? '✓' : '✗')
                                                                : '✓'}
                                                        </span>
                                                    )}
                                                    {isReview && isCorrectCell && !isSelected && (
                                                        <span className="mf-correct-hint">✓</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (isFlowChart) {
        return renderFlowChart();
    }

    if (isImageDragDrop) {
        return renderImageDragDrop();
    }

    if (isMatchingFeatures) {
        return renderMatchingFeatures();
    }

    if (isMatchingHeading) {
        return (
            <div className="drag-drop-group matching-heading" ref={matchingHeadingContainerRef}>
                <p className="dd-heading-instruction">
                    Choose the correct heading for each section and move it into the gap.
                </p>
                {renderBank()}
                {!isReview && activeHeadingSubQ && headingOptionsBookmarkTop !== null && (
                    <BookmarkToggle
                        className="question-bookmark heading-options-floating-bookmark"
                        style={{ top: `${headingOptionsBookmarkTop}px` }}
                        active={Boolean(bookmarks?.[activeHeadingSubQ.number])}
                        onToggle={() => toggleBookmark?.(activeHeadingSubQ.number)}
                    />
                )}
            </div>
        );
    }

    if (isMatchingInfo) {
        return (
            <div className="drag-drop-group matching-info" ref={matchingInfoContainerRef}>
                <div className="matching-info-layout">
                    <div className="dd-info-questions-col">
                        {renderQuestions()}
                    </div>
                    <div className="dd-info-bank-col">
                        {renderBank()}
                    </div>
                </div>
                {!isReview && activeMatchingSubQ && ddBookmarkTop !== null && (
                    <BookmarkToggle
                        className="question-bookmark matching-info-floating-bookmark"
                        style={{ top: `${ddBookmarkTop}px` }}
                        active={Boolean(bookmarks?.[activeMatchingSubQ.number])}
                        onToggle={() => toggleBookmark?.(activeMatchingSubQ.number)}
                    />
                )}
            </div>
        );
    }

    // Default drag-and-drop
    return (
        <div className="drag-drop-group">
            {renderBank()}
            {renderQuestions()}
        </div>
    );
};

export default DragDropGroupQuestion;
