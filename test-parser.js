import { parse } from 'node-html-parser';
const root = parse('<div><span>test</span></div>');
const span = root.querySelector('span');
try {
  span.insertAdjacentHTML('beforebegin', ' ');
  console.log('Output:', root.toString());
} catch (e) {
  console.log('Error:', e.message);
}
