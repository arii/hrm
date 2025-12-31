## Import Path Conventions

To maintain consistency, improve bundle size through tree-shaking, and ensure clarity, please follow these import patterns.

### 1. Direct Imports for Project Components

Always use direct, full paths for importing components, hooks, and utilities. This project uses path aliases (`@/*`) for easier access to top-level directories.

**Correct:**
```typescript
// Importing components
import HrTile from '@/components/HrTile'
import BottomNavBar from '@/components/BottomNavBar'

// Importing hooks
import { useAudio } from '@/hooks/useAudio'
import { useLocalStorage } from '@/hooks/useLocalStorage'

// Importing utils
import { logger } from '@/utils/logger'
import { dateUtils } from '@/utils/dateUtils'
```

### 2. Direct Imports for Material-UI (MUI)

To enable effective tree-shaking and minimize the final application bundle size, you **must** import Material-UI components directly from their specific modules.

**Correct:**
```typescript
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { SxProps } from '@mui/material/styles'
```

**Incorrect (Do Not Use):**
```typescript
// ❌ Avoid barrel imports from the root of @mui/material
import { Box, Button } from '@mui/material'
```

### 3. Avoid (Incorrect/Deprecated Patterns)

```typescript
// ❌ Barrel exports from project directories are disabled.
import { HrTile } from '@/components'

// ❌ Avoid deep relative paths for top-level modules. Use the `@/` alias instead.
import HrTile from '../../components/HrTile'
```
