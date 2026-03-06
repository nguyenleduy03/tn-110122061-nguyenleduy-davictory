const fs = require('fs');
let code = fs.readFileSync('src/pages/IeltsReadingTest.jsx', 'utf8');
code = code.replace('setGaps(nodes);', 'console.log("Found gaps:", nodes.length); setGaps(nodes);');
fs.writeFileSync('src/pages/IeltsReadingTest.jsx', code);
