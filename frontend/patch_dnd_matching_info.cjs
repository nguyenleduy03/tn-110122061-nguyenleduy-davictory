const fs = require('fs');
const file = 'src/components/question/DragDropGroupQuestion.jsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `{isMatchingInfo && subQ.text ? (
                                    <span style={{ flex: 'none', marginRight: '10px' }}>{subQ.text}</span>
                                ) : null}`;
const replace1 = `{isMatchingInfo && subQ.text ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 'none', marginRight: '10px' }}>
                                        <span onClick={(e) => { e.stopPropagation(); toggleBookmark?.(subQ.number); }} style={{ cursor: "pointer", display: "flex" }}>
                                            <Bookmark size={15} fill={bookmarks?.[subQ.number] ? "#1a73e8" : "none"} color={bookmarks?.[subQ.number] ? "#1a73e8" : "#ccc"} />
                                        </span>
                                        <span>{subQ.text}</span>
                                    </div>
                                ) : null}`;

if (content.includes(target1)) {
    content = content.replace(target1, replace1);
    fs.writeFileSync(file, content);
    console.log('Patched DragDropGroupQuestion for isMatchingInfo');
} else {
    console.log('Target string 1 not found.');
}
