const fs = require('fs');
let code = fs.readFileSync('src/data/mockData.js', 'utf8');

// Change multiple choice numbers to avoid duplication
code = code.replace(/id: "q14", number: 14/g, 'id: "q21", number: 21');
code = code.replace(/id: "q15", number: 15/g, 'id: "q22", number: 22');
code = code.replace(/id: "q16", number: 16/g, 'id: "q23", number: 23');

fs.writeFileSync('src/data/mockData.js', code);
