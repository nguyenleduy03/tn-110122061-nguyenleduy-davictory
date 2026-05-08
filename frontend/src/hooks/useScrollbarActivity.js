import { useEffect } from 'react';

const SCROLLABLE_PANE_SELECTOR = '.passage-section, .questions-section, .writing-task-pane';
const ACTIVE_SCROLL_CLASS = 'is-scrolling';
const INACTIVITY_TIMEOUT_MS = 180;

const resolveScrollablePane = (target) => {
    if (!(target instanceof Element)) return null;
    if (target.matches(SCROLLABLE_PANE_SELECTOR)) return target;
    return target.closest(SCROLLABLE_PANE_SELECTOR);
};

export const useScrollbarActivity = () => {
    useEffect(() => {
        if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;

        const timers = new Map();

        const markScrolling = (pane) => {
            if (!pane) return;

            pane.classList.add(ACTIVE_SCROLL_CLASS);

            const existingTimer = timers.get(pane);
            if (existingTimer) {
                window.clearTimeout(existingTimer);
            }

            const timeoutId = window.setTimeout(() => {
                pane.classList.remove(ACTIVE_SCROLL_CLASS);
                timers.delete(pane);
            }, INACTIVITY_TIMEOUT_MS);

            timers.set(pane, timeoutId);
        };

        const handleScroll = (event) => {
            markScrolling(resolveScrollablePane(event.target));
        };

        const handleWheel = (event) => {
            markScrolling(resolveScrollablePane(event.target));
        };

        const handleMouseDown = (event) => {
            if (event.button !== 0) return;
            markScrolling(resolveScrollablePane(event.target));
        };

        const handleKeyDown = (event) => {
            const key = String(event.key || '');
            if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(key)) return;

            const activePane = resolveScrollablePane(document.activeElement);
            markScrolling(activePane);
        };

        document.addEventListener('scroll', handleScroll, true);
        document.addEventListener('wheel', handleWheel, { passive: true, capture: true });
        document.addEventListener('mousedown', handleMouseDown, true);
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('wheel', handleWheel, true);
            document.removeEventListener('mousedown', handleMouseDown, true);
            document.removeEventListener('keydown', handleKeyDown, true);

            timers.forEach((timeoutId, pane) => {
                window.clearTimeout(timeoutId);
                pane.classList.remove(ACTIVE_SCROLL_CLASS);
            });
            timers.clear();
        };
    }, []);
};
