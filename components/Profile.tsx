
import React, { useState, useEffect } from 'react';
import { UserProfile, RoadmapStep, Achievement, MealRemindersConfig } from '../types';
import { Card, Button, LoadingSpinner, Input, ProgressBar } from './UI';
import { generateWellnessRoadmap } from '../services/geminiService';

interface ProfileProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  roadmap: RoadmapStep[];
  onUpdateRoadmap: (steps: RoadmapStep[]) => void;
  mealReminders: MealRemindersConfig;
  onUpdateMealReminders: (config: MealRemindersConfig) => void;
  stats: {
    calories: number;
    steps: number;
    water: number;
    waterGoal: number;
  };
}

export const Profile: React.FC<ProfileProps> = ({ 
  profile, 
  onUpdateProfile, 
  roadmap, 
  onUpdateRoadmap,
  mealReminders,
  onUpdateMealReminders,
  stats
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'roadmap' | 'settings'>('stats');
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  
  // Adjustment state
  const [isAdjustingPlan, setIsAdjustingPlan] = useState(false);
  const [wishes, setWishes] = useState('');

  // Initial load if empty
  useEffect(() => {
    const loadRoadmap = async () => {
       setLoadingRoadmap(true);
       const steps = await generateWellnessRoadmap(profile);
       onUpdateRoadmap(steps);
       setLoadingRoadmap(false);
    };
    
    if (activeTab === 'roadmap' && roadmap.length === 0 && !loadingRoadmap) {
      loadRoadmap();
    }
  }, [activeTab, roadmap.length]); 

  const handleAdjustPlan = async () => {
    setLoadingRoadmap(true);
    setIsAdjustingPlan(false);
    const steps = await generateWellnessRoadmap(profile, wishes);
    onUpdateRoadmap(steps);
    setLoadingRoadmap(false);
    setWishes(''); 
  };

  const handleToggleReminder = (meal: keyof MealRemindersConfig) => {
    // Request permission if enabling
    if (!mealReminders[meal].enabled && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    
    onUpdateMealReminders({
      ...mealReminders,
      [meal]: {
        ...mealReminders[meal],
        enabled: !mealReminders[meal].enabled
      }
    });
  };

  const handleTimeChange = (meal: keyof MealRemindersConfig, time: string) => {
    onUpdateMealReminders({
      ...mealReminders,
      [meal]: {
        ...mealReminders[meal],
        time
      }
    });
  };

  const achievements: Achievement[] = [
    { id: '1', title: 'Ранняя пташка', description: 'Завтрак до 9 утра', icon: '🌅', unlocked: true },
    { id: '2', title: 'Мастер БЖУ', description: 'Норма белка 3 дня подряд', icon: '🥩', unlocked: false },
    { id: '3', title: 'Марафонец', description: '15 тыс. шагов за день', icon: '👟', unlocked: true },
  ];

  const translateGoal = (goal: string) => {
    switch(goal) {
      case 'lose_weight': return 'Похудение';
      case 'gain_muscle': return 'Набор массы';
      case 'maintain': return 'Поддержание';
      default: return goal;
    }
  }

  // Helper to format description text (handle lists)
  const formatDescription = (text: string) => {
    if (!text) return null;
    
    // Check if text looks like a list (contains newlines with - or •)
    if (text.includes('\n-') || text.includes('\n•') || text.match(/^\s*[-•]/m)) {
      const items = text.split(/\n/).filter(line => line.trim().length > 0);
      return (
        <ul className="list-disc pl-5 space-y-1 mt-2">
          {items.map((item, i) => (
            <li key={i} className="text-gray-600 text-sm">
              {item.replace(/^[-•]\s*/, '')}
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-gray-600 text-sm mt-1 leading-relaxed">{text}</p>;
  };

  return (
    <div className="pb-24 space-y-6 relative">
      {/* Header Profile Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden shrink-0">
          <img src={`https://ui-avatars.com/api/?name=${profile.name}&size=128&background=random`} alt="User" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{profile.name}</h2>
          
          <div className="flex items-center gap-2 mt-1 h-7">
             <span className="text-gray-500 text-sm">Цель:</span>
             {isEditingGoal ? (
                 <select 
                    autoFocus
                    value={profile.goal}
                    onChange={(e) => {
                        onUpdateProfile({...profile, goal: e.target.value as any});
                        setIsEditingGoal(false);
                    }}
                    onBlur={() => setIsEditingGoal(false)}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 bg-white py-0.5 pl-2 pr-7 outline-none"
                 >
                     <option value="lose_weight">Похудение</option>
                     <option value="gain_muscle">Набор массы</option>
                     <option value="maintain">Поддержание</option>
                 </select>
             ) : (
                <button 
                  onClick={() => setIsEditingGoal(true)}
                  className="text-primary font-medium text-sm flex items-center gap-1 hover:underline decoration-dashed underline-offset-4 truncate"
                  title="Нажмите чтобы изменить цель"
                >
                   {translateGoal(profile.goal)}
                   <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
             )}
          </div>

          <div className="flex gap-4 mt-2 text-sm text-gray-600">
             <span>{profile.height} см</span>
             <span>{profile.weight} кг</span>
             <span>{profile.age} лет</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Статистика
        </button>
        <button 
          onClick={() => setActiveTab('roadmap')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'roadmap' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Мой план
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Настройки
        </button>
      </div>

      {/* STATS TAB */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
          
          {/* Daily Goals Progress */}
          <Card>
            <h3 className="font-bold text-gray-800 mb-4">Цели на сегодня</h3>
            <div className="space-y-5">
              
              {/* Calories */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">Калории</span>
                  <span className="font-bold text-gray-800">
                    {stats.calories} <span className="text-gray-400 font-normal">/ {profile.dailyCalorieGoal}</span>
                  </span>
                </div>
                <ProgressBar current={stats.calories} max={profile.dailyCalorieGoal} color="bg-emerald-500" />
                <div className="text-right mt-1">
                   <span className="text-[10px] text-gray-400">{Math.round((stats.calories / profile.dailyCalorieGoal) * 100)}%</span>
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">Шаги</span>
                  <span className="font-bold text-gray-800">
                    {stats.steps} <span className="text-gray-400 font-normal">/ {profile.dailyStepGoal}</span>
                  </span>
                </div>
                <ProgressBar current={stats.steps} max={profile.dailyStepGoal} color="bg-red-500" />
                 <div className="text-right mt-1">
                   <span className="text-[10px] text-gray-400">{Math.round((stats.steps / profile.dailyStepGoal) * 100)}%</span>
                </div>
              </div>

              {/* Water */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 font-medium">Вода</span>
                  <span className="font-bold text-gray-800">
                    {stats.water} <span className="text-gray-400 font-normal">/ {stats.waterGoal} мл</span>
                  </span>
                </div>
                <ProgressBar current={stats.water} max={stats.waterGoal} color="bg-cyan-400" />
                 <div className="text-right mt-1">
                   <span className="text-[10px] text-gray-400">{Math.round((stats.water / stats.waterGoal) * 100)}%</span>
                </div>
              </div>

            </div>
          </Card>

          {/* Achievements */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3">Достижения</h3>
            <div className="grid grid-cols-1 gap-3">
               {achievements.map(a => (
                 <div key={a.id} className={`p-4 rounded-xl flex items-center gap-4 border ${a.unlocked ? 'bg-yellow-50 border-yellow-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                   <div className="text-3xl">{a.icon}</div>
                   <div>
                     <h4 className="font-bold text-gray-900">{a.title}</h4>
                     <p className="text-xs text-gray-500">{a.description}</p>
                   </div>
                   {a.unlocked && <div className="ml-auto text-yellow-500">★</div>}
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* ROADMAP TAB */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          {loadingRoadmap ? (
            <div className="py-12 flex flex-col items-center">
              <LoadingSpinner />
              <p className="text-gray-500 mt-4 animate-pulse">ИИ составляет ваш персональный план...</p>
            </div>
          ) : (
            <>
            {/* Header Card for Plan */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Ваша стратегия</p>
                        <h3 className="text-2xl font-bold">{translateGoal(profile.goal)}</h3>
                    </div>
                    <Button 
                        onClick={() => setIsAdjustingPlan(true)} 
                        variant="secondary" 
                        className="text-xs py-2 px-3 shadow-none bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Изменить
                    </Button>
                </div>
            </div>
            
            {roadmap.length > 0 ? (
               <div className="relative pl-4">
                 {/* Vertical Line */}
                 <div className="absolute left-[27px] top-4 bottom-8 w-0.5 bg-gray-200"></div>

                 <div className="space-y-8">
                   {roadmap.map((step, idx) => (
                     <div key={idx} className="relative flex gap-4 group">
                       {/* Number Indicator */}
                       <div className="shrink-0 z-10">
                           <div className="w-14 h-14 rounded-full bg-white border-4 border-emerald-50 text-emerald-600 font-bold text-xl flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-emerald-100 transition-all">
                               {idx + 1}
                           </div>
                       </div>
                       
                       {/* Content Card */}
                       <div className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                           <h4 className="font-bold text-gray-900 text-lg leading-tight mb-2">{step.title}</h4>
                           <div className="text-gray-600 text-sm">
                               {formatDescription(step.description)}
                           </div>
                       </div>
                     </div>
                   ))}

                   {/* Finish Flag */}
                   <div className="relative flex gap-4 items-center">
                       <div className="shrink-0 z-10 ml-2">
                           <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
                               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                           </div>
                       </div>
                       <div className="text-emerald-800 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                           Цель достигнута
                       </div>
                   </div>
                 </div>
               </div>
            ) : (
                <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-gray-300 mt-4">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                   </div>
                   <h3 className="text-lg font-bold text-gray-800 mb-1">План еще не создан</h3>
                   <p className="text-gray-500 mb-6 text-sm">ИИ готов составить для вас персональную стратегию питания и тренировок.</p>
                   <Button onClick={() => setIsAdjustingPlan(true)}>Создать план</Button>
                </div>
            )}
            </>
          )}
        </div>
      )}

      {/* SETTINGS TAB (Meal Reminders + Profile Edit) */}
      {activeTab === 'settings' && (
         <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             
             {/* Physical Stats */}
             <Card>
                <div className="flex items-start gap-4 mb-4">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Физические данные</h3>
                        <p className="text-sm text-gray-500">Обновите ваши параметры для точных расчетов.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Рост (см)</label>
                        <Input 
                            type="number" 
                            value={profile.height} 
                            onChange={(e) => onUpdateProfile({...profile, height: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Вес (кг)</label>
                        <Input 
                            type="number" 
                            value={profile.weight} 
                            onChange={(e) => onUpdateProfile({...profile, weight: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Возраст</label>
                        <Input 
                            type="number" 
                            value={profile.age} 
                            onChange={(e) => onUpdateProfile({...profile, age: Number(e.target.value)})}
                        />
                    </div>
                     <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Имя</label>
                        <Input 
                            type="text" 
                            value={profile.name} 
                            onChange={(e) => onUpdateProfile({...profile, name: e.target.value})}
                        />
                    </div>
                </div>
             </Card>

             {/* Personalization (Allergies, etc) */}
             <Card>
                <div className="flex items-start gap-4 mb-4">
                    <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Персонализация</h3>
                        <p className="text-sm text-gray-500">Укажите ограничения для ИИ тренера.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Аллергии</label>
                        <textarea 
                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm mt-1"
                            rows={2}
                            placeholder="Например: орехи, лактоза..."
                            value={profile.allergies || ''}
                            onChange={(e) => onUpdateProfile({...profile, allergies: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Предпочтения в еде</label>
                        <textarea 
                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm mt-1"
                            rows={2}
                            placeholder="Например: люблю острое, вегетарианец..."
                            value={profile.preferences || ''}
                            onChange={(e) => onUpdateProfile({...profile, preferences: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Ограничения по здоровью</label>
                        <textarea 
                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm mt-1"
                            rows={2}
                            placeholder="Например: диабет, больные колени..."
                            value={profile.healthConditions || ''}
                            onChange={(e) => onUpdateProfile({...profile, healthConditions: e.target.value})}
                        />
                    </div>
                </div>
             </Card>

             <Card>
                <div className="flex items-start gap-4 mb-4">
                    <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Напоминания о еде</h3>
                        <p className="text-sm text-gray-500">Приложение напомнит вам записать прием пищи в указанное время.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Breakfast */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                             <span className="text-xl">🍳</span>
                             <div>
                                 <p className="font-bold text-gray-700 text-sm">Завтрак</p>
                                 <input 
                                    type="time" 
                                    value={mealReminders.breakfast.time}
                                    onChange={(e) => handleTimeChange('breakfast', e.target.value)}
                                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 block"
                                 />
                             </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={mealReminders.breakfast.enabled}
                            onChange={() => handleToggleReminder('breakfast')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    {/* Lunch */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                             <span className="text-xl">🥗</span>
                             <div>
                                 <p className="font-bold text-gray-700 text-sm">Обед</p>
                                 <input 
                                    type="time" 
                                    value={mealReminders.lunch.time}
                                    onChange={(e) => handleTimeChange('lunch', e.target.value)}
                                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 block"
                                 />
                             </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={mealReminders.lunch.enabled}
                            onChange={() => handleToggleReminder('lunch')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    {/* Dinner */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                             <span className="text-xl">🍲</span>
                             <div>
                                 <p className="font-bold text-gray-700 text-sm">Ужин</p>
                                 <input 
                                    type="time" 
                                    value={mealReminders.dinner.time}
                                    onChange={(e) => handleTimeChange('dinner', e.target.value)}
                                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 block"
                                 />
                             </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={mealReminders.dinner.enabled}
                            onChange={() => handleToggleReminder('dinner')}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>
             </Card>
             
             <div className="text-center text-xs text-gray-400 px-4">
                 * Чтобы получать уведомления, приложение должно быть открыто в браузере. Разрешите уведомления в настройках вашего устройства.
             </div>
         </div>
      )}

      {/* Adjustment Modal Overlay */}
      {isAdjustingPlan && (
        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-3xl p-6 flex flex-col animate-in fade-in duration-200 h-full">
           <h3 className="text-xl font-bold mb-2">Корректировка плана</h3>
           <p className="text-sm text-gray-500 mb-4">Опишите ваши пожелания, травмы или предпочтения в еде. ИИ перестроит план под вас.</p>
           
           <textarea 
             className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-primary/50 outline-none resize-none text-sm"
             placeholder="Например: У меня болит колено, исключи бег. Я не ем рыбу. Хочу тренироваться дома."
             value={wishes}
             onChange={(e) => setWishes(e.target.value)}
           />
           
           <div className="mt-auto flex gap-3">
             <Button variant="outline" onClick={() => setIsAdjustingPlan(false)} className="flex-1">Отмена</Button>
             <Button onClick={handleAdjustPlan} className="flex-1">
               {loadingRoadmap ? 'Думаю...' : 'Обновить'}
             </Button>
           </div>
        </div>
      )}
    </div>
  );
};
