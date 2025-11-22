import { z } from 'zod';

export const spotifyControlSchema = z.object({
  command: z.enum(['PLAY', 'NEXT', 'PREVIOUS']),
});
