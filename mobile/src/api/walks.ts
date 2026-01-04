import { api } from './client';

export type WalkMode = 'nearby' | 'direct' | 'custom_address';

export interface WalkingRouteApi {
  title: string;
  description: string;
  estimatedSteps: number;
  durationMinutes: number;
  distanceKm: number;
  startLocation: string;
  endLocation: string;
  isRoundTrip?: boolean;
}

export const validateWalkAddress = (input: string) =>
  api.post<{ address: string | null }>('/walks/validate-address', { input });

export const suggestWalks = (
  stepsNeeded: number,
  mode: WalkMode,
  options?: { lat?: number | null; lng?: number | null; customAddress?: string },
) => {
  const { lat = null, lng = null, customAddress } = options || {};
  return api.post<WalkingRouteApi[]>('/walks/suggest',
    {
      stepsNeeded,
      mode,
      lat,
      lng,
      customAddress,
    },
    {
      // AI + карты могут отвечать дольше 15 сек, увеличиваем таймаут только для этого запроса
      timeout: 80000,
    },
  );
};
