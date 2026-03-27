import { useState, useCallback, useEffect } from 'react';

const buildNotesKey = (skill, testId) => {
    const safeSkill = String(skill || '').toLowerCase().trim();
    const safeId = String(testId || '').trim();
    return safeSkill && safeId ? `ieltsNotes_${safeSkill}_${safeId}` : null;
};

export const useNotes = (skill, testId) => {
    const storageKey = buildNotesKey(skill, testId);

    const [notes, setNotes] = useState(() => {
        if (!storageKey || typeof window === 'undefined') return [];
        try {
            const raw = sessionStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    // Persist to sessionStorage whenever notes change
    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') return;
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(notes));
        } catch {
            // ignore storage errors
        }
    }, [notes, storageKey]);

    const addNote = useCallback((selectedText, partIndex = 0) => {
        if (!selectedText || !selectedText.trim()) return;
        const note = {
            id: Date.now(),
            text: selectedText.trim(),
            partIndex,
            createdAt: new Date().toISOString(),
        };
        setNotes((prev) => [note, ...prev]);
    }, []);

    const deleteNote = useCallback((id) => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const clearNotes = useCallback(() => {
        setNotes([]);
    }, []);

    return { notes, addNote, deleteNote, clearNotes };
};
