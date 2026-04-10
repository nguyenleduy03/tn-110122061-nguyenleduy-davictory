let cachedCanvasContext = null;
let cachedMeasureFont = null;

const getCanvasContext = () => {
    if (cachedCanvasContext) return cachedCanvasContext;
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    cachedCanvasContext = canvas.getContext('2d');
    return cachedCanvasContext;
};

const getMeasureFont = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return null;
    }

    const probeInput = document.querySelector('.inline-input');
    if (!probeInput && cachedMeasureFont) return cachedMeasureFont;

    const target = probeInput || document.body;
    if (!target) return cachedMeasureFont;

    const computed = window.getComputedStyle(target);
    const fontShorthand = String(computed?.font || '').trim();

    if (fontShorthand) {
        cachedMeasureFont = fontShorthand;
        return cachedMeasureFont;
    }

    const fontStyle = String(computed?.fontStyle || 'normal').trim();
    const fontVariant = String(computed?.fontVariant || 'normal').trim();
    const fontWeight = String(computed?.fontWeight || '400').trim();
    const fontSize = String(computed?.fontSize || '15px').trim();
    const lineHeight = String(computed?.lineHeight || 'normal').trim();
    const fontFamily = String(computed?.fontFamily || 'sans-serif').trim();

    cachedMeasureFont = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;
    return cachedMeasureFont;
};

const resolveAdaptiveInputWidth = (value, options = {}) => {
    const {
        baseWidth = 'var(--answer-input-width)',
        maxPx = 300,
        minChars = 8,
        extraChars = 0.5,
        useTextMeasure = true,
        textPaddingPx = 16,
        measureFont,
    } = options;

    const rawValue = String(value ?? '');
    if (!rawValue.length) {
        return {
            width: baseWidth,
            minWidth: baseWidth,
            maxWidth: baseWidth,
        };
    }

    if (useTextMeasure) {
        const context = getCanvasContext();

        if (context) {
            const resolvedMeasureFont = measureFont || getMeasureFont();
            if (resolvedMeasureFont) {
                context.font = resolvedMeasureFont;
            }
            const measuredTextWidth = context.measureText(rawValue).width;
            const targetWidthPx = Math.ceil(measuredTextWidth + textPaddingPx);

            return {
                width: `clamp(${baseWidth}, ${targetWidthPx}px, ${maxPx}px)`,
                minWidth: baseWidth,
                maxWidth: `${maxPx}px`,
            };
        }
    }

    const charWidth = Math.max(minChars, rawValue.length + extraChars);
    return {
        width: `clamp(${baseWidth}, ${charWidth}ch, ${maxPx}px)`,
        minWidth: baseWidth,
        maxWidth: `${maxPx}px`,
    };
};

export const getAdaptiveInputWidthStyle = (value, options = {}) => {
    return resolveAdaptiveInputWidth(value, options);
};

export const getAdaptiveInputCssVars = (value, options = {}) => {
    const adaptiveWidth = resolveAdaptiveInputWidth(value, options);

    return {
        '--adaptive-input-width': adaptiveWidth.width,
        '--adaptive-input-min-width': adaptiveWidth.minWidth,
        '--adaptive-input-max-width': adaptiveWidth.maxWidth,
    };
};
