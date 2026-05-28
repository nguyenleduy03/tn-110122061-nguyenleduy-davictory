import React from 'react';
import { formatTextWithWhitespace } from '../../utils/textFormatters';
import { getAdaptiveInputWidthStyle } from '../../utils/adaptiveInputWidth';
import BookmarkToggle from '../common/BookmarkToggle';

const parseFlowNodeText = (text) => {
  const segments = (text ?? '').split(/\[blank\]/gi);
  const result = [];
  segments.forEach((seg, i) => {
    if (seg) result.push({ type: 'text', content: seg });
    if (i < segments.length - 1) result.push({ type: 'blank' });
  });
  return result;
};

const isQuestionMetaLabel = (value) => {
  if (!value) return false;
  const s = String(value).trim();
  return /^\s*(nh[oó]m|group)\s*\d*\s*$/i.test(s);
};

const FlowChartTextQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, inputRefs, bookmarks, toggleBookmark, isReview }) => {
  const flowNodes = q.flowNodes ?? [];
  const subQuestions = q.subQuestions ?? [];
  const chartTitle = isQuestionMetaLabel(q.title) ? '' : (q.title || '');

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

  const checkAnswer = (userAnswer, correctAnswer) => {
    if (!correctAnswer) return false;
    const opts = q.validationOptions || {};
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
    const normalized = normalizeAnswer(userAnswer);
    const acceptedAnswers = String(correctAnswer || '').split('|').map(a => normalizeAnswer(a));
    return acceptedAnswers.includes(normalized);
  };

  const containerRef = React.useRef(null);
  const [flowBookmarkTop, setFlowBookmarkTop] = React.useState(null);
  const activeFlowSubQ = React.useMemo(() => {
    const activeNumber = Number(activeQuestion);
    if (!Number.isFinite(activeNumber)) return null;
    return subQuestions.find((sq) => Number(sq.number) === activeNumber) || null;
  }, [activeQuestion, subQuestions]);

  const syncBookmarkPosition = React.useCallback(() => {
    if (isReview || !activeFlowSubQ) {
      setFlowBookmarkTop(null);
      return;
    }
    const container = containerRef.current;
    if (!container) { setFlowBookmarkTop(null); return; }
    const activeNode = container.querySelector(`#question-${activeFlowSubQ.number}`);
    if (!activeNode) { setFlowBookmarkTop(null); return; }
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeNode.getBoundingClientRect();
    setFlowBookmarkTop(activeRect.top - containerRect.top);
  }, [activeFlowSubQ, isReview]);

  React.useLayoutEffect(() => { syncBookmarkPosition(); }, [syncBookmarkPosition, answers]);
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => syncBookmarkPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [syncBookmarkPosition]);

  return (
    <div className="fc-container" ref={containerRef}>
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
                      const currentValue = subQ ? answers?.[subQ.id] || '' : '';
                      const isCorrect = checkAnswer(currentValue, subQ?.correctAnswer);
                      const displayValue = (isReview && !isCorrect)
                        ? String(subQ?.correctAnswer || '').split('|')[0]
                        : String(currentValue || '');
                      const isActive = subQ ? activeQuestion === subQ.number : false;
                      const adaptiveInputStyle = getAdaptiveInputWidthStyle(displayValue);

                      return (
                        <span
                          key={pidx}
                          id={subQ ? `question-${subQ.number}` : undefined}
                          className={`fc-blank-text-input inline-question${isActive ? ' active-question-input' : ''}${Boolean(bookmarks?.[subQ?.number]) ? ' bookmarked-question-input' : ''} ${isReview && subQ ? (isCorrect ? 'review-correct' : 'review-wrong') : ''} relative-pos`}
                        >
                          <input
                            ref={(el) => { if (inputRefs?.current && subQ) inputRefs.current[subQ.id] = el; }}
                            type="text"
                            className={`inline-input${isReview ? (isCorrect ? 'review-correct' : 'review-wrong') : ''}`}
                            style={adaptiveInputStyle}
                            placeholder={String(subQ?.number || '')}
                            value={displayValue}
                            onClick={() => { if (subQ) setActiveQuestion?.(subQ.number); }}
                            onFocus={() => { if (subQ && !isReview) setActiveQuestion?.(subQ.number); }}
                            onChange={(e) => { if (subQ && !isReview) handleAnswerChange?.(subQ.id, e.target.value); }}
                            readOnly={isReview}
                            autoComplete="off"
                            spellCheck="false"
                          />
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

export default FlowChartTextQuestion;
