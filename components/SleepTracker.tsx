
import React, { useState } from 'react';
import { Card, Button, Input, ProgressBar } from './UI';
import { SleepEntry, SleepConfig } from '../types';

interface SleepTrackerProps {
  onSaveEntry: (entry: SleepEntry) => void;
  config: SleepConfig;
  onUpdateConfig: (config: SleepConfig) => void;
  onClose: () => void;
  entries: SleepEntry[];
}

export const SleepTracker: React.FC<SleepTrackerProps> = ({ 
  onSaveEntry, 
  config, 
  onUpdateConfig, 
  onClose,
  entries 
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'settings' | 'tips'>('log');
  
  // Log State
  const [duration, setDuration] = useState(7.5);
  const [quality, setQuality] = useState(7);
  const [isLoggedToday, setIsLoggedToday] = useState(false);

  // Tips (Static for now, could be dynamic)
  const tips = [
    { title: "Режим - это ключ", text: "Ложитесь и вставайте в одно и то же время, даже в выходные." },
    { title: "Цифровой детокс", text: "Убирайте телефон за час до сна. Синий свет мешает выработке мелатонина." },
    { title: "Температура", text: "Идеальная температура для сна — 18-20°C." },
    { title: "Кофеин", text: "Избегайте кофеина после 14:00." }
  ];

  const handleSave = () => {
    onSaveEntry({
      id: Date.now().toString(),
      durationHours: Number(duration),
      quality: Number(quality),
      timestamp: Date.now()
    });
    setIsLoggedToday(true);
  };

  const handleToggleAlarm = () => {
    if (!config.wakeAlarmEnabled && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    onUpdateConfig({...config, wakeAlarmEnabled: !config.wakeAlarmEnabled});
  };

  const handleToggleReminder = () => {
    if (!config.bedTimeReminderEnabled && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    onUpdateConfig({...config, bedTimeReminderEnabled: !config.bedTimeReminderEnabled});
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-2">
         <div>
            <h1 className="text-2xl font-bold text-gray-900 text-indigo-900">Сон и Восстановление 🌙</h1>
            <p className="text-gray-500 text-sm">Качество сна влияет на все аспекты жизни</p>
         </div>
         <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
             <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-indigo-50 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('log')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'log' ? 'bg-white shadow text-indigo-900' : 'text-indigo-400'}`}
        >
          Дневник
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white shadow text-indigo-900' : 'text-indigo-400'}`}
        >
          Будильник
        </button>
        <button 
          onClick={() => setActiveTab('tips')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'tips' ? 'bg-white shadow text-indigo-900' : 'text-indigo-400'}`}
        >
          Советы
        </button>
      </div>

      {/* LOG TAB */}
      {activeTab === 'log' && (
        <div className="space-y-6">
           {isLoggedToday ? (
               <div className="bg-green-50 p-6 rounded-2xl text-center border border-green-100">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   </div>
                   <h3 className="font-bold text-green-800 text-lg">Данные записаны!</h3>
                   <p className="text-green-600 text-sm">Сладких снов на следующую ночь.</p>
               </div>
           ) : (
             <Card className="bg-indigo-50/50 border-indigo-100">
                <h3 className="font-bold text-indigo-900 mb-4 text-lg">Как вы спали?</h3>
                
                <div className="mb-6">
                   <div className="flex justify-between mb-2">
                       <label className="text-xs text-indigo-800 font-bold uppercase">Длительность</label>
                       <span className="font-bold text-indigo-600 text-lg">{duration} ч.</span>
                   </div>
                   <input 
                      type="range" 
                      min="3" 
                      max="12" 
                      step="0.5" 
                      value={duration} 
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                   />
                </div>

                <div className="mb-6">
                   <div className="flex justify-between mb-2">
                       <label className="text-xs text-indigo-800 font-bold uppercase">Качество (1-10)</label>
                       <span className="font-bold text-indigo-600 text-lg">{quality}/10</span>
                   </div>
                   <div className="flex justify-between gap-1">
                      {[1,2,3,4,5,6,7,8,9,10].map(v => (
                          <button 
                             key={v}
                             onClick={() => setQuality(v)}
                             className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${quality === v ? 'bg-indigo-600 text-white shadow-md scale-110' : 'bg-white text-indigo-300 hover:bg-indigo-100'}`}
                          >
                             {v}
                          </button>
                      ))}
                   </div>
                </div>

                <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200">
                    Сохранить запись
                </Button>
             </Card>
           )}

           <div>
              <h3 className="font-bold text-gray-800 mb-3 ml-1">История сна</h3>
              {entries.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">Нет записей</p>
              ) : (
                  <div className="space-y-3">
                      {entries.slice(-5).reverse().map(e => (
                          <div key={e.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                              <div>
                                  <div className="font-bold text-gray-800">{e.durationHours} часов</div>
                                  <div className="text-xs text-gray-400">{new Date(e.timestamp).toLocaleDateString()}</div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold ${e.quality >= 7 ? 'bg-green-100 text-green-700' : e.quality >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  Качество: {e.quality}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
           </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
         <div className="space-y-4">
            <Card className="border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Утренний будильник</h3>
                            <p className="text-xs text-gray-500">Сигнал для пробуждения</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.wakeAlarmEnabled} onChange={handleToggleAlarm} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
                <div className="flex items-center gap-4">
                    <input 
                        type="time" 
                        value={config.wakeTime}
                        onChange={(e) => onUpdateConfig({...config, wakeTime: e.target.value})}
                        className="text-3xl font-bold bg-transparent focus:outline-none text-indigo-900 border-b-2 border-indigo-100 focus:border-indigo-500 transition-colors"
                    />
                    <span className="text-sm text-gray-400">время подъема</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">* Будильник сработает как уведомление браузера. Держите вкладку открытой.</p>
            </Card>

            <Card className="border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Напоминание о сне</h3>
                            <p className="text-xs text-gray-500">Пора готовиться ко сну</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.bedTimeReminderEnabled} onChange={handleToggleReminder} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
                <div className="flex items-center gap-4">
                    <input 
                        type="time" 
                        value={config.bedTime}
                        onChange={(e) => onUpdateConfig({...config, bedTime: e.target.value})}
                        className="text-3xl font-bold bg-transparent focus:outline-none text-purple-900 border-b-2 border-purple-100 focus:border-purple-500 transition-colors"
                    />
                    <span className="text-sm text-gray-400">время отбоя</span>
                </div>
            </Card>

            <Card>
                <label className="text-xs text-gray-500 uppercase font-bold">Цель сна (часов)</label>
                <div className="flex items-center gap-4 mt-2">
                    <input 
                        type="number" 
                        value={config.targetHours}
                        onChange={(e) => onUpdateConfig({...config, targetHours: Number(e.target.value)})}
                        className="w-20 text-2xl font-bold text-gray-800 bg-gray-50 rounded-lg p-2 text-center"
                    />
                    <span className="text-gray-400 text-sm">часов/ночь</span>
                </div>
            </Card>
         </div>
      )}

      {/* TIPS TAB */}
      {activeTab === 'tips' && (
          <div className="space-y-4">
              {tips.map((tip, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                          <span className="text-xl">✨</span> {tip.title}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{tip.text}</p>
                  </div>
              ))}
              <div className="text-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-800 text-sm font-medium">
                  Спросите нашего ИИ-тренера о персональных советах по сну! 💬
              </div>
          </div>
      )}
    </div>
  );
};
