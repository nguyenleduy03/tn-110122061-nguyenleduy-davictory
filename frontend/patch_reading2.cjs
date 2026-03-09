const fs = require('fs');
let code = fs.readFileSync('src/pages/IeltsReadingTest.jsx', 'utf8');

// Update PassageRenderer props
code = code.replace(
    'const PassageRenderer = ({ part, answers, handleAnswerChange, activeQuestion, setActiveQuestion }) => {',
    'const PassageRenderer = ({ part, answers, handleAnswerChange, activeQuestion, setActiveQuestion, bookmarks, toggleBookmark }) => {'
);
code = code.replace(
    'setActiveQuestion={setActiveQuestion}',
    'setActiveQuestion={setActiveQuestion}\n                        bookmarks={bookmarks}\n                        toggleBookmark={toggleBookmark}'
);

// We need to update HeadingGap props
code = code.replace(
    'const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion }) => {',
    'const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion, bookmarks, toggleBookmark }) => {'
);

// We need to update HeadingGap rendering to add Bookmark
const headingNumRegex = /<span style={{ fontWeight: 'bold', color: '#000', fontSize: '16px' }}>(\{number})<\/span>/g;
code = code.replace(headingNumRegex, 
    '<div style={{ display: "flex", alignItems: "center", gap: "5px" }}>\n                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(number); }} style={{ cursor: "pointer", display: "flex" }}>\n                        <Bookmark size={15} fill={bookmarks?.[number] ? "#1a73e8" : "none"} color={bookmarks?.[number] ? "#1a73e8" : "#666"} />\n                    </span>\n                    <span style={{ fontWeight: "bold", color: "#000", fontSize: "16px" }}>{number}</span>\n                </div>'
);

// Update where the Answer is rendered to also have the bookmark
const headingNumWithAnswerRegex = /<div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>/g;
code = code.replace(headingNumWithAnswerRegex, 
    '<div style={{ display: "flex", alignItems: "center", width: "100%", gap: "5px" }}>\n                    <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(number); }} style={{ cursor: "pointer", display: "flex", zIndex: 10 }}>\n                        <Bookmark size={15} fill={bookmarks?.[number] ? "#1a73e8" : "none"} color={bookmarks?.[number] ? "#1a73e8" : "#666"} />\n                    </span>'
);

fs.writeFileSync('src/pages/IeltsReadingTest.jsx', code);
