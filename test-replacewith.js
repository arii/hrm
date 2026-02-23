import { parse } from 'node-html-parser';
const root = parse('<div>Hello<br>World</div>');
const br = root.querySelector('br');
br.replaceWith(' ');
console.log('Result:', JSON.stringify(root.text));
