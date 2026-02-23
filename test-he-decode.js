import { decode } from 'he';
const text = 'Note&nbsp;with&nbsp;nbsp';
const decoded = decode(text);
console.log('Decoded:', JSON.stringify(decoded));
console.log('Normalized:', JSON.stringify(decoded.replace(/\s+/g, ' ')));
