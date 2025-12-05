// hooks/useHrmState.ts
import { useAppState } from '@/context/AppStateContext';

export const useHrmState = () => {
  const { hrmData } = useAppState();
  return { hrmData };
};
