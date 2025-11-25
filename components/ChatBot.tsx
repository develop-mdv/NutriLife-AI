import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Input, LoadingSpinner } from './UI';
import { sendChatMessage, LiveClient } from '../services/geminiService';
import { Macros, UserProfile, FoodEntry } from '../types';

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
}

export const ChatBot: React.FC<ChatBotProps> = ({ 
  userProfile, 
  todayMacros, 
  foodHistory,
  waterIntake,
  activityCalories 
}) => {
  const [mode, setMode] = useState<'text' | 'live'>('text');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: 'Привет! Я твой ИИ-тренер по здоровью. Я вижу твои данные и историю. Спрашивай меня о питании, тренировках, или найди места поблизости (спортзалы, магазины)!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | undefined>();
  
  // Live Client Ref
  const liveClientRef = useRef<LiveClient | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    context += `Имя: ${userProfile.name}, Возраст: ${userProfile.age}, Цель: ${userProfile.goal === 'lose_weight' ? 'Похудение' : userProfile.goal === 'gain_muscle' ? 'Набор массы' : 'Поддержание'}.\n`;
    
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
    return context;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const newMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    
    // Pass user context separately
    const context = getUserContext();
    const response = await sendChatMessage(history, input, location, context);
    
    setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: response.text, 
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
      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="font-bold text-xl text-gray-800">Ассистент здоровья</h2>
        <button 
          onClick={toggleLiveMode}
          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${mode === 'live' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600'}`}
        >
          {mode === 'live' && <span className="w-2 h-2 bg-white rounded-full"></span>}
          {mode === 'live' ? 'Голос' : 'Чат'}
        </button>
      </div>

      {mode === 'live' ? (
         <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl p-8 text-white shadow-inner">
           <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isLiveConnected ? 'bg-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.4)] scale-110' : 'bg-gray-700'}`}>
              <div className={`w-24 h-24 rounded-full bg-red-500 flex items-center justify-center ${isLiveConnected ? 'animate-pulse' : 'opacity-50'}`}>
                 <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
              </div>
           </div>
           <div className="text-center">
             <h3 className="text-2xl font-bold mb-2">{isLiveConnected ? "Слушаю..." : "Подключение..."}</h3>
             <p className="text-gray-400">Говорите естественно. Я здесь, чтобы помочь.</p>
           </div>
           <Button variant="outline" onClick={toggleLiveMode} className="border-white/20 text-white hover:bg-white/10 hover:text-white">
             Завершить
           </Button>
         </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-4 p-2 no-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
                {/* Render Grounding Chips */}
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                   <div className="mt-2 flex flex-wrap gap-2 max-w-[90%]">
                      {msg.groundingChunks.map((chunk, idx) => {
                         if (chunk.web) {
                            return (
                               <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100 truncate max-w-[200px] block hover:bg-blue-100 flex items-center gap-1">
                                  🔗 {chunk.web.title}
                               </a>
                            )
                         }
                         if (chunk.maps) {
                            return (
                                <a key={idx} href={chunk.maps.webUri || chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-100 flex items-center gap-1 hover:bg-red-100">
                                   📍 {chunk.maps.title || "Место на карте"}
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
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="pt-4 flex gap-2">
            <Input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Спроси о диете, или найди магазин..." 
              className="flex-1"
            />
            <Button onClick={handleSend} className="px-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};