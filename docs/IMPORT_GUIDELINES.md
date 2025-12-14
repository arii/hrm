## Import Path Conventions

To maintain consistency and leverage the centralized barrel exports, please follow these import patterns:

### 1. From Barrel Exports (Recommended for common components, hooks, utils):

```typescript
import { HrTile, BottomNavBar } from '@/components';
import { useAudio, useLocalStorage } from '@/hooks';
import { logger, dateUtils } from '@/utils';
```

### 2. Direct Imports (For specific modules not in barrel exports):

```typescript
import { ToastProvider } from '@/context/ToastContext'; // Correct path for ToastContext
import theme from '@/lib/theme';                      // Correct path for theme configuration
```

### 3. Avoid (Incorrect/Deprecated Patterns):

```typescript
import { ToastContainer } from '@/components/Toast'; // ❌ This component does not exist
import { theme } from '@/styles/theme';              // ❌ Incorrect path, use '@/lib/theme'
import HrTile from '../../components/HrTile';        // ❌ Avoid relative paths for top-level components
```
