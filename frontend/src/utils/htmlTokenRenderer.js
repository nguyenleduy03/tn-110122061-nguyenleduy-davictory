import React from 'react';

const DEFAULT_TOKEN_REGEX = /\[(blank|\d+)\]/gi;

const flattenNodes = (value) => {
    if (Array.isArray(value)) {
        return value.flatMap((item) => flattenNodes(item));
    }
    return value === null || value === undefined ? [] : [value];
};

const mapDomAttributesToProps = (node, key) => {
    const props = { key };

    Array.from(node.attributes || []).forEach((attr) => {
        const attrName = String(attr.name || '').toLowerCase();
        if (!attrName || attrName === 'style' || attrName === 'contenteditable') return;

        if (attrName === 'class') {
            props.className = attr.value;
            return;
        }

        if (attrName === 'for') {
            props.htmlFor = attr.value;
            return;
        }

        props[attr.name] = attr.value;
    });

    return props;
};

const renderTextNodeWithTokens = (text, keyPrefix, renderToken, tokenRegex) => {
    const rendered = [];
    const rawText = String(text || '');
    let cursor = 0;
    let match;

    tokenRegex.lastIndex = 0;
    while ((match = tokenRegex.exec(rawText)) !== null) {
        const before = rawText.slice(cursor, match.index);
        if (before) rendered.push(before);

        const tokenValue = match[1] || match[0];
        const tokenKey = `${keyPrefix}-token-${match.index}`;
        const tokenNode = renderToken(tokenValue, tokenKey);
        rendered.push(...flattenNodes(tokenNode));

        cursor = tokenRegex.lastIndex;
    }

    const after = rawText.slice(cursor);
    if (after) rendered.push(after);

    return rendered.length ? rendered : rawText;
};

const renderDomNodeWithTokens = (node, keyPrefix, renderToken, tokenRegex) => {
    if (!node) return null;

    if (node.nodeType === 3) {
        return renderTextNodeWithTokens(node.textContent || '', keyPrefix, renderToken, tokenRegex);
    }

    if (node.nodeType !== 1) return null;

    const tagName = String(node.tagName || '').toLowerCase();
    if (!tagName || tagName === 'script' || tagName === 'style') return null;

    const children = Array.from(node.childNodes || []).flatMap((child, idx) => {
        const rendered = renderDomNodeWithTokens(child, `${keyPrefix}-${idx}`, renderToken, tokenRegex);
        return flattenNodes(rendered).filter((entry) => entry !== null && entry !== undefined);
    });

    const props = mapDomAttributesToProps(node, keyPrefix);
    return React.createElement(tagName, props, children.length ? children : undefined);
};

export const renderHtmlWithTokenPlaceholders = (html, renderToken, options = {}) => {
    const normalizeHtml = typeof options.normalizeHtml === 'function' ? options.normalizeHtml : (value) => value;
    const normalized = normalizeHtml(String(html || ''));
    if (!normalized) return null;

    const tokenRegex = options.tokenRegex || DEFAULT_TOKEN_REGEX;
    const keyPrefix = options.keyPrefix || 'html-token';

    if (typeof DOMParser === 'undefined') {
        return React.createElement('span', { dangerouslySetInnerHTML: { __html: normalized } });
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${normalized}</div>`, 'text/html');
        const root = doc.body.firstElementChild;
        if (!root) return null;

        const rendered = Array.from(root.childNodes || []).flatMap((node, idx) => {
            const child = renderDomNodeWithTokens(node, `${keyPrefix}-${idx}`, renderToken, tokenRegex);
            return flattenNodes(child).filter((entry) => entry !== null && entry !== undefined);
        });

        return rendered.length ? rendered : null;
    } catch {
        return React.createElement('span', { dangerouslySetInnerHTML: { __html: normalized } });
    }
};
