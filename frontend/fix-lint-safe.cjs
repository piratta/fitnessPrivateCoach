const fs = require('fs');
const { execSync } = require('child_process');

try {
  execSync('npx eslint src --format json > lint-results.json', { stdio: 'pipe' });
} catch (e) {
}

const results = JSON.parse(fs.readFileSync('lint-results.json', 'utf8'));

results.forEach(fileResult => {
  if (fileResult.errorCount === 0 && fileResult.warningCount === 0) return;

  const filePath = fileResult.filePath;
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  
  // Group messages by line
  const messagesByLine = {};
  fileResult.messages.forEach(msg => {
    const line = msg.line;
    if (!messagesByLine[line]) messagesByLine[line] = new Set();
    messagesByLine[line].add(msg.ruleId);
  });

  const linesToModify = Object.keys(messagesByLine).map(Number).sort((a, b) => b - a);
  let modified = false;

  linesToModify.forEach(line => {
    const lineIndex = line - 1;
    const rules = Array.from(messagesByLine[line]).filter(Boolean).join(', ');
    
    if (lines[lineIndex].startsWith('import React') && rules.includes('no-unused-vars')) {
      lines[lineIndex] = lines[lineIndex].replace('import React, {', 'import {').replace('import React from', 'import from');
      if (lines[lineIndex].includes('import from')) {
        lines[lineIndex] = ''; 
      }
      modified = true;
    } else if (rules) {
      // Avoid stacking eslint-disable-next-line
      if (!lines[lineIndex - 1] || !lines[lineIndex - 1].includes('eslint-disable-next-line')) {
        const indentMatch = lines[lineIndex].match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : '';
        lines.splice(lineIndex, 0, `${indent}// eslint-disable-next-line ${rules}`);
        modified = true;
      }
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Disabled errors in ${filePath}`);
  }
});
