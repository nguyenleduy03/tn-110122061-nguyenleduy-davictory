const decodeBasicHtmlEntities = (value) => String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

const normalizeLabel = (value) => {
    const plain = decodeBasicHtmlEntities(value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!plain) return '';

    return plain
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const isGroupLabel = (value) => /^(group|nhom)\s*(\d+|[ivxlcdm]+)$/i.test(value);

const isQuestionTypeLabel = (value) => {
    if (!value) return false;

    const exactTypes = new Set([
        'mcq',
        'match headings',
        'multiple choice',
        'drag matching',
        'note completion',
        'notes completion',
        'note form',
        'image + note form',
        'image note form',
        'summary completion',
        'sentence completion',
        'form completion',
        'table completion',
        'map labelling',
        'flow chart completion',
        'diagram completion',
        'map completion',
        'writing task',
        'custom',
        'matching heading',
        'matching headings',
        'matching info',
        'matching information',
        'matching feature',
        'matching features',
        'true false not given',
        'yes no not given',
        'short answer',
        'short answer question',
        'short answer questions',
        'list of headings',
        'list of options',
        'drag and drop',
        'image drag drop',
        'flow chart',
        'matching heading question',
        'ban do',
        'so do',
    ]);

    if (exactTypes.has(value)) return true;

    const withoutIndex = value.replace(/\s*\d+\s*$/, '').trim();
    const withoutBracketSuffix = withoutIndex.replace(/\s*\([^)]*\)\s*$/, '').trim();

    if (exactTypes.has(withoutIndex) || exactTypes.has(withoutBracketSuffix)) return true;

    return /^(notes?|summary|sentence|form|table|diagram|map|flow chart)\s+completion\s*\d*$/.test(value)
        || /^matching\s+(heading|headings|info|information|feature|features)\s*\d*$/.test(value)
        || /^true\s*false\s*not\s*given\s*\d*$/.test(value)
        || /^yes\s*no\s*not\s*given\s*\d*$/.test(value)
        || /^(match headings|drag matching|map labelling)\s*\d*$/.test(value)
        || /^multiple choice(?:\s*\([^)]*\))?\s*\d*$/.test(value)
        || /^(?:image\s*\+\s*)?note form\s*\d*$/.test(value)
        || /^(ban do|so do)\s*\d*$/.test(value)
        || /^writing task\s*\d*$/.test(value)
        || /^custom\s*\d*$/.test(value)
        || /^part\s*\d+\s*(?:-\s*(?:interview|cue card|discussion))?$/.test(value)
        || /^(notes?|summary|table|matching|flow chart|multiple choice)\s+question\s*\d*$/.test(value)
        || /^(notes?|summary|table|matching|flow chart|multiple choice)\s+questions\s*\d+\s*(?:-|–)\s*\d+$/.test(value);
};

export const isQuestionMetaLabel = (value) => {
    const normalized = normalizeLabel(value);
    if (!normalized) return false;
    return isGroupLabel(normalized) || isQuestionTypeLabel(normalized);
};
