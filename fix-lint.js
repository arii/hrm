import fs from 'fs';
let content = fs.readFileSync('context/WebSocketContext.tsx', 'utf8');

// Replace any with unknown
content = content.replace(/\(event: string, callback: \(data: any\) => void\)/g, '(event: string, callback: (data: unknown) => void)');
content = content.replace(/const onEvent = useCallback\(\(event: string, callback: \(data: any\) => void\) => \{/g, 'const onEvent = useCallback((event: string, callback: (data: unknown) => void) => {');

// Fix prettier issues on the event dispatch
content = content.replace(/new CustomEvent\('SPOTIFY_OPTIMISTIC_FAILURE', \{ detail: message\.payload \}\)/g, `new CustomEvent('SPOTIFY_OPTIMISTIC_FAILURE', {
              detail: message.payload,
            })`);

fs.writeFileSync('context/WebSocketContext.tsx', content);

let volumeContent = fs.readFileSync('hooks/useSpotifyVolume.ts', 'utf8');
volumeContent = volumeContent.replace(/data: any/g, 'data: any'); // wait, the error is in hooks/useSpotifyVolume.ts as well? Let me check.
volumeContent = volumeContent.replace(/return onEvent\('SPOTIFY_OPTIMISTIC_FAILURE', \(data: any\) => \{/g, `return onEvent('SPOTIFY_OPTIMISTIC_FAILURE', (data: any) => {`);
// Oh actually the lint output says: hooks/useSpotifyVolume.ts:123:57 - Unexpected any
volumeContent = volumeContent.replace(/return onEvent\('SPOTIFY_OPTIMISTIC_FAILURE', \(data: any\) => \{/g, `return onEvent('SPOTIFY_OPTIMISTIC_FAILURE', (data: unknown) => {`);
fs.writeFileSync('hooks/useSpotifyVolume.ts', volumeContent);
