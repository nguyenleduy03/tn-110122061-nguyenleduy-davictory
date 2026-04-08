export const IMAGE_QUESTION_LAYOUTS = {
    MAP_LABELLING: {
        imageMaxHeight: 500,
    },
    IMAGE_NOTE_FORM: {
        imageMaxHeight: 360,
    },
};

export const getLockedImageQuestionLayout = (contentType) => {
    const key = String(contentType || '').trim().toUpperCase();
    return IMAGE_QUESTION_LAYOUTS[key] || { imageMaxHeight: 480 };
};

export const getLockedImageFrameStyle = (contentType) => ({
    position: 'relative',
    display: 'inline-block',
    maxWidth: '100%',
});

export const getLockedImageStyle = (contentType) => {
    const layout = getLockedImageQuestionLayout(contentType);
    return {
        display: 'block',
        width: 'auto',
        height: 'auto',
        maxWidth: '100%',
        maxHeight: `${layout.imageMaxHeight}px`,
    };
};