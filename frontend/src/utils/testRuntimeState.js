const sanitizeKeyPart = (value) => String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const buildDraftStorageKey = (skill, mode, testId) => {
    const safeSkill = sanitizeKeyPart(skill).toLowerCase();
    const safeMode = sanitizeKeyPart(mode).toLowerCase() || 'practice';
    const safeTestId = sanitizeKeyPart(testId);
    return `ieltsDraft_${safeSkill}_${safeMode}_${safeTestId}`;
};

export const buildTimerPersistKey = ({ skill, testId, mode, isFullTest = false, queryString = '' }) => {
    const safeSkill = sanitizeKeyPart(skill).toLowerCase();
    const safeTestId = sanitizeKeyPart(testId);
    const safeMode = sanitizeKeyPart(mode).toLowerCase() || 'practice';
    const safeQuery = sanitizeKeyPart(queryString).slice(0, 80) || 'default';
    const scope = isFullTest ? 'full_test' : 'single_test';
    return `${safeSkill}_${safeTestId}_${scope}_${safeMode}_${safeQuery}`;
};

export const parseJsonSafe = (raw, fallback = null) => {
    if (!raw || typeof raw !== 'string') return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
};

export const clearDraftByTest = (skill, testId) => {
    if (typeof window === 'undefined') return;
    const prefix = `ieltsDraft_${String(skill || '').toLowerCase()}_`;
    const suffix = `_${String(testId || '').trim()}`;

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith(prefix) && key.endsWith(suffix)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const buildSubmittedLockKey = (persistKey) => {
    const safe = String(persistKey || '').trim();
    return safe ? `ieltsSubmittedLock_${safe}` : null;
};

export const markTestSubmitted = (persistKey, redirectUrl = '/exam-library') => {
    if (typeof window === 'undefined') return;
    const key = buildSubmittedLockKey(persistKey);
    if (!key) return;

    const payload = {
        redirectUrl: String(redirectUrl || '/exam-library'),
        savedAt: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
};

export const getSubmittedRedirect = (persistKey) => {
    if (typeof window === 'undefined') return null;
    const key = buildSubmittedLockKey(persistKey);
    if (!key) return null;
    const parsed = parseJsonSafe(sessionStorage.getItem(key), null);
    if (!parsed || typeof parsed !== 'object') return null;
    return String(parsed.redirectUrl || '/exam-library');
};

export const clearSubmittedLock = (persistKey) => {
    if (typeof window === 'undefined') return;
    const key = buildSubmittedLockKey(persistKey);
    if (!key) return;
    sessionStorage.removeItem(key);
};
