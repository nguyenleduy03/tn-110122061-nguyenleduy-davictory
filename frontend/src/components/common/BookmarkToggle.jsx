import React from 'react';
import { Bookmark } from 'lucide-react';

const BookmarkToggle = ({
    active = false,
    size = 16,
    onToggle,
    className = '',
    activeColor = '#1a73e8',
    inactiveColor = '#ccc',
    stopPropagation = true,
    strokeWidth,
    style,
    title = 'Toggle bookmark',
}) => {
    const mergedClassName = ['bookmark-toggle', className].filter(Boolean).join(' ');

    const handleClick = (event) => {
        if (stopPropagation) {
            event.stopPropagation();
        }
        onToggle?.(event);
    };

    return (
        <span
            className={mergedClassName}
            onClick={onToggle ? handleClick : undefined}
            style={style}
            role={onToggle ? 'button' : undefined}
            aria-label={onToggle ? title : undefined}
            title={onToggle ? title : undefined}
        >
            <Bookmark
                size={size}
                fill={active ? activeColor : 'none'}
                color={active ? activeColor : inactiveColor}
                strokeWidth={strokeWidth}
            />
        </span>
    );
};

export default BookmarkToggle;
