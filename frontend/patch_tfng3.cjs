const fs = require('fs');
let code = fs.readFileSync('src/components/question/MultipleChoiceQuestion.jsx', 'utf8');

code = code.replace(/<div className="tfng-number" style={{ height: "auto", lineHeight: "1\.5", fontSize: "16px", paddingTop: "0", margin: "0" }}>/g, '<div className="tfng-number" style={{ height: "auto", lineHeight: "1.5", fontSize: "16px", paddingTop: "0", margin: "0", alignItems: "flex-start" }}>');
fs.writeFileSync('src/components/question/MultipleChoiceQuestion.jsx', code);
