import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const aiRouter = Router();
aiRouter.use(requireAuth);

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

    const model = needsSearch || needsMaps ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';

    let systemInstruction =
      'Ты полезный и мотивирующий тренер по питанию, сну и фитнесу. Отвечай кратко и на русском языке. ' +
      'Если используешь поиск или карты, используй эту информацию для ответа. ' +
      'Если пользователь просит поставить будильник, подтверди, что ты обновил настройки (но само действие выполняется приложением).';

    // Инструкция по изменению плана (как в web-версии)
    systemInstruction +=
      '\n\nЕсли пользователь просит изменить план или стратегию (roadmap) и ты согласен с изменениями, ' +
      'в конце своего ответа добавь специальный тег: [UPDATE_PLAN: описание изменений]. ' +
      'Приложение увидит этот тег и обновит план.';

    if (context) {
      systemInstruction += `\n\nКонтекст пользователя и история:\n${context}`;
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

    const resp = await chat.sendMessage({ message });
    res.json({
      text: resp.text || 'Не удалось сгенерировать ответ.',
      groundingChunks: (resp as any).candidates?.[0]?.groundingMetadata?.groundingChunks,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка чата' });
  }
});

aiRouter.post('/analyze-food', async (req: AuthedRequest, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'image (base64) обязателен' });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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