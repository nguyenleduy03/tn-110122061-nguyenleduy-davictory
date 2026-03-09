const fs = require('fs');
let code = fs.readFileSync('src/components/question/FillInBlankQuestion.jsx', 'utf8');

if (!code.includes('import { Bookmark }')) {
    code = code.replace("import React from 'react';", "import React from 'react';\nimport { Bookmark } from 'lucide-react';");
}
code = code.replace(
    'const FillInBlankQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, inputRefs }) => {',
    'const FillInBlankQuestion = ({ q, activeQuestion, setActiveQuestion, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark }) => {'
);
code = code.replace(
    'if (parts.length < 2) return <li id={`question-${q.number}`}>{q.text}</li>;',
    'if (parts.length < 2) return <li id={`question-${q.number}`} style={{ position: "relative" }}><span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} style={{ position: "absolute", left: "-28px", top: "5px", cursor: "pointer", display: "flex" }}><Bookmark size={16} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} /></span>{q.text}</li>;'
);
code = code.replace(
    '<li id={`question-${q.number}`}>',
    '<li id={`question-${q.number}`} style={{ position: "relative" }}>\n            <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(q.number); }} style={{ position: "absolute", left: "-28px", top: "5px", cursor: "pointer", display: "flex" }}>\n                <Bookmark size={16} fill={bookmarks?.[q.number] ? "#1a73e8" : "none"} color={bookmarks?.[q.number] ? "#1a73e8" : "#ccc"} />\n            </span>'
);

fs.writeFileSync('src/components/question/FillInBlankQuestion.jsx', code);
