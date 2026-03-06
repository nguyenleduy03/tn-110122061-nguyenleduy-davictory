const fs = require('fs');
let code = fs.readFileSync('src/components/question/MultipleChoiceQuestion.jsx', 'utf8');

code = code.replace(/<div className="tfng-text" style={{ alignItems: "flex-start" }}>/g, '<div className="tfng-text" style={{ display: "flex", alignItems: "flex-start", gap: "15px", marginBottom: "15px" }}>');
code = code.replace(/<div className="tfng-number" style={{ height: "auto", paddingTop: "0", marginTop: "-1px" }}>{q\.number}<\/div>/g, '<div className="tfng-number" style={{ height: "auto", lineHeight: "1.5", fontSize: "16px", paddingTop: "0", margin: "0" }}>{q.number}</div>');
code = code.replace(/<div style={{ fontSize: '15px', fontWeight: '500', lineHeight: '1\.5' }}>{q\.text}<\/div>/g, '<div style={{ fontSize: "16px", fontWeight: "400", lineHeight: "1.5", margin: "0", paddingTop: "0" }}>{q.text}</div>');

fs.writeFileSync('src/components/question/MultipleChoiceQuestion.jsx', code);
