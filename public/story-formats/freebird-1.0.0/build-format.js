const fs = require('fs');
const path = require('path');

const enginePath = path.join(__dirname, 'engine.html');
const formatPath = path.join(__dirname, 'format.js');

const engineHtml = fs.readFileSync(enginePath, 'utf8');

// Minify HTML mildly by removing excess newlines and spaces, but not aggressively since we'll just escape it
let sourceString = engineHtml
    .replace(/\\/g, '\\\\') // escape backslashes first!
    .replace(/\r/g, '') // remove carriage returns
    .replace(/\n\s+/g, '\n') // remove leading spaces
    .replace(/\n/g, '\\n') // escape newlines
    .replace(/"/g, '\\"'); // escape double quotes

const formatText = fs.readFileSync(formatPath, 'utf8');

// Replace the source property string using a proper regex
const newFormatText = formatText.replace(/"source"\s*:\s*"[\s\S]*?(?<!\\)"\s*,/, `"source": "${sourceString}",`);

fs.writeFileSync(formatPath, newFormatText, 'utf8');
console.log('Successfully embedded engine.html into format.js source property.');
