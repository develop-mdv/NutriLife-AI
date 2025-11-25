import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality } from "@google/genai";
import { Macros, RoadmapStep } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// --- Food Analysis ---

export const analyzeFoodImage = async (base64Image: string): Promise<{
  name: string;
  macros: Macros;
  rating: number;
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
            text: "Проанализируй это фото еды. Определи название блюда на русском языке, оцени калорийность, белки (г), жиры (г) и углеводы (г) для показанной порции. Оцени полезность от 1 до 10 (10 — самое полезное) и дай краткую рекомендацию на русском языке.",
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
            recommendation: { type: Type.STRING },
          },
          required: ["name", "calories", "protein", "fat", "carbs", "rating", "recommendation"],
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
    const mapKeywords = ['где', 'карта', 'рядом', 'найти', 'адрес', 'маршрут', 'магазин', 'зал', 'аптека', 'больница', 'парк', 'ресторан', 'кафе'];

    const lowerMsg = (message || "").toLowerCase();
    const needsSearch = searchKeywords.some(k => lowerMsg.includes(k));
    const needsMaps = mapKeywords.some(k => lowerMsg.includes(k));

    const tools: any[] = [];
    if (needsSearch) tools.push({ googleSearch: {} });
    if (needsMaps) tools.push({ googleMaps: {} });

    // Switch to gemini-2.5-flash if tools are needed for better grounding support and speed
    const model = (needsSearch || needsMaps) ? "gemini-2.5-flash" : "gemini-3-pro-preview";

    const systemInstruction = "Ты полезный и мотивирующий тренер по питанию и фитнесу. Отвечай кратко и на русском языке. Если используешь поиск или карты, используй эту информацию для ответа." + (context ? `\n\nКонтекст пользователя и история:\n${context}` : "");

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

export const generateWellnessRoadmap = async (userProfile: any, wishes?: string): Promise<RoadmapStep[]> => {
  try {
    const prompt = `Создай план оздоровления из 5 конкретных шагов для пользователя.
    Данные профиля: ${JSON.stringify(userProfile)}.
    Основная цель: ${userProfile.goal}.
    ${wishes ? `ОСОБЫЕ ПОЖЕЛАНИЯ ПОЛЬЗОВАТЕЛЯ (УЧТИ ОБЯЗАТЕЛЬНО): ${wishes}` : ""}
    
    Верни JSON массив. Каждый шаг должен содержать 'title' (краткий заголовок), 'description' (конкретное действие) и 'status' (всегда "pending").
    Язык: Русский.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as RoadmapStep[];
  } catch (error) {
    console.error("Roadmap generation failed", error);
    return [];
  }
}

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
    
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
      this.inputAudioContext.close();
    }
    
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      this.outputAudioContext.close();
    }

    this.scriptProcessor?.disconnect();
  }
}