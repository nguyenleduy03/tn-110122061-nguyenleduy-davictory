const fs = require('fs');
let code = fs.readFileSync('src/components/question/DragDropGroupQuestion.jsx', 'utf8');

if (!code.includes('import { Bookmark }')) {
    code = code.replace("import React from 'react';", "import React from 'react';\nimport { Bookmark } from 'lucide-react';");
}

code = code.replace(
    'const DragDropGroupQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange }) => {',
    'const DragDropGroupQuestion = ({ q, activeQuestion, setActiveQuestion, answers, handleAnswerChange, bookmarks, toggleBookmark }) => {'
);


code = code.replace(
    /<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>\s*\{!isMatchingInfo && <span style={{ fontWeight: '500', width: '25px' }}>\{subQ\.number\}<\/span>\}/m,
    '<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>\n                                    {!isMatchingInfo && <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>\n                                        <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(subQ.number); }} style={{ cursor: "pointer", display: "flex" }}>\n                                            <Bookmark size={15} fill={bookmarks?.[subQ.number] ? "#1a73e8" : "none"} color={bookmarks?.[subQ.number] ? "#1a73e8" : "#ccc"} />\n                                        </span>\n                                        <span style={{ fontWeight: "bold", width: "20px" }}>{subQ.number}</span>\n                                    </div>}'
);

fs.writeFileSync('src/components/question/DragDropGroupQuestion.jsx', code);
