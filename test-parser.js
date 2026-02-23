import { parse } from 'node-html-parser';
const root = parse('<div><p>Hello</p><p>World</p></div>');
const p = root.querySelector('p');
p.insertAdjacentHTML('beforebegin', '<span>Space</span>');
console.log(root.toString());
