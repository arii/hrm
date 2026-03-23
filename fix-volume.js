import fs from 'fs';
let volumeContent = fs.readFileSync('hooks/useSpotifyVolume.ts', 'utf8');

volumeContent = volumeContent.replace(/return onEvent\('SPOTIFY_OPTIMISTIC_FAILURE', \(data: \{ command: string \}\) => \{/g, `return onEvent('SPOTIFY_OPTIMISTIC_FAILURE', (data: unknown) => {`);

volumeContent = volumeContent.replace(/if \(data\.command === 'SET_VOLUME'\) \{/g, `if ((data as { command: string })?.command === 'SET_VOLUME') {`);

fs.writeFileSync('hooks/useSpotifyVolume.ts', volumeContent);
