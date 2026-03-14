const fs = require('fs');

const path = '.github/workflows/pr-orchestrator.yml';
let content = fs.readFileSync(path, 'utf8');

const regex = /'#### 🤖 Gemini Manual Trigger Quick Reference\\n' \+.*?MANUAL_TRIGGERS\.md'\)\./gs;
content = content.replace(regex, '');

// Fix any leftover `+ ;` or `+ \n ;`
content = content.replace(/\+\s*;/g, ';');

fs.writeFileSync(path, content, 'utf8');
