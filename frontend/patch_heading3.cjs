const fs = require('fs');
let code = fs.readFileSync('src/pages/IeltsReadingTest.jsx', 'utf8');

const startStr = "const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion }) => {";
const startIndex = code.indexOf(startStr);
// Find the end of HeadingGap component.
// since we have PassageContentStatic right after it now, we can search for it!
const endStr = "const PassageContentStatic";
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
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
                padding: '4px 12px',
                margin: '10px 0',
                display: 'inline-flex',
                backgroundColor: isActive ? '#f9f9f9' : '#fff',
                borderRadius: '4px',
                alignItems: 'center',
                boxSizing: 'border-box',
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#000',
                fontSize: '15px'
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{answer}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleAnswerChange(qId, ''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#aaa', padding: 0, display: 'flex', alignItems: 'center' }}
                    >×</button>
                </div>
            )}
        </div>
    );
};\n\n`;

    code = code.substring(0, startIndex) + newComponent + code.substring(endIndex);
    fs.writeFileSync('src/pages/IeltsReadingTest.jsx', code);
} else {
    console.log("Not found indexes", startIndex, endIndex);
}
