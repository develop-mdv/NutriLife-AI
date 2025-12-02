
import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality } from "@google/genai";
import { Macros, RoadmapStep, WalkingRoute, RoadmapTargets } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// --- Food Analysis ---

export const analyzeFoodImage = async (base64Image: string): Promise<{
  name: string;
  macros: Macros;
  rating: number;
  ratingDescription: string;
  recommendation: string;
}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Проанализируй это фото еды. Определи название блюда на русском языке, оцени калорийность, белки (г), жиры (г) и углеводы (г) для показанной порции. Оцени полезность от 1 до 10 (10 — самое полезное). В поле ratingDescription объясни, почему поставлена такая оценка (опираясь на состав и КБЖУ). Дай краткую рекомендацию.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
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
          required: ["name", "calories", "protein", "fat", "carbs", "rating", "ratingDescription", "recommendation"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const result = JSON.parse(text);
    
    return {
      name: result.name,
      macros: {
        calories: result.calories,
        protein: result.protein,
        fat: result.fat,
        carbs: result.carbs,
      },
      rating: result.rating,
      ratingDescription: result.ratingDescription,
      recommendation: result.recommendation,
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

// --- Chat Bot (Text) ---

export interface ChatResponse {
  text: string;
  groundingChunks?: any[];
}

export const sendChatMessage = async (
  history: {role: string, parts: {text: string}[]}[], 
  message: string,
  location?: { lat: number, lng: number },
  context?: string
): Promise<ChatResponse> => {
  try {
    // Keywords to trigger tools
    const searchKeywords = ['новости', 'поиск', 'найди', 'инфо', 'рецепт', 'исследование', 'цена', 'сколько', 'кто', 'когда', 'погода', 'состав'];
    const mapKeywords = ['где', 'карта', 'рядом', 'найти', 'адрес', 'маршрут', 'магазин', 'зал', 'аптека', 'больница', 'парк', 'ресторан', 'кафе', 'прогулка', 'маршрут'];

    const lowerMsg = (message || "").toLowerCase();
    const needsSearch = searchKeywords.some(k => lowerMsg.includes(k));
    const needsMaps = mapKeywords.some(k => lowerMsg.includes(k));

    const tools: any[] = [];
    if (needsSearch) tools.push({ googleSearch: {} });
    if (needsMaps) tools.push({ googleMaps: {} });

    // Switch to gemini-2.5-flash if tools are needed for better grounding support and speed
    const model = (needsSearch || needsMaps) ? "gemini-2.5-flash" : "gemini-3-pro-preview";

    let systemInstruction = "Ты полезный и мотивирующий тренер по питанию, сну и фитнесу. Отвечай кратко и на русском языке. Если используешь поиск или карты, используй эту информацию для ответа. Если пользователь просит поставить будильник, подтверди, что ты обновил настройки (но само действие выполняется приложением).";
    
    // Add command instruction for roadmap updates
    systemInstruction += "\n\nЕсли пользователь просит изменить план или стратегию (roadmap) и ты согласен с изменениями, в конце своего ответа добавь специальный тег: [UPDATE_PLAN: описание изменений]. Приложение увидит этот тег и обновит план.";
    
    if (context) {
        systemInstruction += `\n\nКонтекст пользователя и история:\n${context}`;
    }

    const chat = ai.chats.create({
      model: model,
      history: history,
      config: {
        systemInstruction: systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: (needsMaps && location) ? {
            retrievalConfig: {
                latLng: {
                    latitude: location.lat,
                    longitude: location.lng
                }
            }
        } : undefined
      }
    });

    const response = await chat.sendMessage({
      message: message
    });

    return {
        text: response.text || "Не удалось сгенерировать ответ.",
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Chat error:", error);
    return { text: "Извините, возникли проблемы с подключением к серверу." };
  }
};

// --- Roadmap Generation ---

export const generateWellnessRoadmap = async (userProfile: any, wishes?: string): Promise<{steps: RoadmapStep[], targets: RoadmapTargets} | null> => {
  try {
    const prompt = `Создай план оздоровления из 5 конкретных шагов для пользователя.
    
    Данные профиля:
    - Цель: ${userProfile.goal}
    - Возраст: ${userProfile.age}, Вес: ${userProfile.weight}, Рост: ${userProfile.height}, Пол: ${userProfile.gender}, Активность: ${userProfile.activityLevel}
    ${userProfile.allergies ? `- Аллергии: ${userProfile.allergies}` : ""}
    ${userProfile.preferences ? `- Предпочтения в еде: ${userProfile.preferences}` : ""}
    ${userProfile.healthConditions ? `- Ограничения здоровья: ${userProfile.healthConditions}` : ""}
    
    ЗАДАЧА 1: Рассчитай конкретные целевые показатели (targets) на день:
    - dailyCalories: Используй формулу Миффлина-Сан Жеора с учетом активности и цели.
    - dailyWater: Рекомендуемый объем воды в мл (обычно 30-35 мл на кг).
    - dailySteps: Рекомендуемое количество шагов (например, 7000-12000).
    - sleepHours: Рекомендуемая продолжительность сна (обычно 7-9).
    
    ЗАДАЧА 2: Составь план (steps) из 5 пунктов.
    ВКЛЮЧИ в план хотя бы один пункт, касающийся РЕЖИМА СНА и восстановления, если это уместно.
    
    ${wishes ? `ОСОБЫЕ ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ (УЧТИ ОБЯЗАТЕЛЬНО): ${wishes}` : ""}
    
    Верни JSON объект.
    Язык: Русский.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             targets: {
                 type: Type.OBJECT,
                 properties: {
                     dailyCalories: { type: Type.NUMBER },
                     dailyWater: { type: Type.NUMBER },
                     dailySteps: { type: Type.NUMBER },
                     sleepHours: { type: Type.NUMBER }
                 },
                 required: ["dailyCalories", "dailyWater", "dailySteps", "sleepHours"]
             },
             steps: {
                 type: Type.ARRAY,
                 items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ["pending"] }
                    },
                    required: ["title", "description", "status"]
                 }
             }
          },
          required: ["targets", "steps"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Roadmap generation failed", error);
    return null;
  }
}

// --- Address Validation ---
export const validateAddress = async (input: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Исправь и нормализуй этот адрес (на русском). Если это не адрес, верни NULL.
            Ввод: "${input}"
            Верни ТОЛЬКО полный корректный адрес одной строкой без кавычек.`
        });
        const text = response.text?.trim();
        if (!text || text === "NULL") return null;
        return text;
    } catch (e) {
        return null;
    }
}

// --- Walking Routes Generation ---

export const suggestWalkingRoutes = async (
  lat: number | null, 
  lng: number | null, 
  stepsNeeded: number,
  mode: 'nearby' | 'direct' | 'custom_address',
  customAddress?: string
): Promise<WalkingRoute[]> => {
  try {
    const distanceKm = (stepsNeeded * 0.7) / 1000; // Approx 0.7m per step
    const targetKm = Math.max(1, distanceKm); // At least 1km
    const halfTargetKm = targetKm / 2; // For round trips

    let locationInstruction = "";
    if (mode === 'custom_address' && customAddress) {
      locationInstruction = `СТАРТОВАЯ ТОЧКА: Адрес "${customAddress}".`;
    } else if (lat && lng) {
      locationInstruction = `СТАРТОВАЯ ТОЧКА: Координаты ${lat}, ${lng}.`;
    } else {
      locationInstruction = "Местоположение неизвестно, используй центр Москвы.";
    }

    // Creating a more explicit prompt to force valid A-to-B routing
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
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: (lat && lng) ? {
            retrievalConfig: {
                latLng: {
                    latitude: lat,
                    longitude: lng
                }
            }
        } : undefined,
      }
    });

    const text = response.text;
    if (!text) return [];

    let cleanText = text.trim();
    
    // Robust extraction of JSON array
    const startIndex = cleanText.indexOf('[');
    const endIndex = cleanText.lastIndexOf(']');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        cleanText = cleanText.substring(startIndex, endIndex + 1);
    } else {
        console.warn("AI did not return a valid JSON array bracket block", text);
        return [];
    }
    
    try {
        let routes = JSON.parse(cleanText) as WalkingRoute[];
        
        // --- STRICT POST-PROCESSING ENFORCEMENT ---
        if (mode === 'direct' || mode === 'custom_address') {
            // Ensure we have 4 routes if possible, or work with what we have
            routes = routes.map((r, index) => {
                // Force first 3 to be round trip, 4th to be one way
                const shouldBeRoundTrip = index < 3; 
                
                // If AI made endLocation same as start, try to fix title, but we rely on map link mainly
                const fixedTitle = r.title === r.startLocation ? `Прогулка до ${r.endLocation}` : r.title;

                return {
                    ...r,
                    title: fixedTitle,
                    isRoundTrip: shouldBeRoundTrip
                };
            });
        }
        
        return routes;
    } catch (e) {
        console.error("JSON Parse error", e, cleanText);
        return [];
    }
    
  } catch (error) {
    console.error("Walking routes error:", error);
    return [];
  }
};

