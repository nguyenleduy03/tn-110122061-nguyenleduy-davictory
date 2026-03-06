const fs = require('fs');
let code = fs.readFileSync('src/pages/IeltsReadingTest.jsx', 'utf8');

const oldPassageRenderer = `const PassageRenderer = ({ part, answers, handleAnswerChange, activeQuestion, setActiveQuestion }) => {
    const pRef = React.useRef(null);
    const [gaps, setGaps] = React.useState([]);

    React.useEffect(() => {
        if (pRef.current) {
            const nodes = Array.from(pRef.current.querySelectorAll('.heading-gap'));
            console.log("Found gaps:", nodes.length); console.log("Found gaps:", nodes.length); setGaps(nodes);
        }
    }, [part.passageContent]);

    return (
        <div style={{ position: 'relative' }}>
            <div ref={pRef} className="passage-content" dangerouslySetInnerHTML={{ __html: part.passageContent }}></div>
            {gaps.map((node, i) => {
                const qId = node.getAttribute('data-id');
                const num = node.getAttribute('data-number');
                return createPortal(
                    <HeadingGap
                        key={i}
                        qId={qId} number={num} answer={answers[qId]}
                        handleAnswerChange={handleAnswerChange}
                        isActive={activeQuestion == num}
                        setActiveQuestion={setActiveQuestion}
                    />,
                    node
                );
            })}
        </div>
    );
};`;

const newPassageRenderer = `const PassageContentStatic = React.memo(({ content }) => (
    <div className="passage-content" dangerouslySetInnerHTML={{ __html: content }}></div>
), (prev, next) => prev.content === next.content);

const PassageRenderer = ({ part, answers, handleAnswerChange, activeQuestion, setActiveQuestion }) => {
    const [gaps, setGaps] = React.useState([]);

    React.useEffect(() => {
        // Query the DOM after static content paints
        const timer = setTimeout(() => {
            const nodes = Array.from(document.querySelectorAll('.passage-content .heading-gap'));
            console.log("Found gaps static:", nodes.length);
            setGaps(nodes);
        }, 100);
        return () => clearTimeout(timer);
    }, [part.passageContent]);

    return (
        <div style={{ position: 'relative' }}>
            <PassageContentStatic content={part.passageContent} />
            {gaps.map((node, i) => {
                const qId = node.getAttribute('data-id');
                const num = node.getAttribute('data-number');
                return createPortal(
                    <HeadingGap
                        key={qId || i}
                        qId={qId} number={num} answer={answers[qId]}
                        handleAnswerChange={handleAnswerChange}
                        isActive={activeQuestion == num}
                        setActiveQuestion={setActiveQuestion}
                    />,
                    node
                );
            })}
        </div>
    );
};`;

code = code.replace(oldPassageRenderer, newPassageRenderer);
fs.writeFileSync('src/pages/IeltsReadingTest.jsx', code);
