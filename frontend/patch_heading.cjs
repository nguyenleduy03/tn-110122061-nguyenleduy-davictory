const fs = require('fs');
let content = fs.readFileSync('src/pages/IeltsReadingTest.jsx', 'utf8');

const oldGap = `const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion }) => {
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
        e.dataTransfer.setData('text/plain', answer);
        e.dataTransfer.setData('sourceQId', String(qId));
        e.dataTransfer.effectAllowed = 'move';
    };
    return (
        <div id={\`question-\${number}\`} onClick={(e) => { e.stopPropagation(); setActiveQuestion(Number(number)); }}
            style={{
                border: isActive ? '2px dashed #333' : '2px dashed #3498db',
                padding: '10px 15px',
                margin: '0 0 10px 0', display: 'flex',
                backgroundColor: isActive ? '#f9f9f9' : '#fff',
                minHeight: '44px',
                position: 'relative',
                borderRadius: '6px',
                alignItems: 'center',
                justifyContent: 'center', width: '100%', boxSizing: 'border-box'
            }}
            onDragOver={handleDragOver} onDrop={handleDrop}
        >

            <span style={{
                padding: '0 10px', fontWeight: 'bold', color: '#333', fontSize: '15px'
            }}>{number}</span>

            {answer ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '10px' }}>
                    <span 
                        draggable={true} 
                        onDragStart={handleDragStart} 
                        style={{ fontWeight: '500', color: '#333', cursor: 'grab' }}
                    >
                        {answer}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleAnswerChange(qId, ''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#aaa' }}
                    >x</button>
                </div>
            ) : <span style={{ color: '#bbb', fontSize: '14px' }}>Drop heading here</span>}
        </div>
    );
};`;

const newGap = `const HeadingGap = ({ qId, number, answer, handleAnswerChange, isActive, setActiveQuestion }) => {
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
            style={{
                border: isActive ? '2px dashed #333' : '1px dashed #3498db',
                height: '32px',
                margin: '15px 0', display: 'flex',
                backgroundColor: isActive ? '#f9f9f9' : '#fff',
                position: 'relative',
                borderRadius: '4px',
                alignItems: 'center',
                justifyContent: 'center', width: '100%', boxSizing: 'border-box',
                cursor: 'pointer'
            }}
            onDragOver={handleDragOver} onDrop={handleDrop} draggable={!!answer} onDragStart={handleDragStart}
        >

            {!answer ? (
                <span style={{ fontWeight: 'bold', color: '#000', fontSize: '16px' }}>{number}</span>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#000', fontSize: '16px', marginRight: '5px' }}>{number}</span>
                    <span style={{ fontWeight: 'bold', color: '#333' }}>
                        {answer}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleAnswerChange(qId, ''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#aaa', marginLeft: '5px' }}
                    >×</button>
                </div>
            )}
        </div>
    );
};`;

content = content.replace(oldGap.replace(/×/g, 'x'), newGap); // handling special characters if any
content = content.replace(/>x<\/button>/g, '>×<\/button>');
fs.writeFileSync('src/pages/IeltsReadingTest.jsx', content);
