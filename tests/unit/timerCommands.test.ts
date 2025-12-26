// File: tests/unit/timerCommands.test.ts
import { TimerCommands } from '../../services/timer/timerCommands';
import { createInitialTimerState } from '../../services/timer/timerState';
import { TimerQueries } from '../../services/timer/timerQueries';
import { ValidationError } from '../../types/errors';

describe('TimerCommands', () => {
  let state;
  let queries;
  let broadcastUpdate;
  let commands;

  beforeEach(() => {
    state = createInitialTimerState();
    queries = new TimerQueries(state);
    broadcastUpdate = jest.fn();
    commands = new TimerCommands(state, broadcastUpdate, queries);
  });

  describe('setConfig', () => {
    it('should throw a ValidationError for negative work duration', () => {
      expect(() => {
        commands.setConfig({ workDuration: -1, restDuration: 10 });
      }).toThrow(ValidationError);
    });

    it('should throw a ValidationError for negative rest duration', () => {
      expect(() => {
        commands.setConfig({ workDuration: 20, restDuration: -1 });
      }).toThrow(ValidationError);
    });

    it('should throw a ValidationError for work duration less than 1', () => {
        expect(() => {
          commands.setConfig({ workDuration: 0, restDuration: 10 });
        }).toThrow(ValidationError);
      });
  });
});
