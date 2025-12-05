import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { validateAddress, suggestWalkingRoutes } from '../services/walksService';

export const walksRouter = Router();
walksRouter.use(requireAuth);

walksRouter.post('/validate-address', async (req: AuthedRequest, res) => {
  try {
    const { input } = req.body as { input?: string };
    if (!input || !input.trim()) {
      return res.status(400).json({ error: 'input обязателен' });
    }
    const normalized = await validateAddress(input);
    res.json({ address: normalized });
  } catch (e) {
    console.error('validate-address error', e);
    res.status(500).json({ error: 'Ошибка валидации адреса' });
  }
});

walksRouter.post('/suggest', async (req: AuthedRequest, res) => {
  try {
    const { stepsNeeded, mode, lat, lng, customAddress } = req.body as {
      stepsNeeded?: number;
      mode?: 'nearby' | 'direct' | 'custom_address';
      lat?: number | null;
      lng?: number | null;
      customAddress?: string;
    };

    if (!stepsNeeded || stepsNeeded <= 0) {
      return res.status(400).json({ error: 'stepsNeeded должен быть > 0' });
    }
    if (!mode || !['nearby', 'direct', 'custom_address'].includes(mode)) {
      return res.status(400).json({ error: 'mode должен быть one of nearby|direct|custom_address' });
    }

    const routes = await suggestWalkingRoutes(lat ?? null, lng ?? null, stepsNeeded, mode, customAddress);
    res.json(routes);
  } catch (e) {
    console.error('suggest walks error', e);
    res.status(500).json({ error: 'Ошибка генерации маршрутов' });
  }
});
