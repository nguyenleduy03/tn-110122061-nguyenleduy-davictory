import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Wifi, Bell, Menu, Send, ChevronRight, ChevronLeft, X, Contrast, ZoomIn, Check, LogOut, ArrowLeftRight, NotebookPen } from 'lucide-react';
import { authApi } from '../../services/authApi';

const SERIES_LOGO_SRC = {
    IELTS: '/IELTS%20Logo.png',
    Cambridge: '/Cambridge%20Logo.png',
};

const toDisplayValue = (value) => (value == null ? '' : String(value).trim());

const isPlaceholderCandidateId = (value) => {
    const normalized = toDisplayValue(value).toUpperCase().replace(/[_\s]+/g, '-');
    return !normalized || [
        'DEFAULT-ID',
        'DEFAULT',
        'N/A',
        'NA',
        'UNKNOWN',
        'NULL',
        'UNDEFINED',
    ].includes(normalized);
};

const getTokenIdentity = () => {
    if (typeof window === 'undefined') return '';
    const token = window.localStorage.getItem('authToken');
    if (!token) return '';

    try {
        const payloadPart = token.split('.')[1];
        if (!payloadPart || !window.atob) return '';
        const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
        const payload = JSON.parse(window.atob(padded));

        return [
            payload?.candidateId,
            payload?.studentId,
            payload?.userId,
            payload?.id,
            payload?.username,
            payload?.email,
            payload?.sub,
        ]
            .map(toDisplayValue)
            .find((value) => !isPlaceholderCandidateId(value)) || '';
    } catch {
        return '';
    }
};

