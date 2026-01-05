import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { GoogleGenAI, Type } from '@google/genai';
import { Profile } from '../models/Profile';
import { Settings } from '../models/Settings';
import { DailyStats } from '../models/Stats';
import { FoodEntry } from '../models/FoodEntry';
import { ChatMessage } from '../models/ChatMessage';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const aiRouter = Router();
aiRouter.use(requireAuth);

const todayStr = () => new Date().toISOString().split('T')[0];

async function buildUserContext(userId: string) {
  const [profile, settings, todayStats, recentStats, recentMeals] = await Promise.all([
    Profile.findOne({ userId }),
    Settings.findOne({ userId }),
    DailyStats.findOne({ userId, date: todayStr() }),
    DailyStats.find({ userId }).sort({ date: -1 }).limit(7),
    FoodEntry.find({ userId }).sort({ timestamp: -1 }).limit(200),
  ]);

  if (!profile) return '';

  let ctx = 'Данные пользователя:\n';
  const genderRu =
    profile.gender === 'male' ? 'мужской' : profile.gender === 'female' ? 'женский' : 'другой';
  const goalRu =
    profile.goal === 'lose_weight'
      ? 'Похудение'
      : profile.goal === 'gain_muscle'
      ? 'Набор массы'
      : 'Поддержание';

  ctx += `Имя: ${profile.name}, Возраст: ${profile.age}, Пол: ${genderRu}, Рост: ${profile.height}, Вес: ${profile.weight}, Цель: ${goalRu}.\n`;
  ctx += `Уровень активности: ${profile.activityLevel}. Суточная цель: ${profile.dailyCalorieGoal} ккал, ${profile.dailyStepGoal} шагов.\n`;

  if (profile.allergies) ctx += `Аллергии: ${profile.allergies}\n`;
  if (profile.preferences) ctx += `Предпочтения: ${profile.preferences}\n`;
  if (profile.healthConditions) ctx += `Здоровье: ${profile.healthConditions}\n`;

  if (todayStats) {
    ctx += `Статистика за сегодня (${todayStats.date}): ${todayStats.calories} ккал, ${todayStats.steps} шагов, ${todayStats.water} мл воды, сон ${todayStats.sleepHours} ч.\n`;
  }

  if (recentStats && recentStats.length > 0) {
    const avgCalories = Math.round(
      recentStats.reduce((sum, s) => sum + (s.calories || 0), 0) / recentStats.length,
    );
    const avgSteps = Math.round(
      recentStats.reduce((sum, s) => sum + (s.steps || 0), 0) / recentStats.length,
    );
    const avgWater = Math.round(
      recentStats.reduce((sum, s) => sum + (s.water || 0), 0) / recentStats.length,
    );
    const avgSleep =
      recentStats.reduce((sum, s) => sum + (s.sleepHours || 0), 0) / recentStats.length;
    ctx += `Средние значения за последние ${recentStats.length} дней: ${avgCalories} ккал, ${avgSteps} шагов, ${avgWater} мл воды, сон ${avgSleep.toFixed(1)} ч.\n`;
  }

  // Питание за последнюю неделю по дням
  if (recentMeals && recentMeals.length > 0) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStart = today.getTime();
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

    const recent = recentMeals.filter((m) => m.timestamp >= weekStart);
    if (recent.length > 0) {
      const byDay: Record<string, string[]> = {};
      const labels: Record<string, string> = {};
      const todayIso = today.toISOString().slice(0, 10);

      for (const m of recent) {
        const d = new Date(m.timestamp);
        const key = d.toISOString().slice(0, 10);
        const dateLabel = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
        const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const line = `${time} — ${m.name} (${Math.round(m.calories)} ккал)`;
        if (!byDay[key]) {
          byDay[key] = [];
          labels[key] = key === todayIso ? `Сегодня (${dateLabel})` : dateLabel;
        }
        byDay[key].push(line);
      }

      const sortedKeys = Object.keys(byDay).sort();
      for (const key of sortedKeys) {
        const label = labels[key] || key;
        const lines = byDay[key].join('; ');
        ctx += `Питание ${label}: ${lines}.\n`;
      }
    }
  }

  // Настройки сна и воды
  if (settings?.sleep) {
    const s = settings.sleep;
    ctx += `Настройки сна: цель ${s.targetHours} ч, отбой ${s.bedTime}, подъём ${s.wakeTime} (${s.wakeAlarmEnabled ? 'будильник включен' : 'будильник выключен'}).\n`;
  }
  if (settings) {
    ctx += `Цель по воде: ${settings.waterGoal} мл в день.\n`;
  }

  return ctx;
}

