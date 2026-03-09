const fs = require('fs');
let code = fs.readFileSync('src/components/question/MultipleChoiceQuestion.jsx', 'utf8');

if (!code.includes('import { Bookmark }')) {
    code = code.replace("import React from 'react';", "import React from 'react';\nimport { Bookmark } from 'lucide-react';");
}

code = code.replace(
    'const MultipleChoiceQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange }) => {',
    'const MultipleChoiceQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, bookmarks, toggleBookmark }) => {'
);

const numDiv = '<div className="tfng-number" style={{ height: "auto", lineHeight: "1.5", fontSize: "16px", paddingTop: "0", margin: "0", alignItems: "flex-start", fontWeight: "bold", minWidth: "auto" }}>{q.number}</div>';

const bookmarkedNumDiv = `
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} style={{ cursor: "pointer", display: "flex", marginTop: "2px" }}>
                        <Bookmark size={18} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} />
                    </span>
                    ${numDiv}
                </div>`;

code = code.replace(numDiv, bookmarkedNumDiv);

fs.writeFileSync('src/components/question/MultipleChoiceQuestion.jsx', code);
