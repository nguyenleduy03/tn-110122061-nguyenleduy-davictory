import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Eye } from 'lucide-react';
import '../styles/ieltsTest.css';

const TestComplete = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'practice';
    const skill = searchParams.get('skill') || '';
    const isExam = mode === 'exam';
    const isFullTest = searchParams.get('fullTest') === 'true';

    const skillLabel = {
        listening: 'Listening',
        reading: 'Reading',
        writing: 'Writing',
        speaking: 'Speaking',
    }[skill?.toLowerCase()] || 'Test';

    const handleReview = (reviewSkill) => {
        // Assume testId is 107 for mock, in real app needs to be passed
        navigate(`/test/${reviewSkill}/107?mode=practice&review=true`);
    };

    return (
        <div className="test-complete-screen">
            <div className="test-complete-card">
                <div className="test-complete-header">
                    <div className="test-complete-icon">
                        <CheckCircle size={52} color="#fff" strokeWidth={1.5} />
                    </div>
                    <h1 className="test-complete-title">Section Submitted</h1>
                    {skill && <p className="test-complete-skill">{skillLabel} section</p>}
                </div>

                <div className="test-complete-body">
                    {isExam ? (
                        <>
                            <p className="test-complete-msg">
                                Your answers have been submitted successfully.
                            </p>
                            <p className="test-complete-sub">
                                In exam mode, answers are not shown after submission. Your results will be available after review.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="test-complete-msg">
                                Your answers have been saved successfully.
                            </p>
                            <p className="test-complete-sub">
                                In practice mode you can review your answers and see the correct answers at any time.
                            </p>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexDirection: 'column' }}>
                                {/* Hiện nút review cho kỹ năng vừa làm. Nếu full test thì hiện list nút tùy logic, ở đây tạm hỗ trợ xem lại cái vừa làm */}
                                {isFullTest ? (
                                    <>
                                        <button 
                                            className="test-complete-btn" 
                                            onClick={() => navigate('/test/reading/107?fullTest=true&mode=practice&review=true')}
                                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                        >
                                            <Eye size={16} /> Review Reading
                                        </button>
                                        <button 
                                            className="test-complete-btn" 
                                            onClick={() => navigate('/test/listening/107?fullTest=true&mode=practice&review=true')}
                                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                        >
                                            <Eye size={16} /> Review Listening
                                        </button>
                                    </>
                                ) : (
                                    (skill.toLowerCase() === 'reading' || skill.toLowerCase() === 'listening') && (
                                        <button 
                                            className="test-complete-btn" 
                                            onClick={() => handleReview(skill.toLowerCase())}
                                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                        >
                                            <Eye size={16} /> Review {skillLabel}
                                        </button>
                                    )
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="test-complete-actions">
                    <button
                        className="test-complete-btn"
                        onClick={() => navigate('/exam-library')}
                        style={{ backgroundColor: '#f1f1f1', color: '#333', border: '1px solid #ccc' }}
                    >
                        Return to Exam Library
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestComplete;
