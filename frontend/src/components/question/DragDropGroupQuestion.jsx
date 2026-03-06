import React from 'react';

const DragDropGroupQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange }) => {
    const handleDragStart = (e, option) => {
        e.dataTransfer.setData('text/plain', option);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, subQId) => {
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

    const isMatchingHeading = q.type === 'matching_heading';
    const isMatchingInfo = q.type === 'matching_info';

    // Calculate max length of bank options for sizing dropzones
    const maxOptionChars = Math.max(0, ...(q.bankOptions || []).map(opt => String(opt).length));
    const dropZoneWidth = isMatchingInfo ? `max(150px, ${maxOptionChars * 8 + 30}px)` : '150px';

    // Gather all currently used options to highlight or disable them
    const usedOptions = (q.subQuestions || []).map(subQ => answers[subQ.id]).filter(Boolean);

    const renderBank = () => (
        <div className="bank-section"
            onDragOver={handleDragOver}
            onDrop={handleBankDrop}
            style={{
                display: 'flex', flexDirection: isMatchingHeading ? 'column' : 'row', flexWrap: 'wrap', gap: '10px',
                padding: '0', marginBottom: '20px'
            }}>
            {isMatchingHeading && <h4 style={{ margin: '0 0 10px 0' }}>List of Headings</h4>}
            {isMatchingInfo && <h4 style={{ margin: '0 0 8px 0', width: '100%', fontSize: '18px', fontWeight: 'bold', lineHeight: '20px' }}>{q.rightHeader || 'Options'}</h4>}
            <div className="options-bank" style={{ display: 'flex', flexDirection: isMatchingHeading ? 'column' : 'column', gap: '2px', width: '100%' }}>
                {q.bankOptions.map((opt, idx) => {
                    const isUsed = usedOptions.includes(opt);
                    return (
                        <div
                            key={idx}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, opt)}
                            className={`bank-option ${isUsed ? 'used' : ''}`} style={{ display: isUsed ? 'none' : 'inline-flex', alignItems: 'center', height: '32px', width: isMatchingHeading ? 'fit-content' : (isMatchingInfo ? dropZoneWidth : 'auto'), fontWeight: isMatchingHeading ? 'bold' : 'normal', boxSizing: 'border-box' }}
                        >
                            {opt}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderQuestions = () => (
        <div className={`sub-questions layout-${q.layout || 'list'}`} style={{ flex: 1, paddingRight: isMatchingInfo ? '20px' : '0' }}>
            {isMatchingInfo && <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', lineHeight: '20px' }}>{q.leftHeader || 'Questions'}</h4>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(q.subQuestions || []).map((subQ) => {
                        const isActive = activeQuestion === subQ.number;
                        const answer = answers[subQ.id];

                        return (
                            <div
                                key={subQ.id}
                                id={`question-${subQ.number}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    marginBottom: '0', height: isMatchingInfo ? '32px' : 'auto', boxSizing: 'border-box',
                                    padding: isMatchingInfo ? '0' : '10px',
                                    border: 'none',
                                    backgroundColor: isActive ? '#f9f9f9' : 'transparent',
                                    borderRadius: '6px'
                                }}
                                onClick={() => setActiveQuestion?.(subQ.number)}
                            >
                                {isMatchingInfo && subQ.text ? (
                                    <span style={{ flex: 'none', marginRight: '10px' }}>{subQ.text}</span>
                                ) : null}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {!isMatchingInfo && <span style={{ fontWeight: '500', width: '25px' }}>{subQ.number}</span>}
                                    {!isMatchingInfo && <span style={{ flex: 1 }}>{subQ.text}</span>}

                                    {/* number inside instead */}
                                    <div
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, subQ.id)}
                                        style={{
                                            minWidth: dropZoneWidth,
                                            width: dropZoneWidth,
                                            height: isMatchingInfo ? '32px' : '40px',
                                            border: isMatchingInfo ? '1px dashed #999' : '2px dashed #bbb',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0 10px',
                                            backgroundColor: answer ? '#e8f4fd' : 'white',
                                            position: 'relative'
                                        }}
                                    >
                                        {answer ? (
                                            <>
                                                <span
                                                    draggable={true}
                                                    onDragStart={(e) => {
                                                        handleDragStart(e, answer);
                                                        e.dataTransfer.setData('sourceQId', subQ.id); // Track which question this came from
                                                    }}
                                                    style={{ fontWeight: 'normal', cursor: 'grab' }}
                                                >
                                                    {answer}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleClear(subQ.id); }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '5px',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#888',
                                                        fontSize: '16px'
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </>
                                        ) : (
                                            isMatchingInfo ? (
                                                <div style={{ color: '#000', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
                                                    {subQ.number}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#aaa', fontSize: '14px' }}>Drop here</span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    if (isMatchingHeading) {
        return (
            <div className="drag-drop-group matching-heading" style={{ marginBottom: '30px' }}>
                <p style={{ marginBottom: '0', height: isMatchingInfo ? '32px' : 'auto', boxSizing: 'border-box', color: '#555' }}>
                    Choose the correct heading for each section and move it into the gap.
                </p>
                {renderBank()}
            </div>
        );
    }

    if (isMatchingInfo) {
        return (
            <div className="drag-drop-group matching-info" style={{ marginBottom: '30px', display: 'flex', gap: '20px' }}>
                <div style={{ flex: 0.5, minWidth: '300px', maxWidth: '350px' }}>
                    {renderQuestions()}
                </div>
                <div style={{ width: '250px' }}>
                    {renderBank()}
                </div>
            </div>
        );
    }

    // Default drag-and-drop
    return (
        <div className="drag-drop-group" style={{ marginBottom: '30px' }}>
            {renderBank()}
            {renderQuestions()}
        </div>
    );
};

export default DragDropGroupQuestion;
