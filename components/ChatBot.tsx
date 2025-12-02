
import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Input, LoadingSpinner, MarkdownText } from './UI';
import { sendChatMessage, LiveClient } from '../services/geminiService';
import { Macros, UserProfile, FoodEntry, SleepEntry, SleepConfig } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isAudio?: boolean;
  groundingChunks?: any[];
}

interface ChatBotProps {
  userProfile?: UserProfile;
  todayMacros?: Macros;
  foodHistory?: FoodEntry[];
  waterIntake?: number;
  activityCalories?: number;
  sleepData?: SleepEntry;
  sleepConfig?: SleepConfig;
  onSetAlarm?: (time: string) => void;
  onUpdateRoadmap?: (wishes: string) => Promise<void>;
}

export const ChatBot: React.FC<ChatBotProps> = ({ 
  userProfile, 
  todayMacros, 
  foodHistory,
  waterIntake,
  activityCalories,
  sleepData,
  sleepConfig,
  onSetAlarm,
  onUpdateRoadmap
}) => {
  const [mode, setMode] = useState<'text' | 'live'>('text');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Привет! Я твой ИИ-тренер по здоровью. Я вижу твои данные по питанию, сну и активности. Спрашивай меня о чем угодно!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | undefined>();
  const [updatingPlan, setUpdatingPlan] = useState(false);
  
  // Live Client Ref
  const liveClientRef = useRef<LiveClient | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, updatingPlan]);

  // Request Location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log("Geolocation error", error),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Clean up live client on unmount
  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
    };
  }, []);

  // Helper to generate context string
  const getUserContext = () => {
    if (!userProfile) return "";
    let context = `Данные пользователя:\n`;
    context += `Имя: ${userProfile.name}, Возраст: ${userProfile.age}, Рост: ${userProfile.height}, Вес: ${userProfile.weight}, Цель: ${userProfile.goal === 'lose_weight' ? 'Похудение' : userProfile.goal === 'gain_muscle' ? 'Набор массы' : 'Поддержание'}.\n`;
    
    if (userProfile.allergies) context += `Аллергии: ${userProfile.allergies}\n`;
    if (userProfile.preferences) context += `Предпочтения: ${userProfile.preferences}\n`;
    if (userProfile.healthConditions) context += `Здоровье: ${userProfile.healthConditions}\n`;
    
    if (todayMacros) {
      context += `Питание сегодня (КБЖУ): ${Math.round(todayMacros.calories)} ккал (Б:${Math.round(todayMacros.protein)}, Ж:${Math.round(todayMacros.fat)}, У:${Math.round(todayMacros.carbs)}).\n`;
    }
    
    if (foodHistory && foodHistory.length > 0) {
       // Take last 10 entries for context to avoid huge prompt
       const recentMeals = foodHistory.slice(-10).map(f => `${f.name} (${Math.round(f.macros.calories)} ккал)`).join('; ');
       context += `Недавние приемы пищи: ${recentMeals}.\n`;
    }

    if (waterIntake !== undefined) {
       context += `Воды выпито сегодня: ${waterIntake} мл.\n`;
    }
    
    if (activityCalories !== undefined) {
       context += `Сожжено активностью сегодня: ${activityCalories} ккал.\n`;
    }

    if (sleepData) {
       context += `Последний сон: ${sleepData.durationHours} часов, качество: ${sleepData.quality}/10.\n`;
    }

    if (sleepConfig) {
       context += `Настройки сна: Цель ${sleepConfig.targetHours}ч, Отбой: ${sleepConfig.bedTime}, Будильник: ${sleepConfig.wakeTime} (${sleepConfig.wakeAlarmEnabled ? 'Вкл' : 'Выкл'}).\n`;
    }
    return context;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // --- ALARM CHECK (Client Side Intent Detection) ---
    const alarmRegex = /(?:будильник|разбуди|подъем).+?(\d{1,2})[:.](\d{2})/i;
    const match = userMsg.text.match(alarmRegex);
    
    if (match && onSetAlarm) {
        const h = match[1].padStart(2, '0');
        const m = match[2].padStart(2, '0');
        const timeStr = `${h}:${m}`;
        
        onSetAlarm(timeStr);
        
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: `Готово! Я установил будильник на **${timeStr}**. Не забудьте оставить вкладку открытой, чтобы я мог вас разбудить.`
            }]);
            setLoading(false);
        }, 1000);
        return; 
    }

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    
    // Pass user context separately
    const context = getUserContext();
    const response = await sendChatMessage(history, userMsg.text, location, context);
    
    // Check for Plan Update Tag
    const updateMatch = response.text.match(/\[UPDATE_PLAN:\s*(.*?)\]/);
    let displayText = response.text;
    
    if (updateMatch && onUpdateRoadmap) {
        const updateDescription = updateMatch[1];
        // Remove the tag from display text
        displayText = displayText.replace(updateMatch[0], "").trim();
        
        setMessages(prev => [...prev, { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: displayText, 
            groundingChunks: response.groundingChunks 
        }]);
        setLoading(false);

        // Trigger update
        setUpdatingPlan(true);
        try {
            await onUpdateRoadmap(updateDescription);
            setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: 'model',
                text: "**✅ План успешно обновлен!** Зайдите в профиль, чтобы увидеть новую стратегию."
            }]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                role: 'model',
                text: "❌ Не удалось обновить план. Попробуйте еще раз."
            }]);
        } finally {
            setUpdatingPlan(false);
        }
        return;
    }
    
    setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: displayText, 
        groundingChunks: response.groundingChunks 
    }]);
    setLoading(false);
  };

  const toggleLiveMode = async () => {
    if (mode === 'text') {
      setMode('live');
      const client = new LiveClient();
      liveClientRef.current = client;
      try {
        await client.connect(() => {
          setIsLiveConnected(false);
          setMode('text');
        }, getUserContext());
        setIsLiveConnected(true);
      } catch (e) {
        console.error("Failed to connect live", e);
        setMode('text');
      }
    } else {
      liveClientRef.current?.disconnect();
      setIsLiveConnected(false);
      setMode('text');
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center mb-6 px-2">
        <div>
           <h2 className="font-bold text-2xl text-gray-900">Ассистент</h2>
           <p className="text-gray-500 text-sm">Ваш персональный ИИ-тренер</p>
        </div>
        <button 
          onClick={toggleLiveMode}
          className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-md ${mode === 'live' ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse shadow-red-200' : 'bg-white text-gray-700 border border-gray-100'}`}
        >
          {mode === 'live' && <span className="w-2 h-2 bg-white rounded-full"></span>}
          {mode === 'live' ? 'Голос' : 'Чат'}
        </button>
      </div>

      {mode === 'live' ? (
         <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
           
           <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 relative z-10 ${isLiveConnected ? 'bg-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.4)] scale-110' : 'bg-gray-700/50'}`}>
              <div className={`w-24 h-24 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center shadow-lg ${isLiveConnected ? 'animate-pulse' : 'opacity-80 grayscale'}`}>
                 <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
              </div>
           </div>
           
           <div className="text-center relative z-10">
             <h3 className="text-3xl font-bold mb-2 tracking-tight">{isLiveConnected ? "Слушаю..." : "Подключение..."}</h3>
             <p className="text-gray-400 font-medium">Говорите свободно. Я понимаю контекст.</p>
           </div>
           
           <Button variant="outline" onClick={toggleLiveMode} className="border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur-sm relative z-10">
             Завершить сеанс
           </Button>
         </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-6 p-2 no-scrollbar pb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-4 sm:p-5 text-sm shadow-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-2xl rounded-br-none bg-gradient-to-br from-emerald-400 to-teal-500' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-none'
                }`}>
                  <MarkdownText text={msg.text} className={msg.role === 'user' ? 'text-white' : ''} />
                </div>
                
                {/* Grounding Chips */}
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                   <div className="mt-2 flex flex-wrap gap-2 max-w-[90%] animate-in fade-in slide-in-from-top-2">
                      {msg.groundingChunks.map((chunk, idx) => {
                         if (chunk.web) {
                            return (
                               <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-white text-blue-600 px-3 py-1.5 rounded-xl border border-blue-100 truncate max-w-[200px] block hover:bg-blue-50 hover:shadow-sm transition-all flex items-center gap-1.5">
                                  <span>🔗</span> <span className="truncate">{chunk.web.title}</span>
                               </a>
                            )
                         }
                         if (chunk.maps) {
                            return (
                                <a key={idx} href={chunk.maps.webUri || chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-white text-red-600 px-3 py-1.5 rounded-xl border border-red-100 flex items-center gap-1.5 hover:bg-red-50 hover:shadow-sm transition-all">
                                   <span>📍</span> <span>{chunk.maps.title || "Место на карте"}</span>
                                </a>
                            )
                         }
                         return null;
                      })}
                   </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            
            {updatingPlan && (
                <div className="flex justify-center p-4">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-lg animate-pulse">
                        <LoadingSpinner /> 
                        <span className="font-bold text-sm">Обновляю ваш план...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="pt-2 flex gap-3 items-center bg-gray-50">
            <Input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Сообщение..." 
              className="flex-1 shadow-sm border-0 focus:ring-0"
              disabled={updatingPlan}
            />
            <Button onClick={handleSend} disabled={updatingPlan} className="w-12 h-12 !p-0 rounded-full !min-w-0 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
