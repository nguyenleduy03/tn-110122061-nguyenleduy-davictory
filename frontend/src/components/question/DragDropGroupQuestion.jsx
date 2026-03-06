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
        if (option) {
            handleAnswerChange(subQId, option);
        }
    };

    const handleClear = (subQId) => {
        handleAnswerChange(subQId, '');
    };

    const isMatchingHeading = q.type === 'matching_heading';
    const isMatchingInfo = q.type === 'matching_info';

    // Gather all currently used options to highlight or disable them
    const usedOptions = (q.subQuestions || []).map(subQ => answers[subQ.id]).filter(Boolean);

    const renderBank = () => (
        <div className="bank-section" style={{
            display: 'flex', flexDirection: isMatchingHeading ? 'column' : 'row', flexWrap: 'wrap', gap: '10px', 
            padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', 
            border: '1px solid #e1e4e8', marginBottom: '20px'
        }}>
            {isMatchingHeading && <h4 style={{margin: '0 0 10px 0'}}>List of Headings</h4>}
            {isMatchingInfo && <h4 style={{margin: '0 0 10px 0', width: '100%', fontSize: '15px'}}>{q.rightHeader || 'Options'}</h4>}
            <div style={{ display: 'flex', flexDirection: isMatchingHeading ? 'column' : 'column', gap: '8px', width: '100%' }}>
                {q.bankOptions.map((opt, idx) => {
                    const isUsed = usedOptions.includes(opt);
                    return (
                        <div
                            key={idx}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, opt)}
                            className={`bank-option ${isUsed ? 'used' : ''}`} style={{ width: isMatchingHeading || isMatchingInfo ? 'fit-content' : 'auto', minWidth: '150px' }}
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
            {isMatchingInfo && <h4 style={{margin: '0 0 20px 0', fontSize: '15px'}}>{q.leftHeader || 'Questions'}</h4>}
            {(q.subQuestions || []).map((subQ) => {
                const isActive = activeQuestion === subQ.number;
                const answer = answers[subQ.id];

                return (
                    <div
                        key={subQ.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            marginBottom: '15px',
                            padding: '10px',
                            border: 'none',
                            backgroundColor: isActive ? '#f9f9f9' : 'transparent',
                            borderRadius: '6px'
                        }}
                        onClick={() => setActiveQuestion?.(subQ.number)}
                    >
                        {isMatchingInfo ? (
                            <span style={{ flex: 1 }}>{subQ.text}</span>
                        ) : null}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {!isMatchingInfo && <span style={{ fontWeight: '500', width: '25px' }}>{subQ.number}</span>}
                            {!isMatchingInfo && <span style={{ flex: 1 }}>{subQ.text}</span>}
                            
                            {isMatchingInfo && (
                                <div style={{
                                    
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: '#333',
                                    fontSize: '15px'

                                }}>{subQ.number}</div>
                            )}
                            <div
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, subQ.id)}
                                style={{
                                    minWidth: '150px',
                                    height: '40px',
                                    border: '2px dashed #bbb',
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
                                        <span>{answer}</span>
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
                                    <span style={{ color: '#aaa', fontSize: '14px' }}>Drop here</span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    if (isMatchingHeading) {
        return (
            <div className="drag-drop-group matching-heading" style={{ marginBottom: '30px' }}>
                <p style={{ marginBottom: '15px', color: '#555' }}>
                    Choose the correct heading for each section and move it into the gap.
                </p>
                {renderBank()}
            </div>
        );
    }

    if (isMatchingInfo) {
        return (
            <div className="drag-drop-group matching-info" style={{ marginBottom: '30px', display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
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
