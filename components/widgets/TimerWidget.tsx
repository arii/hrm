
import React from 'react';
import Widget from './Widget';
import TimerDisplay from '../TimerDisplay';
import { TimerMode, TimerPhase } from '@/types';

interface TimerWidgetProps {
    phase: TimerPhase;
    timeRemaining: number;
    timeElapsed: number;
    mode: TimerMode;
    workDuration: number;
    restDuration: number;
}

const TimerWidget: React.FC<TimerWidgetProps> = (props) => {
  return (
    <Widget title="Timer">
      <TimerDisplay {...props} />
    </Widget>
  );
};

export default TimerWidget;
