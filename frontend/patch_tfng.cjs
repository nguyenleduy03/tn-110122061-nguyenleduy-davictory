const fs = require('fs');
let code = fs.readFileSync('src/components/question/MultipleChoiceQuestion.jsx', 'utf8');

code = code.replace('<div className="tfng-text">', '<div className="tfng-text" style={{ alignItems: "flex-start" }}>');
code = code.replace('<div className="tfng-number">{q.number}</div>', '<div className="tfng-number" style={{ height: "auto", paddingTop: "0", marginTop: "-1px" }}>{q.number}</div>');

fs.writeFileSync('src/components/question/MultipleChoiceQuestion.jsx', code);
