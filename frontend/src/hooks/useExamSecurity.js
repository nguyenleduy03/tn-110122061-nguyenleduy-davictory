import { useState, useEffect, useRef, useCallback } from 'react';

const AWAY_TIMEOUT_SECONDS = 5;

export function useExamSecurity({ mode, isReview, submitTest }) {
    const [awayCountdown, setAwayCountdown] = useState(null);
    const awayTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);
    const countdownRef = useRef(null);
    const awayStartRef = useRef(null);

    const clearAway = useCallback(() => {
        if (awayTimerRef.current) {
            clearTimeout(awayTimerRef.current);
            awayTimerRef.current = null;
        }
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        awayStartRef.current = null;
        countdownRef.current = null;
        document.documentElement.classList.remove('exam-away');
        setAwayCountdown(null);
    }, []);

    const startAway = useCallback(() => {
        if (awayTimerRef.current) return;

        awayStartRef.current = Date.now();
        countdownRef.current = AWAY_TIMEOUT_SECONDS;
        setAwayCountdown(AWAY_TIMEOUT_SECONDS);
        document.documentElement.classList.add('exam-away');

        countdownTimerRef.current = setInterval(() => {
            countdownRef.current -= 1;
            setAwayCountdown(countdownRef.current);
            if (countdownRef.current <= 0) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
            }
        }, 1000);

        awayTimerRef.current = setTimeout(() => {
            awayTimerRef.current = null;
            countdownTimerRef.current = null;
            countdownRef.current = null;
            document.documentElement.classList.remove('exam-away');
            setAwayCountdown(null);
            if (submitTest) submitTest();
        }, AWAY_TIMEOUT_SECONDS * 1000);
    }, [submitTest]);

    useEffect(() => {
        if (mode !== 'exam' || isReview) return;

        const handleContextMenu = (e) => e.preventDefault();
        const handleCopy = (e) => e.preventDefault();
        const handleCut = (e) => e.preventDefault();
        const handlePaste = (e) => e.preventDefault();

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('cut', handleCut);
        document.addEventListener('paste', handlePaste);

        const handleVisibility = () => {
            if (document.hidden) startAway();
            else clearAway();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        const handleBlur = () => startAway();
        const handleFocus = () => clearAway();
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        const handleMouseLeave = (e) => {
            if (e.clientY <= 0 || e.clientX <= 0 ||
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                startAway();
            }
        };
        const handleMouseEnter = () => clearAway();
        document.documentElement.addEventListener('mouseleave', handleMouseLeave);
        document.documentElement.addEventListener('mouseenter', handleMouseEnter);

        return () => {
            clearAway();
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
            document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
            document.documentElement.classList.remove('exam-away');
        };
    }, [mode, isReview, startAway, clearAway]);

    useEffect(() => {
        if (isReview || !submitTest) return;
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isReview, submitTest]);

    return { awayCountdown, clearAway };
}
