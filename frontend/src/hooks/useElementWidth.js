import React from 'react';

export const useElementWidth = (elementRef, dependencies = []) => {
    const [width, setWidth] = React.useState(0);

    React.useLayoutEffect(() => {
        const element = elementRef?.current;
        if (!element || typeof window === 'undefined') {
            setWidth(0);
            return undefined;
        }

        const updateWidth = () => {
            const nextWidth = element.getBoundingClientRect?.().width || 0;
            setWidth(nextWidth);
        };

        updateWidth();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }

        const observer = new ResizeObserver(updateWidth);
        observer.observe(element);
        return () => observer.disconnect();
    }, [elementRef, ...dependencies]);

    return width;
};
