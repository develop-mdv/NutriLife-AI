
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, RoadmapStep, Achievement, MealRemindersConfig, SleepConfig, DailyStats } from '../types';
import { Card, Button, LoadingSpinner, Input, ProgressBar, MarkdownText } from './UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
  setWaterGoal: (goal: number) => void;
  sleepConfig: SleepConfig;
  onUpdateSleepConfig: (config: SleepConfig) => void;
  history: DailyStats[];
  performRoadmapGeneration: (wishes?: string) => Promise<void>;
}

interface ExtendedAchievement extends Achievement {
  current: number;
  max: number;
  unit: string;
}

export const Profile: React.FC<ProfileProps> = ({ 
  profile, 
  onUpdateProfile, 
  roadmap, 
  performRoadmapGeneration,
  mealReminders,
  onUpdateMealReminders,
  stats,
  setWaterGoal,
  sleepConfig,
  onUpdateSleepConfig,
  history
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'roadmap' | 'settings'>('stats');
  const [statsView, setStatsView] = useState<'today' | 'history'>('today'); // New sub-state for Stats tab
  const [historyPeriod, setHistoryPeriod] = useState<'week' | 'month'>('week');

  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  
  // Adjustment state
  const [isAdjustingPlan, setIsAdjustingPlan] = useState(false);
  const [wishes, setWishes] = useState('');

  // Achievement Modal State
  const [selectedAchievement, setSelectedAchievement] = useState<ExtendedAchievement | null>(null);

  // Initial load if empty
  useEffect(() => {
    if (activeTab === 'roadmap' && roadmap.length === 0 && !loadingRoadmap) {
      setLoadingRoadmap(true);
      performRoadmapGeneration().finally(() => setLoadingRoadmap(false));
    }
  }, [activeTab, roadmap.length]); 

  const handleAdjustPlan = () => {
    setLoadingRoadmap(true);
    setIsAdjustingPlan(false);
    performRoadmapGeneration(wishes).finally(() => {
        setLoadingRoadmap(false);
        setWishes('');
    });
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

  // --- HISTORY CALCULATIONS ---
  const filteredHistory = useMemo(() => {
    const days = historyPeriod === 'week' ? 7 : 30;
    // Sort oldest to newest for charts
    return [...history]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-days);
  }, [history, historyPeriod]);

  const averages = useMemo(() => {
    if (filteredHistory.length === 0) return { calories: 0, steps: 0, water: 0, sleep: 0 };
    
    const total = filteredHistory.reduce((acc, curr) => ({
       calories: acc.calories + curr.calories,
       steps: acc.steps + curr.steps,
       water: acc.water + curr.water,
       sleep: acc.sleep + curr.sleepHours
    }), { calories: 0, steps: 0, water: 0, sleep: 0 });

    return {
       calories: Math.round(total.calories / filteredHistory.length),
       steps: Math.round(total.steps / filteredHistory.length),
       water: Math.round(total.water / filteredHistory.length),
       sleep: Number((total.sleep / filteredHistory.length).toFixed(1))
    };
  }, [filteredHistory]);

  // --- DYNAMIC ACHIEVEMENTS ---
  const achievements: ExtendedAchievement[] = useMemo(() => {
      // Logic checks
      const hasHistory = history.length > 0;
      const waterGoalMet = stats.water >= stats.waterGoal;
      const stepsGoalMet = stats.steps >= profile.dailyStepGoal;
      const calorieSniper = stats.calories > 0 && Math.abs(stats.calories - profile.dailyCalorieGoal) <= (profile.dailyCalorieGoal * 0.15); // +/- 15%
      const roadmapCreated = roadmap.length > 0;
      const earlyBird = sleepConfig.wakeAlarmEnabled && parseInt(sleepConfig.wakeTime.split(':')[0]) < 8;
      const weekStreak = history.length >= 7;
      const hydrationMaster = history.filter(d => d.water >= 2000).length >= 3;

      return [
        { 
            id: '1', 
            title: 'Начало пути', 
            description: 'Первая запись в истории', 
            icon: '🚀', 
            unlocked: hasHistory,
            current: hasHistory ? 1 : 0,
            max: 1,
            unit: 'шаг'
        },
        { 
            id: '2', 
            title: 'Водный баланс', 
            description: 'Выполнена цель по воде сегодня', 
            icon: '💧', 
            unlocked: waterGoalMet,
            current: Math.min(stats.water, stats.waterGoal),
            max: stats.waterGoal,
            unit: 'мл'
        },
        { 
            id: '3', 
            title: 'Активный образ', 
            description: 'Выполнена цель по шагам сегодня', 
            icon: '👟', 
            unlocked: stepsGoalMet,
            current: Math.min(stats.steps, profile.dailyStepGoal),
            max: profile.dailyStepGoal,
            unit: 'шагов'
        },
        { 
            id: '4', 
            title: 'Снайпер калорий', 
            description: 'Попадание в норму калорий (±15%)', 
            icon: '🎯', 
            unlocked: calorieSniper,
            current: calorieSniper ? 1 : 0,
            max: 1,
            unit: 'цель'
        },
        { 
            id: '5', 
            title: 'Стратег', 
            description: 'Создан персональный план здоровья', 
            icon: '🗺️', 
            unlocked: roadmapCreated,
            current: roadmapCreated ? 1 : 0,
            max: 1,
            unit: 'план'
        },
        { 
            id: '6', 
            title: 'Ранняя пташка', 
            description: 'Будильник установлен до 08:00', 
            icon: '🌅', 
            unlocked: earlyBird,
            current: earlyBird ? 1 : 0,
            max: 1,
            unit: 'будильник'
        },
        { 
            id: '7', 
            title: 'Постоянство', 
            description: 'Использование приложения 7 дней', 
            icon: '🔥', 
            unlocked: weekStreak,
            current: Math.min(history.length, 7),
            max: 7,
            unit: 'дн'
        },
        { 
            id: '8', 
            title: 'Аквамен', 
            description: 'Более 2л воды 3 дня в истории', 
            icon: '🔱', 
            unlocked: hydrationMaster,
            current: history.filter(d => d.water >= 2000).length,
            max: 3,
            unit: 'дн'
        }
      ];
  }, [stats, profile, roadmap, sleepConfig, history]);

  const translateGoal = (goal: string) => {
    switch(goal) {
      case 'lose_weight': return 'Похудение';
      case 'gain_muscle': return 'Набор массы';
      case 'maintain': return 'Поддержание';
      default: return goal;
    }
  }

  return (
    <div className="pb-24 space-y-6 relative animate-in fade-in duration-300">
      {/* Header Profile Card */}
      <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex items-center gap-5">
        <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden shrink-0 border-4 border-white shadow-md">
          <img src={`https://ui-avatars.com/api/?name=${profile.name}&size=128&background=random`} alt="User" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold truncate text-gray-900">{profile.name}</h2>
          
          <div className="flex items-center gap-2 mt-1 h-7">
             <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Цель:</span>
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
                  className="text-primary font-bold text-sm flex items-center gap-1 hover:bg-primary/5 px-2 py-0.5 rounded-lg transition-colors truncate"
                  title="Нажмите чтобы изменить цель"
                >
                   {translateGoal(profile.goal)}
                   <svg className="w-3 h-3 text-primary/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
             )}
          </div>

          <div 
             onClick={() => setActiveTab('settings')}
             className="flex gap-4 mt-3 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 w-fit px-3 py-1.5 rounded-xl cursor-pointer transition-colors active:scale-95"
             title="Нажмите для редактирования"
          >
             <span>{profile.height} см</span>
             <span className="w-px h-4 bg-gray-300"></span>
             <span>{profile.weight} кг</span>
             <span className="w-px h-4 bg-gray-300"></span>
             <span>{profile.age} лет</span>
             <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl">
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'stats' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Статистика
        </button>
        <button 
          onClick={() => setActiveTab('roadmap')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'roadmap' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Мой план
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Настройки
        </button>
      </div>

      {/* STATS TAB CONTENT */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
          
          {/* Sub-Tabs for Stats (Today / History) */}
          <div className="flex justify-center mb-2">
             <div className="flex bg-gray-50 border border-gray-100 p-1 rounded-xl w-full max-w-xs">
                <button
                    onClick={() => setStatsView('today')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${statsView === 'today' ? 'bg-white shadow-sm text-primary border border-gray-100' : 'text-gray-500'}`}
                >
                    Сегодня
                </button>
                <button
                    onClick={() => setStatsView('history')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${statsView === 'history' ? 'bg-white shadow-sm text-primary border border-gray-100' : 'text-gray-500'}`}
                >
                    История
                </button>
             </div>
          </div>

          {statsView === 'today' ? (
              /* TODAY VIEW */
              <>
                <Card>
                    <h3 className="font-bold text-gray-800 mb-6 text-lg">Цели на сегодня</h3>
                    <div className="space-y-6">
                    
                    {/* Calories */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-bold">Калории</span>
                        <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md text-xs">
                            {stats.calories} / {profile.dailyCalorieGoal}
                        </span>
                        </div>
                        <ProgressBar current={stats.calories} max={profile.dailyCalorieGoal} color="bg-emerald-500" />
                    </div>

                    {/* Steps */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-bold">Шаги</span>
                        <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md text-xs">
                            {stats.steps} / {profile.dailyStepGoal}
                        </span>
                        </div>
                        <ProgressBar current={stats.steps} max={profile.dailyStepGoal} color="bg-red-500" />
                    </div>

                    {/* Water */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 font-bold">Вода</span>
                        <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md text-xs">
                            {stats.water} / {stats.waterGoal} мл
                        </span>
                        </div>
                        <ProgressBar current={stats.water} max={stats.waterGoal} color="bg-cyan-400" />
                    </div>

                    </div>
                </Card>

                {/* Achievements */}
                <div>
                    <h3 className="font-bold text-gray-800 mb-3 ml-1">Достижения</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {achievements.map(a => (
                        <div 
                          key={a.id}
                          onClick={() => setSelectedAchievement(a)}
                          className={`cursor-pointer p-4 rounded-2xl flex flex-col items-center text-center gap-2 border transition-all duration-300 hover:scale-105 active:scale-95 ${a.unlocked ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-80 grayscale'}`}
                        >
                            <div className="text-3xl filter-none drop-shadow-sm mb-1">{a.icon}</div>
                            <div className="flex-1 flex flex-col justify-between w-full">
                                <h4 className="font-bold text-xs leading-tight mb-1 text-gray-900 line-clamp-2">{a.title}</h4>
                            </div>
                            {/* Visual Progress for incomplete achievements with multiple steps */}
                            {!a.unlocked && a.max > 1 && (
                                <div className="w-full mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400" style={{width: `${(a.current/a.max)*100}%`}}></div>
                                </div>
                            )}
                        </div>
                    ))}
                    </div>
                </div>
              </>
          ) : (
              /* HISTORY VIEW */
              <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                  <div className="flex justify-between items-center px-1">
                      <h3 className="font-bold text-gray-800 text-lg">Обзор</h3>
                      <div className="flex bg-gray-100 p-0.5 rounded-lg">
                          <button onClick={() => setHistoryPeriod('week')} className={`px-3 py-1 text-xs rounded-md transition-all font-bold ${historyPeriod === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Неделя</button>
                          <button onClick={() => setHistoryPeriod('month')} className={`px-3 py-1 text-xs rounded-md transition-all font-bold ${historyPeriod === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Месяц</button>
                      </div>
                  </div>

                  {/* Averages Cards */}
                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                          <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-1 opacity-70">Ср. Калории</div>
                          <div className="text-2xl font-bold text-emerald-900 tracking-tight">{averages.calories}</div>
                          <div className="text-[10px] text-emerald-600/70 font-medium">ккал / день</div>
                      </div>
                      <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                          <div className="text-[10px] text-red-600 uppercase font-bold tracking-wider mb-1 opacity-70">Ср. Шаги</div>
                          <div className="text-2xl font-bold text-red-900 tracking-tight">{averages.steps}</div>
                          <div className="text-[10px] text-red-600/70 font-medium">шагов / день</div>
                      </div>
                  </div>

                  {/* Charts */}
                  <Card>
                      <h4 className="text-sm font-bold text-gray-700 mb-6 flex items-center gap-2">
                          <div className="w-2 h-4 rounded-full bg-emerald-500"></div>
                          Динамика калорий
                      </h4>
                      <div className="h-48 text-xs">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={filteredHistory}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                  <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => new Date(val).getDate().toString()} 
                                    tick={{fill: '#9CA3AF', fontSize: 10}} 
                                    axisLine={false} 
                                    tickLine={false}
                                    dy={10}
                                  />
                                  <YAxis hide domain={[0, 'auto']} />
                                  <Tooltip 
                                    cursor={{fill: '#F9FAFB', radius: 4}} 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                                  />
                                  <Bar dataKey="calories" fill="#34D399" radius={[4, 4, 4, 4]} barSize={8} name="Калории" />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </Card>

                  <Card>
                      <h4 className="text-sm font-bold text-gray-700 mb-6 flex items-center gap-2">
                          <div className="w-2 h-4 rounded-full bg-red-500"></div>
                          Динамика шагов
                      </h4>
                      <div className="h-48 text-xs">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={filteredHistory}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                  <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(val) => new Date(val).getDate().toString()} 
                                    tick={{fill: '#9CA3AF', fontSize: 10}} 
                                    axisLine={false} 
                                    tickLine={false}
                                    dy={10}
                                  />
                                  <YAxis hide domain={[0, 'auto']} />
                                  <Tooltip 
                                    cursor={{fill: '#F9FAFB', radius: 4}} 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                                  />
                                  <Bar dataKey="steps" fill="#EF4444" radius={[4, 4, 4, 4]} barSize={8} name="Шаги" />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </Card>
              </div>
          )}
        </div>
      )}

      {/* ROADMAP TAB */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          {loadingRoadmap ? (
            <div className="py-20 flex flex-col items-center">
              <LoadingSpinner />
              <p className="text-gray-500 mt-6 animate-pulse text-sm font-medium">Анализирую профиль и составляю стратегию...</p>
            </div>
          ) : (
            <>
            {/* Header Card for Plan */}
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-6 text-white shadow-xl shadow-gray-200">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Текущая программа</p>
                        <h3 className="text-3xl font-bold tracking-tight">{translateGoal(profile.goal)}</h3>
                    </div>
                    <Button 
                        onClick={() => setIsAdjustingPlan(true)} 
                        variant="secondary" 
                        className="text-xs py-2.5 px-4 shadow-none bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md rounded-xl"
                    >
                        Изменить
                    </Button>
                </div>
            </div>
            
            {roadmap.length > 0 ? (
               <div className="relative pl-4 pt-2">
                 {/* Vertical Line */}
                 <div className="absolute left-[27px] top-6 bottom-10 w-0.5 bg-gradient-to-b from-emerald-200 to-gray-100"></div>

                 <div className="space-y-8">
                   {roadmap.map((step, idx) => (
                     <div key={idx} className="relative flex gap-5 group">
                       {/* Number Indicator */}
                       <div className="shrink-0 z-10 mt-1">
                           <div className="w-14 h-14 rounded-full bg-white border-4 border-emerald-50 text-emerald-600 font-bold text-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:border-emerald-200 transition-all duration-300">
                               {idx + 1}
                           </div>
                       </div>
                       
                       {/* Content Card */}
                       <div className="flex-1 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                           <h4 className="font-bold text-gray-900 text-lg leading-tight mb-3">{step.title}</h4>
                           <div className="text-gray-600">
                               <MarkdownText text={step.description} />
                           </div>
                       </div>
                     </div>
                   ))}

                   {/* Finish Flag */}
                   <div className="relative flex gap-5 items-center">
                       <div className="shrink-0 z-10 ml-2">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200 animate-bounce">
                               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                           </div>
                       </div>
                       <div className="text-emerald-800 font-bold text-xs bg-emerald-50 px-4 py-2 rounded-full uppercase tracking-wider border border-emerald-100">
                           Цель достигнута
                       </div>
                   </div>
                 </div>
               </div>
            ) : (
                <div className="text-center py-16 px-6 bg-white rounded-[2.5rem] border border-dashed border-gray-200 mt-4 shadow-sm">
                   <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 mb-2">Ваш путь к здоровью</h3>
                   <p className="text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">ИИ проанализирует ваши параметры и составит персональный план действий.</p>
                   <Button onClick={() => setIsAdjustingPlan(true)} className="px-8 shadow-xl">Создать план</Button>
                </div>
            )}
            </>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
         <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             
             {/* Physical Stats */}
             <Card>
                <div className="flex items-start gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Мои данные</h3>
                        <p className="text-sm text-gray-500">База для расчетов</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Рост (см)</label>
                        <Input 
                            type="number" 
                            value={profile.height} 
                            onChange={(e) => onUpdateProfile({...profile, height: Number(e.target.value)})}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Вес (кг)</label>
                        <Input 
                            type="number" 
                            value={profile.weight} 
                            onChange={(e) => onUpdateProfile({...profile, weight: Number(e.target.value)})}
                             className="mt-2"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Возраст</label>
                        <Input 
                            type="number" 
                            value={profile.age} 
                            onChange={(e) => onUpdateProfile({...profile, age: Number(e.target.value)})}
                             className="mt-2"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Имя</label>
                        <Input 
                            type="text" 
                            value={profile.name} 
                            onChange={(e) => onUpdateProfile({...profile, name: e.target.value})}
                             className="mt-2"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Пол</label>
                        <select
                            value={profile.gender}
                            onChange={(e) => onUpdateProfile({ ...profile, gender: e.target.value as any })}
                            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                        >
                            <option value="male">Мужской</option>
                            <option value="female">Женский</option>
                            <option value="other">Другое</option>
                        </select>
                    </div>
                </div>
             </Card>

             {/* Personalization (Allergies, etc) */}
             <Card>
                <div className="flex items-start gap-4 mb-6">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Персонализация</h3>
                        <p className="text-sm text-gray-500">Важные детали для ИИ</p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Аллергии</label>
                        <textarea 
                            className="w-full bg-gray-50/50 border border-gray-200 text-gray-800 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm mt-2 placeholder:text-gray-400"
                            rows={2}
                            placeholder="Орехи, мед..."
                            value={profile.allergies || ''}
                            onChange={(e) => onUpdateProfile({...profile, allergies: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Предпочтения</label>
                        <textarea 
                            className="w-full bg-gray-50/50 border border-gray-200 text-gray-800 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm mt-2 placeholder:text-gray-400"
                            rows={2}
                            placeholder="Вегетарианец, люблю острое..."
                            value={profile.preferences || ''}
                            onChange={(e) => onUpdateProfile({...profile, preferences: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Здоровье</label>
                        <textarea 
                            className="w-full bg-gray-50/50 border border-gray-200 text-gray-800 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm mt-2 placeholder:text-gray-400"
                            rows={2}
                            placeholder="Диабет, травма колена..."
                            value={profile.healthConditions || ''}
                            onChange={(e) => onUpdateProfile({...profile, healthConditions: e.target.value})}
                        />
                    </div>
                </div>
             </Card>

             <Card>
                <div className="flex items-start gap-4 mb-6">
                    <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Напоминания</h3>
                        <p className="text-sm text-gray-500">Не забывайте о приемах пищи</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Breakfast */}
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                             <span className="text-2xl bg-white p-2 rounded-xl shadow-sm">🍳</span>
                             <div>
                                 <p className="font-bold text-gray-800 text-sm">Завтрак</p>
                                 <input 
                                    type="time" 
                                    value={mealReminders.breakfast.time}
                                    onChange={(e) => handleTimeChange('breakfast', e.target.value)}
                                    className="bg-white border border-gray-200 rounded px-2 py-0.5 text-xs text-gray-700 font-medium focus:outline-none focus:border-primary mt-1"
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
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                             <span className="text-2xl bg-white p-2 rounded-xl shadow-sm">🥗</span>
                             <div>
                                 <p className="font-bold text-gray-800 text-sm">Обед</p>
                                 <input 
                                    type="time" 
                                    value={mealReminders.lunch.time}
                                    onChange={(e) => handleTimeChange('lunch', e.target.value)}
                                    className="bg-white border border-gray-200 rounded px-2 py-0.5 text-xs text-gray-700 font-medium focus:outline-none focus:border-primary mt-1"
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
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                             <span className="text-2xl bg-white p-2 rounded-xl shadow-sm">🍲</span>
                             <div>
                                 <p className="font-bold text-gray-800 text-sm">Ужин</p>
                                 <input 
                                    type="time" 
                                    value={mealReminders.dinner.time}
                                    onChange={(e) => handleTimeChange('dinner', e.target.value)}
                                    className="bg-white border border-gray-200 rounded px-2 py-0.5 text-xs text-gray-700 font-medium focus:outline-none focus:border-primary mt-1"
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
         </div>
      )}

      {/* Achievement Details Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedAchievement(null)}></div>
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
               <button onClick={() => setSelectedAchievement(null)} className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
               
               <div className="text-center">
                   <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-5xl mb-6 shadow-xl ${selectedAchievement.unlocked ? 'bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-500 shadow-amber-100' : 'bg-gray-100 text-gray-400 grayscale'}`}>
                       {selectedAchievement.icon}
                   </div>
                   
                   <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedAchievement.title}</h3>
                   <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 ${selectedAchievement.unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                       {selectedAchievement.unlocked ? 'Достижение получено' : 'В процессе'}
                   </div>
                   
                   <p className="text-gray-600 leading-relaxed mb-8">
                       {selectedAchievement.description}
                   </p>
                   
                   {!selectedAchievement.unlocked && selectedAchievement.max > 1 && (
                       <div className="bg-gray-50 rounded-2xl p-4 text-left">
                           <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
                               <span>Прогресс</span>
                               <span>{selectedAchievement.current} / {selectedAchievement.max} {selectedAchievement.unit}</span>
                           </div>
                           <ProgressBar current={selectedAchievement.current} max={selectedAchievement.max} color="bg-amber-400" />
                           <p className="text-xs text-center text-gray-400 mt-3 font-medium">
                               Осталось: {selectedAchievement.max - selectedAchievement.current} {selectedAchievement.unit}
                           </p>
                       </div>
                   )}
               </div>
           </div>
        </div>
      )}

      {/* Adjustment Modal Overlay */}
      {isAdjustingPlan && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
           <div className="p-6 flex-1 flex flex-col max-w-md mx-auto w-full">
               <h3 className="text-2xl font-bold mb-2 mt-8 text-gray-900">Настройка плана</h3>
               <p className="text-gray-500 mb-6 leading-relaxed">Расскажите ИИ о своих целях, травмах или пожеланиях, чтобы адаптировать стратегию.</p>
               
               <textarea 
                 className="w-full h-48 p-5 bg-gray-50 border border-gray-200 rounded-2xl mb-4 focus:ring-2 focus:ring-primary/50 outline-none resize-none text-base shadow-inner"
                 placeholder="Например: У меня болит колено, исключи бег. Я не ем рыбу. Хочу тренироваться дома."
                 value={wishes}
                 onChange={(e) => setWishes(e.target.value)}
                 autoFocus
               />
               
               <div className="mt-auto flex gap-4 pb-8">
                 <Button variant="outline" onClick={() => setIsAdjustingPlan(false)} className="flex-1 py-4 border-gray-200">Отмена</Button>
                 <Button onClick={handleAdjustPlan} className="flex-[2] py-4 text-lg shadow-xl">
                   {loadingRoadmap ? 'Анализирую...' : 'Обновить план'}
                 </Button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};
