import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wifi, Bell, Menu, Send, ChevronRight, ChevronLeft, X, Contrast, ZoomIn, Check, LogOut, ArrowLeftRight } from 'lucide-react';

const TestHeader = ({ candidateName, candidateId, extraInfo, submitTest, isReview, isFullTest, skill, navigate, duration = 60, onTimeUp }) => {
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [optionsView, setOptionsView] = useState('main'); // 'main', 'contrast', 'text-size'
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(duration * 60);

    // State to track current theme/size for radio buttons
    const [currentTheme, setCurrentTheme] = useState('standard');
    const [currentTextSize, setCurrentTextSize] = useState('regular');

    // Sync <html> element classes for zoom overflow control
    const syncHtmlClasses = () => {
        const html = document.documentElement;
        const body = document.body;
        if (body.classList.contains('text-size-large') || body.classList.contains('text-size-xlarge')) {
            html.classList.add('text-size-zoomed');
        } else {
            html.classList.remove('text-size-zoomed');
        }
        html.classList.remove('theme-white-black-html', 'theme-yellow-black-html');
        if (body.classList.contains('theme-white-black')) html.classList.add('theme-white-black-html');
        if (body.classList.contains('theme-yellow-black')) html.classList.add('theme-yellow-black-html');
    };

    useEffect(() => {
        const savedTheme = sessionStorage.getItem('ielts-theme');
        const savedSize = sessionStorage.getItem('ielts-text-size');
        if (savedTheme && savedTheme !== 'standard') {
            document.body.classList.remove('theme-yellow-black', 'theme-white-black');
            document.body.classList.add(`theme-${savedTheme}`);
            setCurrentTheme(savedTheme);
        }
        if (savedSize && savedSize !== 'regular') {
            document.body.classList.remove('text-size-large', 'text-size-xlarge');
            if (savedSize === 'large') document.body.classList.add('text-size-large');
            if (savedSize === 'extra-large') document.body.classList.add('text-size-xlarge');
            setCurrentTextSize(savedSize);
        }
        syncHtmlClasses();
    }, []);

    useEffect(() => {
        if (document.body.classList.contains('theme-yellow-black')) {
            setCurrentTheme('yellow-black');
        } else if (document.body.classList.contains('theme-white-black')) {
            setCurrentTheme('white-black');
        } else {
            setCurrentTheme('standard');
        }

        if (document.body.classList.contains('text-size-xlarge')) {
            setCurrentTextSize('extra-large');
        } else if (document.body.classList.contains('text-size-large')) {
            setCurrentTextSize('large');
        } else {
            setCurrentTextSize('regular');
        }
    }, [isOptionsOpen, optionsView]);

    // Timer logic
    useEffect(() => {
        if (isReview) return;
        if (timeLeft <= 0) {
            if (onTimeUp) onTimeUp();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isReview, onTimeUp]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleThemeChange = (theme) => {
        document.body.classList.remove('theme-yellow-black', 'theme-white-black');
        if (theme === 'yellow-black') {
            document.body.classList.add('theme-yellow-black');
        } else if (theme === 'white-black') {
            document.body.classList.add('theme-white-black');
        }
        setCurrentTheme(theme);
        sessionStorage.setItem('ielts-theme', theme);
        syncHtmlClasses();
    };

    const handleTextSizeChange = (size) => {
        document.body.classList.remove('text-size-large', 'text-size-xlarge');
        if (size === 'large') {
            document.body.classList.add('text-size-large');
        } else if (size === 'extra-large') {
            document.body.classList.add('text-size-xlarge');
        }
        setCurrentTextSize(size);
        sessionStorage.setItem('ielts-text-size', size);
        syncHtmlClasses();
    };

    const handleSubmitClick = () => {
        setIsOptionsOpen(false);
        if (isReview) {
            if (submitTest) submitTest(); // Exit review immediately
        } else {
            setShowSubmitModal(true);
        }
    };

    const handleConfirmSubmit = () => {
        setShowSubmitModal(false);
        if (submitTest) submitTest();
    };

    const handleSwitchReview = () => {
        if (!isFullTest || !isReview || !navigate) return;
        const targetSkill = skill === 'reading' ? 'listening' : 'reading';
        navigate(`/test/${targetSkill}/1?fullTest=true&mode=practice&review=true`);
    };

    const checkColor = currentTheme === 'yellow-black' ? '#e5ff00' : currentTheme === 'white-black' ? '#fff' : 'black';

    return (
        <>
            <header className="ielts-header">
                <div className="header-left">
                    <div className="ielts-logo">IELTS</div>
                    <div className="candidate-info">
                        <span>{candidateId}</span>
                        {extraInfo && (
                            <div className="extra-header-info" style={{ color: '#333', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                {extraInfo}
                            </div>
                        )}
                    </div>
                </div>

                {!isReview && (
                    <div className={`header-timer ${timeLeft < 300 ? 'timer-low' : ''}`}>
                        <span className="timer-label">Time left:</span>
                        <span className="timer-value">{formatTime(timeLeft)}</span>
                    </div>
                )}

                <div className="header-right">
                    {submitTest && !isReview && (
                        <button
                            className="header-submit-btn"
                            onClick={handleSubmitClick}
                            title={"Submit this section"}
                        >
                            <Send size={14} />
                            <span>{"Submit test"}</span>
                            <ChevronRight size={14} />
                        </button>
                    )}
                    {isReview && isFullTest && navigate && (
                        <button
                            className="header-submit-btn"
                            style={{ backgroundColor: '#1a73e8', color: 'white' }}
                            onClick={handleSwitchReview}
                            title={`Switch to ${skill === 'reading' ? 'Listening' : 'Reading'} review`}
                        >
                            <ArrowLeftRight size={14} />
                            <span>{`Review ${skill === 'reading' ? 'Listening' : 'Reading'}`}</span>
                            <ChevronRight size={14} />
                        </button>
                    )}
                    <button className="icon-btn" title="Network status"><Wifi size={22} /></button>
                    <button className="icon-btn" title="Messages"><Bell size={22} /></button>
                    <button className="icon-btn" title="Options" onClick={() => { setIsOptionsOpen(true); setOptionsView('main'); }}><Menu size={26} /></button>
                </div>
            </header>

            {/* ── Submit confirmation modal ── */}
            {showSubmitModal && createPortal(
                <div className="submit-modal-overlay" onClick={() => setShowSubmitModal(false)}>
                    <div className="submit-modal" onClick={e => e.stopPropagation()}>
                        <div className="submit-modal-header">
                            <Send size={20} />
                            <h2>Submit this section</h2>
                        </div>
                        <div className="submit-modal-body">
                            <p>Are you sure you want to submit this section?</p>
                            <p>Once submitted, you will not be able to return and change your answers.</p>
                        </div>
                        <div className="submit-modal-actions">
                            <button className="submit-modal-cancel" onClick={() => setShowSubmitModal(false)}>
                                Cancel
                            </button>
                            <button className="submit-modal-confirm" onClick={handleConfirmSubmit}>
                                <Send size={15} />
                                Submit
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Options panel ── */}
            {isOptionsOpen && createPortal(
                <div className="options-fs-overlay">
                    <div className="options-fs-header">
                        {optionsView === 'main' ? (
                            <div style={{ width: 80 }}></div>
                        ) : (
                            <button className="options-fs-back" onClick={() => setOptionsView('main')}>
                                <ChevronLeft size={24} strokeWidth={3} />
                                <span>Options</span>
                            </button>
                        )}
                        <h2 className="options-fs-title">
                            {optionsView === 'main' && 'Options'}
                            {optionsView === 'contrast' && 'Contrast'}
                            {optionsView === 'text-size' && 'Text size'}
                        </h2>
                        <button className="options-fs-close" onClick={() => setIsOptionsOpen(false)}>
                            <X size={28} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="options-fs-content">
                        {optionsView === 'main' && (
                            <div className="options-fs-card">
                                {submitTest && !isReview && (
                                    <button className="go-submission-btn" onClick={handleSubmitClick}>
                                        <div className="go-submission-left">
                                            <Send size={20} />
                                            <span>Submit test</span>
                                        </div>
                                        <ChevronRight size={20} />
                                    </button>
                                )}
                                <div className="options-list-box">
                                    <div className="option-list-item" onClick={() => setOptionsView('contrast')}>
                                        <div className="option-list-left">
                                            <div className="option-icon-wrap"><Contrast size={22} fill="currentColor" opacity="0.3" /></div>
                                            <span>Contrast</span>
                                        </div>
                                        <ChevronRight className="option-arrow" size={20} />
                                    </div>
                                    <div className="option-list-item" onClick={() => setOptionsView('text-size')}>
                                        <div className="option-list-left">
                                            <div className="option-icon-wrap"><ZoomIn size={22} /></div>
                                            <span>Text size</span>
                                        </div>
                                        <ChevronRight className="option-arrow" size={20} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {optionsView === 'contrast' && (
                            <div className="options-fs-card">
                                <div className="options-list-box">
                                    {[
                                        { value: 'standard', label: 'Black on white' },
                                        { value: 'white-black', label: 'White on black' },
                                        { value: 'yellow-black', label: 'Yellow on black' },
                                    ].map(({ value, label }) => (
                                        <div key={value} className="option-list-item" onClick={() => handleThemeChange(value)}>
                                            <div className="option-list-left radio-left">
                                                <div className="radio-icon">
                                                    {currentTheme === value && <Check size={20} strokeWidth={3} color={checkColor} />}
                                                </div>
                                                <span>{label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {optionsView === 'text-size' && (
                            <div className="options-fs-card">
                                <div className="options-list-box">
                                    {[
                                        { value: 'regular', label: 'Regular' },
                                        { value: 'large', label: 'Large' },
                                        { value: 'extra-large', label: 'Extra large' },
                                    ].map(({ value, label }) => (
                                        <div key={value} className="option-list-item" onClick={() => handleTextSizeChange(value)}>
                                            <div className="option-list-left radio-left">
                                                <div className="radio-icon">
                                                    {currentTextSize === value && <Check size={20} strokeWidth={3} color={checkColor} />}
                                                </div>
                                                <span>{label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default TestHeader;
