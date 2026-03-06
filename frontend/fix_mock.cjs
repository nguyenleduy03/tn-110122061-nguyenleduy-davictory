const fs = require('fs');
let code = fs.readFileSync('src/data/mockData.js', 'utf8');

// Find where q_matching_heading is defined twice and remove the second one.
const qMatchingHeadingIndex = code.indexOf('id: "q_matching_heading"');
if (qMatchingHeadingIndex !== -1) {
    const secondIndex = code.indexOf('id: "q_matching_heading"', qMatchingHeadingIndex + 10);
    if (secondIndex !== -1) {
        console.log("Found duplicate q_matching_heading at index", secondIndex);
        // Let's just do a string replacement if it is exactly duplicated 
        // We will just remove the whole object carefully.
        // Or we can just build a regex.
        
        // Let's see the context
    }
}
