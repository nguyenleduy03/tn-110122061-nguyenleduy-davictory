import React from 'react';
import { X, Trash2, NotebookPen } from 'lucide-react';

// Scroll to the first DOM text node containing the note text
const scrollToNoteText = (noteText) => {
    if (!noteText) return false;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.includes(noteText)) {
            const el = node.parentElement;
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Flash highlight briefly to indicate location
                el.classList.add('note-scroll-flash');
                setTimeout(() => el.classList.remove('note-scroll-flash'), 1500);
                return true;
            }
        }
    }
    return false;
};

const NotesPanel = ({ notes, onDelete, onClose, onNoteClick }) => {
    const handleNoteClick = (note) => {
        if (onNoteClick) {
            onNoteClick(note, () => scrollToNoteText(note.text));
        } else {
            scrollToNoteText(note.text);
        }
    };

    return (
        <div className="notes-panel">
            <div className="notes-panel-header">
                <span className="notes-panel-title">Notes</span>
                <button className="notes-panel-close" onClick={onClose} aria-label="Close notes">
                    <X size={18} />
                </button>
            </div>

            <div className="notes-panel-body">
                {notes.length === 0 ? (
                    <div className="notes-empty-state">
                        <NotebookPen size={40} strokeWidth={1.5} className="notes-empty-icon" />
                        <p className="notes-empty-title">Your private notes will show here</p>
                        <p className="notes-empty-sub">Select text to create notes and highlights</p>
                    </div>
                ) : (
                    <ul className="notes-list">
                        {notes.map((note) => (
                            <li key={note.id} className="notes-item" onClick={() => handleNoteClick(note)}>
                                <p className="notes-item-text">{note.text}</p>
                                <button
                                    className="notes-item-delete"
                                    onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                                    aria-label="Delete note"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default NotesPanel;
