# Test Data Factories

This directory contains factory functions for creating consistent mock data for use in tests. Using these factories ensures that test data is standardized and easy to maintain.

## Usage

To use a factory, import the desired creator function and call it in your test file. You can provide an object with properties to override the default values.

### Example: UserProfile

```typescript
import { createValidUserProfile } from '@/tests/test-data/user-data-factory';

it('should create a user with a custom username', () => {
  const user = createValidUserProfile({ username: 'testuser' });
  expect(user.username).toBe('testuser');
});
```

### Example: SpotifyTrack

```typescript
import { createSpotifyTrack } from '@/tests/test-data/spotify-data-factory';

it('should create a spotify track with a custom name', () => {
  const track = createSpotifyTrack({ name: 'My Favorite Song' });
  expect(track.name).toBe('My Favorite Song');
});
```