const TestHeader = ({ candidateName, candidateId, extraInfo, submitTest, isReview, isFullTest, skill, navigate, duration = 0, noTimeLimit = false, onTimeUp, seriesLabel, logoUrl, timerPersistKey, timerPaused = false, isNotesOpen = false, onToggleNotes, hideSubmitButton = false, hideTimer = false, timerOverrideSeconds = null, timerOverrideLabel = 'Time left:', mode = 'practice' }) => {
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [optionsView, setOptionsView] = useState('main');
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isFullscreenLocked, setIsFullscreenLocked] = useState(false);
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
    const resumeFullscreenRef = useRef(false);
    const resumeFallbackTimerRef = useRef(null);
    const fullscreenWarningTimerRef = useRef(null);
    const isExitingTestRef = useRef(false);
    const hasTriggeredTimeUpRef = useRef(false);
    const pauseStartedAtRef = useRef(null);
    const timerStorageKey = useMemo(() => {
        if (!timerPersistKey) return null;
        return `ieltsTimerDeadline_${timerPersistKey}`;
    }, [timerPersistKey]);
    const [timeLeft, setTimeLeft] = useState(() => {
        const safeDuration = Number.isFinite(duration) ? duration : 0;
        return Math.max(0, safeDuration * 60);
    });
    const storedUser = useMemo(() => authApi.getStoredUser(), []);
    const tokenIdentity = useMemo(() => getTokenIdentity(), []);
    const resolvedCandidateId = useMemo(() => {
        return [
            candidateId,
            storedUser?.candidateId,
            storedUser?.userId,
            storedUser?.studentId,
            storedUser?.studentCode,
            storedUser?.candidateCode,
            storedUser?.code,
            storedUser?.id,
            storedUser?.username,
            storedUser?.email,
            tokenIdentity,
        ]
            .map(toDisplayValue)
            .find((value) => !isPlaceholderCandidateId(value)) || 'N/A';
    }, [candidateId, storedUser, tokenIdentity]);

    // State to track current theme/size for radio buttons
    const [currentTheme, setCurrentTheme] = useState('standard');
    const [currentTextSize, setCurrentTextSize] = useState('regular');

    useEffect(() => {
        if (isReview || mode !== 'exam') {
            setIsFullscreenLocked(false);
            return undefined;
        }
        if (typeof document === 'undefined') return undefined;

        const root = document.documentElement;
        const requestFullscreen = async () => {
            try {
                if (!document.fullscreenElement && root?.requestFullscreen) {
                    await root.requestFullscreen();
                }
            } catch {
                // Browsers may block fullscreen without direct user gesture.
            } finally {
                setIsFullscreenLocked(!document.fullscreenElement);
            }
        };

        const handleFullscreenChange = () => {
            if (isExitingTestRef.current) {
                setIsFullscreenLocked(false);
                return;
            }

            const inFullscreen = Boolean(document.fullscreenElement);
            if (inFullscreen) {
                if (resumeFallbackTimerRef.current) {
                    clearTimeout(resumeFallbackTimerRef.current);
                    resumeFallbackTimerRef.current = null;
                }
                if (fullscreenWarningTimerRef.current) {
                    clearTimeout(fullscreenWarningTimerRef.current);
                    fullscreenWarningTimerRef.current = null;
                }
                setShowFullscreenWarning(false);
                resumeFullscreenRef.current = false;
                setIsFullscreenLocked(false);
                return;
            }

            if (resumeFullscreenRef.current) {
                // User is actively returning to fullscreen; keep overlay hidden during transition.
                if (root?.requestFullscreen) {
                    root.requestFullscreen().catch(() => { });
                }
                return;
            }

            setIsFullscreenLocked(true);
            setShowFullscreenWarning(true);
            if (fullscreenWarningTimerRef.current) {
                clearTimeout(fullscreenWarningTimerRef.current);
            }
            fullscreenWarningTimerRef.current = window.setTimeout(() => {
                setShowFullscreenWarning(false);
                fullscreenWarningTimerRef.current = null;
            }, 2200);

            // Try to restore fullscreen right away; if blocked, overlay will require user click.
            if (root?.requestFullscreen) {
                root.requestFullscreen().catch(() => { });
            }
        };

        if (mode === 'exam') {
            requestFullscreen();
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            if (resumeFallbackTimerRef.current) {
                clearTimeout(resumeFallbackTimerRef.current);
                resumeFallbackTimerRef.current = null;
            }
            if (fullscreenWarningTimerRef.current) {
                clearTimeout(fullscreenWarningTimerRef.current);
                fullscreenWarningTimerRef.current = null;
            }
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [isReview, mode]);

    const handleReturnFullscreen = async () => {
        if (typeof document === 'undefined') return;
        if (resumeFallbackTimerRef.current) {
            clearTimeout(resumeFallbackTimerRef.current);
            resumeFallbackTimerRef.current = null;
        }
        resumeFullscreenRef.current = true;
        setIsFullscreenLocked(false);

        // If browser blocks fullscreen, restore overlay after a short grace period.
        resumeFallbackTimerRef.current = window.setTimeout(() => {
            if (!document.fullscreenElement) {
                resumeFullscreenRef.current = false;
                setIsFullscreenLocked(true);
            }
            resumeFallbackTimerRef.current = null;
        }, 500);

        try {
            if (!document.fullscreenElement && document.documentElement?.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            // Restore blocking overlay when fullscreen request is rejected.
            resumeFullscreenRef.current = false;
            if (resumeFallbackTimerRef.current) {
                clearTimeout(resumeFallbackTimerRef.current);
                resumeFallbackTimerRef.current = null;
            }
            setIsFullscreenLocked(true);
        } finally {
            if (!document.fullscreenElement && !resumeFullscreenRef.current) {
                setIsFullscreenLocked(true);
            }
        }
    };

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

    // Timer logic based on absolute deadline to survive reload/network interruptions.
    useEffect(() => {
        hasTriggeredTimeUpRef.current = false;

        if (timerPaused || hideTimer) return; // Wait until timer should start (e.g. pre-check completed)
        if (noTimeLimit || isReview) {
            if (timerStorageKey) {
                localStorage.removeItem(timerStorageKey);
            }
            return;
        }

        const safeDuration = Number.isFinite(duration) ? duration : 0;
        const durationSeconds = Math.max(0, Math.floor(safeDuration * 60));
        if (durationSeconds <= 0) {
            setTimeLeft(0);
            return;
        }

        const now = Date.now();
        let deadlineMs = now + (durationSeconds * 1000);

        if (timerStorageKey) {
            try {
                const storedRaw = localStorage.getItem(timerStorageKey);
                const stored = storedRaw ? JSON.parse(storedRaw) : null;
                if (
                    stored
                    && Number.isFinite(stored.deadlineMs)
                    && Number.isFinite(stored.durationSeconds)
                    && stored.durationSeconds === durationSeconds
                ) {
                    deadlineMs = stored.deadlineMs;
                } else {
                    localStorage.setItem(timerStorageKey, JSON.stringify({
                        deadlineMs,
                        durationSeconds,
                        savedAt: now,
                    }));
                }
            } catch {
                // Ignore malformed timer cache and continue with a fresh deadline.
            }
        }

        setTimeLeft(Math.max(0, Math.ceil((deadlineMs - now) / 1000)));
    }, [duration, noTimeLimit, timerStorageKey, isReview, timerPaused, hideTimer]);

    // Keep absolute-deadline timer accurate when paused/resumed by shifting deadline.
    useEffect(() => {
        if (isReview || noTimeLimit || !timerStorageKey) {
            pauseStartedAtRef.current = null;
            return;
        }

        const isPaused = Boolean(timerPaused || hideTimer);
        if (isPaused) {
            if (!pauseStartedAtRef.current) {
                pauseStartedAtRef.current = Date.now();
            }
            return;
        }

        if (!pauseStartedAtRef.current) return;

        const pausedMs = Math.max(0, Date.now() - pauseStartedAtRef.current);
        pauseStartedAtRef.current = null;
        if (pausedMs <= 0) return;

        try {
            const storedRaw = localStorage.getItem(timerStorageKey);
            const stored = storedRaw ? JSON.parse(storedRaw) : null;
            if (!stored || !Number.isFinite(stored.deadlineMs)) return;

            const nextDeadline = stored.deadlineMs + pausedMs;
            localStorage.setItem(timerStorageKey, JSON.stringify({
                ...stored,
                deadlineMs: nextDeadline,
                savedAt: Date.now(),
            }));

            const remaining = Math.max(0, Math.ceil((nextDeadline - Date.now()) / 1000));
            setTimeLeft(remaining);
        } catch {
            // Ignore malformed timer cache.
        }
    }, [timerPaused, hideTimer, isReview, noTimeLimit, timerStorageKey]);

    useEffect(() => {
        if (timerPaused || hideTimer) return; // Don't tick until timer is started
        if (isReview) return;
        if (noTimeLimit) return;
        const safeDuration = Number.isFinite(duration) ? duration : 0;
        const durationSeconds = Math.max(0, Math.floor(safeDuration * 60));
        if (durationSeconds <= 0) return;

        let deadlineMs = Date.now() + (durationSeconds * 1000);
        if (timerStorageKey) {
            try {
                const storedRaw = localStorage.getItem(timerStorageKey);
                const stored = storedRaw ? JSON.parse(storedRaw) : null;
                if (
                    stored
                    && Number.isFinite(stored.deadlineMs)
                    && Number.isFinite(stored.durationSeconds)
                    && stored.durationSeconds === durationSeconds
                ) {
                    deadlineMs = stored.deadlineMs;
                } else {
                    localStorage.setItem(timerStorageKey, JSON.stringify({
                        deadlineMs,
                        durationSeconds,
                        savedAt: Date.now(),
                    }));
                }
            } catch {
                // Ignore malformed timer cache and continue with local deadline.
            }
        }

        const tick = () => {
            const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
            setTimeLeft(remaining);

            if (remaining <= 0 && !hasTriggeredTimeUpRef.current) {
                hasTriggeredTimeUpRef.current = true;
                if (timerStorageKey) {
                    localStorage.removeItem(timerStorageKey);
                }
                if (onTimeUp) onTimeUp();
            }
        };

        tick();
        const timer = setInterval(tick, 1000);

        return () => clearInterval(timer);
    }, [isReview, noTimeLimit, onTimeUp, duration, timerStorageKey, timerPaused, hideTimer]);

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
        if (timerStorageKey) {
            localStorage.removeItem(timerStorageKey);
        }
        if (submitTest) submitTest();
    };

    const handleExitTest = () => {
        isExitingTestRef.current = true;
        setIsOptionsOpen(false);
        setIsFullscreenLocked(false);
        sessionStorage.setItem('forceExitFullscreen', 'true');

        const attemptExitFullscreen = async () => {
            if (typeof document === 'undefined') return;
            if (!document.fullscreenElement || !document.exitFullscreen) return;

            try {
                await document.exitFullscreen();
            } catch {
                // Ignore and rely on fallback cleanup in destination page.
            }
        };

        const goToLibrary = () => {
            if (navigate) {
                navigate('/exam-library', { replace: true });
            }
        };

        attemptExitFullscreen().finally(goToLibrary);
    };

    const handleSwitchReview = () => {
        if (!isFullTest || !isReview || !navigate) return;
        const targetSkill = skill === 'reading' ? 'listening' : 'reading';
        navigate(`/test/${targetSkill}/1?fullTest=true&mode=practice&review=true`);
    };

    const checkColor = currentTheme === 'yellow-black' ? '#e5ff00' : currentTheme === 'white-black' ? '#fff' : 'black';
    const resolvedLogoSrc = useMemo(() => logoUrl || SERIES_LOGO_SRC[seriesLabel] || SERIES_LOGO_SRC.IELTS, [logoUrl, seriesLabel]);
    const resolvedLogoAlt = seriesLabel || 'IELTS';
    const hasTimerOverride = Number.isFinite(timerOverrideSeconds);
    const resolvedTimerSeconds = hasTimerOverride
        ? Math.max(0, Math.floor(timerOverrideSeconds))
        : timeLeft;

    return (
        <>
            <header className="ielts-header">
                <div className="header-left">
                    <div className="ielts-logo">
                        <img src={resolvedLogoSrc} alt={resolvedLogoAlt} className="ielts-logo-image" />
                    </div>
                    <div className="candidate-info">
                        <span>{resolvedCandidateId}</span>
                        {extraInfo && (
                            <div className="extra-header-info" style={{ color: '#333', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                {extraInfo}
                            </div>
                        )}
                    </div>
                </div>

                {!isReview && !hideTimer && (hasTimerOverride || !noTimeLimit) && (
                    <div className={`header-timer ${resolvedTimerSeconds < 300 ? 'timer-low' : ''}`}>
                        <span className="timer-label">{timerOverrideLabel}</span>
                        <span className="timer-value">{formatTime(resolvedTimerSeconds)}</span>
                    </div>
                )}

                {!isReview && noTimeLimit && !hideTimer && !hasTimerOverride && (
                    <div className="header-timer">
                        <span className="timer-label">Time:</span>
                        <span className="timer-value">No limit</span>
                    </div>
                )}

                <div className="header-right">
                    {submitTest && !isReview && !hideSubmitButton && (
                        <button
                            className="header-submit-btn"
                            onClick={handleSubmitClick}
                            title={"Submit this section"}
                        >
                            <Send size={14} />
                            <span>{"Submit test"}</span>
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
                    {!isReview && (
                        <button
                            className={`icon-btn${isNotesOpen ? ' icon-btn--active' : ''}`}
                            title="Notes"
                            onClick={onToggleNotes}
                        >
                            <NotebookPen size={22} />
                        </button>
                    )}
                    <button
                        className="icon-btn"
                        title="Options"
                        onClick={() => {
                            if (isNotesOpen && typeof onToggleNotes === 'function') {
                                onToggleNotes();
                            }
                            setIsOptionsOpen(true);
                            setOptionsView('main');
                        }}
                    >
                        <Menu size={26} />
                    </button>
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
                                    <button className="go-submission-btn" onClick={handleExitTest}>
                                        <div className="go-submission-left">
                                            <LogOut size={20} />
                                            <span>Exit</span>
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

            {!isReview && isFullscreenLocked && createPortal(
                <div className="fullscreen-lock-overlay">
                    <div className="fullscreen-lock-card">
                        <h3 className="fullscreen-lock-title">Fullscreen is required</h3>
                        <p className="fullscreen-lock-text">
                            Bài thi đang khóa ở chế độ toàn màn hình. Vui lòng quay lại fullscreen để tiếp tục làm bài.
                        </p>
                        <button
                            onClick={handleReturnFullscreen}
                            className="fullscreen-lock-btn"
                        >
                            Quay lại toàn màn hình
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {!isReview && showFullscreenWarning && createPortal(
                <div className="fullscreen-warning-toast" role="status" aria-live="polite">
                    Bạn vừa thoát fullscreen. Bài thi yêu cầu chế độ toàn màn hình.
                </div>,
                document.body
            )}
        </>
    );
};

export default TestHeader;
