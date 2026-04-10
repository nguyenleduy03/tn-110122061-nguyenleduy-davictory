export const IMAGE_QUESTION_LAYOUTS = {
    MAP_LABELLING: {
        defaultImageWidth: 100,
    },
    IMAGE_NOTE_FORM: {
        defaultImageWidth: 70,
    },
};

export const resolveImageWidthPercent = (value, fallback = 100) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace('%', '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

export const clampImagePinPercent = (value, rectSizePx, pinSizePx = 0) => {
    const numericValue = typeof value === 'number' && Number.isFinite(value)
        ? value
        : Number.parseFloat(String(value || '').replace('%', '').trim());

    if (!Number.isFinite(numericValue)) return 50;
    if (!Number.isFinite(rectSizePx) || rectSizePx <= 0) {
        return Math.max(0, Math.min(100, numericValue));
    }

    const pinPercent = (Math.max(0, pinSizePx) / rectSizePx) * 100;
    const halfPinPercent = (Math.max(0, pinSizePx) / 2 / rectSizePx) * 100;
    if (pinPercent >= 100) return 50;

    const minPercent = Math.max(0, halfPinPercent);
    const maxPercent = Math.max(minPercent, 100 - halfPinPercent);

    return Math.max(minPercent, Math.min(maxPercent, numericValue));
};

export const resolveResponsivePinBoxWidth = (imageWidthPercent, fallback = 120) => {
    const resolvedWidthPercent = resolveImageWidthPercent(imageWidthPercent, 100);
    if (!Number.isFinite(resolvedWidthPercent) || resolvedWidthPercent <= 0) return fallback;

    const minWidth = 50;
    const scaledWidth = Math.round(minWidth + ((resolvedWidthPercent / 100) * (fallback - minWidth)));
    return Math.max(minWidth, Math.min(fallback, scaledWidth));
};

export const getLockedImageQuestionLayout = (contentType) => {
    const key = String(contentType || '').trim().toUpperCase();
    return IMAGE_QUESTION_LAYOUTS[key] || { defaultImageWidth: 100 };
};

export const getLockedImageFrameStyle = (contentType, imageWidthPercent) => {
    const layout = getLockedImageQuestionLayout(contentType);
    const resolvedWidth = resolveImageWidthPercent(imageWidthPercent, layout.defaultImageWidth ?? 100);

    return {
        position: 'relative',
        display: 'block',
        width: `${resolvedWidth}%`,
        maxWidth: '100%',
        minWidth: 0,
        margin: '0 auto',
        lineHeight: 0,
    };
};

export const getLockedImageStyle = (contentType) => {
    return {
        display: 'block',
        width: '100%',
        height: 'auto',
        maxWidth: '100%',
        maxHeight: 'none',
        verticalAlign: 'top',
    };
};