// STEP 2 of 3 – split the unpacked page into its two parts.
//
// The prototype page contains one special script, <script type="text/x-dc">, which holds all of the app's
// logic (a React-style class). Everything else is the page markup (screens, styles, fonts).
// This script saves them separately:  logic.js  and  markup.html  (both in the same folder).
//
// Usage:  node tools/split.js <folderFromStep1>
// Next:   node tools/convert.js <folderFromStep1> src/app/user
const fs = require('fs');

const unpackDir = process.argv[2];
const indexHtml = fs.readFileSync(unpackDir + '/index.html', 'utf8');

// match[0] is the whole <script> tag, match[1] is the code inside it.
const logicScriptMatch = indexHtml.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
const logicCode = logicScriptMatch[1];
fs.writeFileSync(unpackDir + '/logic.js', logicCode);

const markup = indexHtml.replace(logicScriptMatch[0], '');
fs.writeFileSync(unpackDir + '/markup.html', markup);

console.log(unpackDir, 'logic', logicCode.length, 'markup', markup.length);
