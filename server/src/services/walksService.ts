import { GoogleGenAI } from '@google/genai';

export interface WalkingRoute {
  title: string;
  description: string;
  estimatedSteps: number;
  durationMinutes: number;
  distanceKm: number;
  startLocation: string;
  endLocation: string;
  isRoundTrip?: boolean;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// --- Address Validation ---
export const validateAddress = async (input: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Исправь и нормализуй этот адрес (на русском). Если это не адрес, верни NULL.
      Ввод: "${input}"
      Верни ТОЛЬКО полный корректный адрес одной строкой без кавычек.`,
    });
    const text = response.text?.trim();
    if (!text || text === 'NULL') return null;
    return text;
  } catch (e) {
    console.error('validateAddress error', e);
    return null;
  }
};

// --- Walking Routes Generation ---
export const suggestWalkingRoutes = async (
  lat: number | null,
  lng: number | null,
  stepsNeeded: number,
  mode: 'nearby' | 'direct' | 'custom_address',
  customAddress?: string,
): Promise<WalkingRoute[]> => {
  try {
    const distanceKm = (stepsNeeded * 0.7) / 1000; // ~0.7m per step
    const targetKm = Math.max(1, distanceKm);
    const halfTargetKm = targetKm / 2;

    let locationInstruction = '';
    if (mode === 'custom_address' && customAddress) {
      locationInstruction = `СТАРТОВАЯ ТОЧКА: Адрес "${customAddress}".`;
    } else if (lat && lng) {
      locationInstruction = `СТАРТОВАЯ ТОЧКА: Координаты ${lat}, ${lng}.`;
    } else {
      locationInstruction = 'Местоположение неизвестно, используй центр Москвы.';
    }

    const prompt = `
      Ты профессиональный гид-навигатор. Твоя задача - создать ровно 4 РАЗНЫХ пешеходных маршрута для пользователя.
      
      ${locationInstruction}
      
      ОБЩАЯ ЦЕЛЬ ДИСТАНЦИИ: Пройти ${targetKm.toFixed(1)} км (примерно ${stepsNeeded} шагов).
      
      ИНСТРУКЦИИ ПО РЕЖИМАМ (СТРОГО):
      
      Режим: ${mode}
      
      1. Если режим 'nearby' (Рядом):
         - Найди 4 ближайших парка или сквера.
         - Маршрут: От [Старт] до [Вход в парк] и прогулка внутри.
         - "isRoundTrip": false
      
      2. Если режим 'direct' (От меня) или 'custom_address' (От адреса):
         - Сгенерируй ПЕРВЫЕ 3 маршрута как КРУГОВЫЕ (Туда-Обратно).
           Точка Б должна быть на расстоянии ~${halfTargetKm.toFixed(1)} км от старта.
           Пользователь идет: Старт -> Точка Б -> Старт.
           
         - Сгенерируй 4-й маршрут как ПРЯМОЙ (В одну сторону).
           Точка Б должна быть на расстоянии ~${targetKm.toFixed(1)} км от старта.
           Пользователь идет: Старт -> Точка Б.
      
      ВАЖНОЕ ПРАВИЛО "ТОЧКИ Б":
      - Если это жилой район, выбери в качестве Точки Б: школу, ТЦ, станцию метро, памятник или перекресток крупных улиц.
      - "endLocation" НЕ ДОЛЖЕН совпадать со "startLocation". Это должна быть другая точка.
      - "title" придумай красивый, например "Прогулка до парка..." или "Круг через площадь...".

      Верни СТРОГО валидный JSON массив из 4 объектов.
      ОТВЕТ ДОЛЖЕН БЫТЬ ТОЛЬКО JSON. БЕЗ MARKDOWN.

      Формат:
      [
        {
          "title": "Название маршрута",
          "description": "Краткое описание (например: дойдите до X, поверните к Y...)",
          "estimatedSteps": ${stepsNeeded},
          "durationMinutes": ${Math.round(targetKm * 12)},
          "distanceKm": ${targetKm.toFixed(1)},
          "startLocation": "Адрес старта (как в запросе)",
          "endLocation": "Адрес финиша/разворота",
          "isRoundTrip": true/false
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: lat && lng ? {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng,
            },
          },
        } : undefined,
      },
    });

    const text = response.text;
    if (!text) return [];

    let cleanText = text.trim();

    const startIndex = cleanText.indexOf('[');
    const endIndex = cleanText.lastIndexOf(']');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      cleanText = cleanText.substring(startIndex, endIndex + 1);
    } else {
      console.warn('AI did not return a valid JSON array bracket block', text);
      return [];
    }

    try {
      let routes = JSON.parse(cleanText) as WalkingRoute[];

      if (mode === 'direct' || mode === 'custom_address') {
        routes = routes.map((r, index) => {
          const shouldBeRoundTrip = index < 3;
          const fixedTitle = r.title === r.startLocation ? `Прогулка до ${r.endLocation}` : r.title;
          return {
            ...r,
            title: fixedTitle,
            isRoundTrip: shouldBeRoundTrip,
          };
        });
      }

      return routes;
    } catch (e) {
      console.error('JSON parse error in suggestWalkingRoutes', e, cleanText);
      return [];
    }
  } catch (error) {
    console.error('Walking routes error:', error);
    return [];
  }
};