// --- Live API (Audio) ---

// Audio Helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class LiveClient {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private sessionPromise: Promise<any> | null = null;
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;

  async connect(onClose: () => void, userContext?: string) {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    
    // Resume contexts if suspended (browser policy)
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const systemInstruction = "Ты энергичный персональный тренер и диетолог. Отвечай кратко, ободряюще и на русском языке." + (userContext ? ` Контекст пользователя: ${userContext}` : "");

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log("Live Session Open");
          if (!this.inputAudioContext || !this.stream) return;
          
          const source = this.inputAudioContext.createMediaStreamSource(this.stream);
          this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          this.scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            this.sessionPromise?.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          source.connect(this.scriptProcessor);
          this.scriptProcessor.connect(this.inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          
          if (base64Audio && this.outputAudioContext) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            
            const audioBuffer = await decodeAudioData(
              decode(base64Audio),
              this.outputAudioContext,
              24000,
              1
            );
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputAudioContext.destination);
            
            source.addEventListener('ended', () => {
              this.sources.delete(source);
            });
            
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }
          
          if (message.serverContent?.interrupted) {
             this.sources.forEach(s => s.stop());
             this.sources.clear();
             this.nextStartTime = 0;
          }
        },
        onclose: () => {
          console.log("Live Session Closed");
          onClose();
        },
        onerror: (e) => {
          console.error("Live Session Error", e);
          onClose();
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        systemInstruction: systemInstruction,
      }
    });
  }

  disconnect() {
    this.sessionPromise?.then(session => session.close());
    this.stream?.getTracks().forEach(t => t.stop());
    
    // Check state before closing to prevent "Cannot close a closed AudioContext"
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      this.inputAudioContext.close();
    }
    
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      this.outputAudioContext.close();
    }

    this.scriptProcessor?.disconnect();
  }
}
