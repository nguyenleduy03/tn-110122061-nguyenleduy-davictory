const fs = require('fs');
let code = fs.readFileSync('src/pages/IeltsReadingTest.jsx', 'utf8');

const regex = /const HeadingGap = \({(?:[\s\S]*?)return \([\s\S]*?<\/div>\s*\);\s*};/m;

const newComponent = `const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion }) => {
    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e) => {
        e.preventDefault();
        const option = e.dataTransfer.getData('text/plain');
        const sourceQId = e.dataTransfer.getData('sourceQId');
        if (option) {
            handleAnswerChange(qId, option);
            if (sourceQId && sourceQId !== String(qId)) {
                handleAnswerChange(sourceQId, '');
            }
        }
    };

    const handleDragStart = (e) => {
        if (!answer) return;
        e.dataTransfer.setData('text/plain', answer);
        e.dataTransfer.setData('sourceQId', String(qId));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div id={\`question-\${number}\`} onClick={(e) => { e.stopPropagation(); setActiveQuestion(Number(number)); }}
            style={answer ? {
                border: isActive ? '1px solid #333' : '1px solid #3498db',
                height: '32px',
                padding: '0 12px',
                margin: '10px 0',
                display: 'flex',
                backgroundColor: isActive ? '#f9f9f9' : '#fff',
                borderRadius: '4px',
                alignItems: 'center',
                boxSizing: 'border-box',
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#000',
                fontSize: '15px',
                width: '100%'
            } : {
                border: isActive ? '2px dashed #333' : '1px dashed #3498db',
                height: '32px',
                margin: '10px 0',
                display: 'flex',
                backgroundColor: isActive ? '#f9f9f9' : '#fff',
                borderRadius: '4px',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                boxSizing: 'border-box',
                cursor: 'pointer'
            }}
            onDragOver={handleDragOver} onDrop={handleDrop} draggable={!!answer} onDragStart={handleDragStart}
        >
            {!answer ? (
                <span style={{ fontWeight: 'bold', color: '#000', fontSize: '16px' }}>{number}</span>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span>{answer}</span>
                </div>
            )}
        </div>
    );
};`;

// Use indexOf approach again
const startStr = "const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion }) => {";
const startIndex = code.indexOf(startStr);
const endStr = "const PassageContentStatic";
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + newComponent + "\n\n" + code.substring(endIndex);
    fs.writeFileSync('src/pages/IeltsReadingTest.jsx', code);
    console.log("Patched HeadingGap successfully");
} else {
    console.log("Could not find HeadingGap");
}