aiRouter.post('/chat', async (req: AuthedRequest, res) => {
  try {
    const { history, message, context } = req.body as {
      history?: { role: string; text: string }[];
      message: string;
      context?: string;
    };

    const searchKeywords = ['новости', 'поиск', 'найди', 'инфо', 'рецепт', 'исследование', 'цена', 'сколько', 'кто', 'когда', 'погода', 'состав'];
    const mapKeywords = ['где', 'карта', 'рядом', 'найти', 'адрес', 'маршрут', 'магазин', 'зал', 'аптека', 'больница', 'парк', 'ресторан', 'кафе', 'прогулка', 'маршрут'];

    const lowerMsg = (message || '').toLowerCase();
    const needsSearch = searchKeywords.some((k) => lowerMsg.includes(k));
    const needsMaps = mapKeywords.some((k) => lowerMsg.includes(k));

    const tools: any[] = [];
    if (needsSearch) tools.push({ googleSearch: {} });
    if (needsMaps) tools.push({ googleMaps: {} });

    const model = 'gemini-2.5-flash';

    let systemInstruction =
      'Ты полезный и мотивирующий тренер по питанию, сну и фитнесу. Отвечай кратко и на русском языке. ' +
      'Если используешь поиск или карты, используй эту информацию для ответа. ' +
      'Если пользователь просит поставить будильник, подтверди, что ты обновил настройки (но само действие выполняется приложением). ' +
      'Обязательно учитывай пол пользователя (мужской или женский), аллергии, пищевые предпочтения и хронические заболевания пользователя при расчёте калорий и составлении рекомендаций по питанию, тренировкам и сну. ' +
      'Никогда не предлагай продукты или активности, которые противоречат указанным аллергиям или ограничениям по здоровью.';

    // Инструкция по изменению плана (как в web-версии)
    systemInstruction +=
      '\n\nЕсли пользователь просит изменить план или стратегию (roadmap) и ты согласен с изменениями, ' +
      'в конце своего ответа добавь специальный тег: [UPDATE_PLAN: описание изменений]. ' +
      'Приложение увидит этот тег и обновит план.';

    // Автоматический контекст из профиля, настроек и истории пользователя
    if (req.userId) {
      const userContext = await buildUserContext(req.userId as any);
      if (userContext) {
        systemInstruction += `\n\nДанные профиля и история пользователя:\n${userContext}`;
      }
    }

    // Дополнительный контекст от клиента (если есть)
    if (context) {
      systemInstruction += `\n\nДополнительный контекст от клиента:\n${context}`;
    }

    const chat = ai.chats.create({
      model,
      history: (history || []).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        // Для карт можно было бы передавать lat/lng через toolConfig, когда появится на клиенте
      },
    });

    const day = todayStr();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // хранить неделю

    // Сохраняем сообщение пользователя в историю (за конкретный день)
    if (req.userId && message) {
      await ChatMessage.create({ userId: req.userId, role: 'user', text: message, day, expiresAt });
    }

    const resp = await chat.sendMessage({ message });
    const replyText = resp.text || 'Не удалось сгенерировать ответ.';

    // Сохраняем ответ модели в историю
    if (req.userId && replyText) {
      await ChatMessage.create({ userId: req.userId, role: 'model', text: replyText, day, expiresAt });
    }

    res.json({
      text: replyText,
      groundingChunks: (resp as any).candidates?.[0]?.groundingMetadata?.groundingChunks,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка чата' });
  }
});

aiRouter.get('/chat/history', async (req: AuthedRequest, res) => {
  try {
    const limitRaw = (req.query.limit as string) || '100';
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200);
    const dayParam = (req.query.day as string) || todayStr();

    const items = await ChatMessage.find({ userId: req.userId, day: dayParam })
      .sort({ createdAt: 1 })
      .limit(limit);

    res.json(
      items.map((m) => ({
        role: m.role,
        text: m.text,
        createdAt: m.createdAt,
        day: m.day,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка загрузки истории чата' });
  }
});

aiRouter.get('/chat/days', async (req: AuthedRequest, res) => {
  try {
    const days = await ChatMessage.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: '$day',
          count: { $sum: 1 },
          lastCreatedAt: { $max: '$createdAt' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 7 },
    ]);

    res.json(
      days.map((d: any) => ({
        day: d._id,
        count: d.count,
        lastCreatedAt: d.lastCreatedAt,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка загрузки списка дней чата' });
  }
});

aiRouter.post('/analyze-food', async (req: AuthedRequest, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'image (base64) обязателен' });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: image,
            },
          },
          {
            text:
              'Проанализируй это фото еды. Определи название блюда на русском языке, ' +
              'оцени калорийность и КБЖУ (белки, жиры, углеводы) для показанной порции, ' +
              'оценку полезности 1–10, краткое объяснение и рекомендацию. ' +
              'Верни JSON с полями name, calories, protein, fat, carbs, rating, ratingDescription, recommendation.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            rating: { type: Type.NUMBER },
            ratingDescription: { type: Type.STRING },
            recommendation: { type: Type.STRING },
          },
          required: [
            'name',
            'calories',
            'protein',
            'fat',
            'carbs',
            'rating',
            'ratingDescription',
            'recommendation',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) return res.status(500).json({ error: 'Пустой ответ ИИ' });

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка анализа еды' });
  }
});