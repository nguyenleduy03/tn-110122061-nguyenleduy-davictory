const fs = require('fs');
let code = fs.readFileSync('src/pages/IeltsReadingTest.jsx', 'utf8');

// 1. Add Bookmark import
if (!code.includes('import { Check, ArrowLeft, ArrowRight, ArrowLeftRight, Bookmark }')) {
    code = code.replace('import { Check, ArrowLeft, ArrowRight, ArrowLeftRight }', 'import { Check, ArrowLeft, ArrowRight, ArrowLeftRight, Bookmark }');
}

// 2. Add state
code = code.replace(
    'const [loading, setLoading] = useState(true);',
    'const [loading, setLoading] = useState(true);\n    const [bookmarks, setBookmarks] = useState({});\n\n    const toggleBookmark = (num) => {\n        setBookmarks(prev => ({ ...prev, [num]: !prev[num] }));\n    };'
);

// 3. Pass props to QuestionRenderer
code = code.replace(
    /handleAnswerChange=\{handleAnswerChange\}/g,
    'handleAnswerChange={handleAnswerChange}\n                                        bookmarks={bookmarks}\n                                        toggleBookmark={toggleBookmark}'
);

// 4. Also for FillInBlank QuestionRenderer
// Actually the previous regex replaces all.

// 5. Update Footer to show bookmark
code = code.replace(
    '{/* Số thứ tự câu hỏi ở dưới */}',
    '{/* Số thứ tự câu hỏi ở dưới */}\n                                                    {bookmarks[num] && <div style={{ position: "absolute", top: 0, right: 0 }}><Bookmark size={10} fill="#1a73e8" color="#1a73e8" /></div>}'
);
code = code.replace(
    'className="q-wrapper"',
    'className="q-wrapper"\n                                                    style={{ position: "relative" }}'
);

// 6. Update HeadingGap props to receive toggleBookmark
// Wait, HeadingGap is created by createPortal inside PassageRenderer, which doesn't receive toggleBookmark yet!
// Let's modify PassageRenderer and HeadingGap directly.

fs.writeFileSync('src/pages/IeltsReadingTest.jsx', code);
