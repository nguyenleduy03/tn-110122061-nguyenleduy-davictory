const fs = require('fs');
let code = fs.readFileSync('src/components/question/QuestionRenderer.jsx', 'utf8');

code = code.replace(
    'const QuestionRenderer = ({ q, activeQuestion, setActiveQuestion, answers, answer, handleAnswerChange, inputRefs }) => {',
    'const QuestionRenderer = ({ q, activeQuestion, setActiveQuestion, answers, answer, handleAnswerChange, inputRefs, bookmarks, toggleBookmark }) => {'
);

const propsToAdd = '\n                bookmarks={bookmarks}\n                toggleBookmark={toggleBookmark}';

code = code.replace(
    'handleAnswerChange={handleAnswerChange}\n                inputRefs={inputRefs}',
    'handleAnswerChange={handleAnswerChange}\n                inputRefs={inputRefs}' + propsToAdd
);

code = code.replace(
    'handleAnswerChange={handleAnswerChange}\n            />\n        );\n    }\n\n    if (q.type === \'drag-and-drop\'',
    'handleAnswerChange={handleAnswerChange}' + propsToAdd + '\n            />\n        );\n    }\n\n    if (q.type === \'drag-and-drop\''
);

code = code.replace(
    'handleAnswerChange={handleAnswerChange}\n            />\n        );\n    }\n\n    return <div>',
    'handleAnswerChange={handleAnswerChange}' + propsToAdd + '\n            />\n        );\n    }\n\n    return <div>'
);

fs.writeFileSync('src/components/question/QuestionRenderer.jsx', code);
