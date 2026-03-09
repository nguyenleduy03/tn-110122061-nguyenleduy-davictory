const fs = require('fs');
const file = 'src/pages/IeltsListeningTest.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const \[bookmarks,\s*setBookmarks\] = useState\(\{\}\);\s*const toggleBookmark = \([a-zA-Z0-9_]+\) => \{[\s\S]*?\};\s*/g;
const matches = [...content.matchAll(regex)];

if (matches.length > 1) {
    // Keep the first one, remove the others
    for (let i = 1; i < matches.length; i++) {
        content = content.replace(matches[i][0], '');
    }
    fs.writeFileSync(file, content);
    console.log('Fixed duplicate state in IeltsListeningTest');
} else {
    console.log('No duplicate state found.');
}
