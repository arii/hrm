// File: services/hrmService.ts
import { HrmDataRepository } from '../lib/repositories/HrmDataRepository';
import { HrmStreamData } from '../types/core';
import { CALORIE_DEFAULTS } from '../utils/constants';
import { estimateCaloriesBurned } from '../lib/calorie-estimation';
import logger from '../utils/logger';

// Track internal state for calculations (not sent to client)
const clientSessionState = new Map<
  string,
  { lastUpdate: number; accumulatedCalories: number }
>();

export class HrmService {
  private hrmDataRepository: HrmDataRepository;

  constructor() {
    this.hrmDataRepository = new HrmDataRepository();
  }

  public initializeClient(clientId: string) {
    if (!this.hrmDataRepository.findById(clientId)) {
      const newClient: HrmStreamData = {
        clientId: clientId,
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0,
      };
      this.hrmDataRepository.save(newClient);
      clientSessionState.set(clientId, {
        lastUpdate: Date.now(),
        accumulatedCalories: 0,
      });
      logger.info({ clientId }, 'Initialized new HRM client session.');
    } else {
      logger.info({ clientId }, 'HRM client reconnected with existing session.');
    }
  }

  public updateMetadata(clientId: string, data: Partial<HrmStreamData>) {
    const existingData = this.hrmDataRepository.findById(clientId);
    if (existingData) {
      const updateData: Partial<HrmStreamData> = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== null)
      );

      if (
        existingData.name &&
        !/^(user|new user|unknown|bluetooth hrm)/i.test(existingData.name) &&
        updateData.name &&
        /^(user|new user|unknown|bluetooth hrm)/i.test(updateData.name)
      ) {
        delete updateData.name;
      }

      this.hrmDataRepository.save({ ...existingData, ...updateData });
    }
  }

  public processHrmInput(clientId: string, data: { value: number | null; calories?: number | null }) {
    const existingData = this.hrmDataRepository.findById(clientId);
    const sessionState = clientSessionState.get(clientId);
    if (existingData && sessionState) {
      let finalCalories = 0;
      if (typeof data.calories === 'number') {
        const clientCalories = data.calories;
        const serverCalories = sessionState.accumulatedCalories;
        const diff = Math.abs(clientCalories - serverCalories);

        if (diff > 50) {
          logger.warn(
            {
              clientId,
              clientCalories,
              serverCalories,
            },
            'Large calorie discrepancy detected. Rejecting client update.'
          );
          finalCalories = serverCalories;
        } else {
          finalCalories = clientCalories;
          sessionState.accumulatedCalories = finalCalories;
        }
      } else {
        const now = Date.now();
        const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60;
        sessionState.lastUpdate = now;

        let currentAccumulated = sessionState.accumulatedCalories;
        const currentHr = data.value ?? existingData.value;
        const currentAge = existingData.age ?? 30;
        if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) {
          const caloriesBurned = estimateCaloriesBurned({
            heartRate: currentHr,
            age: currentAge,
            weightKg: existingData.weightKg ?? CALORIE_DEFAULTS.WEIGHT_KG,
            durationMinutes: dtMinutes,
          });
          currentAccumulated += caloriesBurned;
        }
        sessionState.accumulatedCalories = currentAccumulated;
        finalCalories = currentAccumulated;
      }
      this.hrmDataRepository.save({
        ...existingData,
        value: data.value ?? existingData.value,
        calories: Math.round(finalCalories * 10) / 10,
      });
    }
  }

  public cleanupClient(clientId: string) {
    this.hrmDataRepository.deleteById(clientId);
    clientSessionState.delete(clientId);
  }

  public getHrmData() {
    return this.hrmDataRepository.findAll();
  }
}
