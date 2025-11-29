
import React, { useState, useMemo } from 'react';
import { Card, ProgressBar, Input } from './UI';
import { UserProfile, Macros, FoodEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface DashboardProps {
  profile: UserProfile;
  todayMacros: Macros;
  burnedCalories: number;
  steps: number;
  foodEntries: FoodEntry[];
  waterIntake: number;
  waterGoal: number;
  remindersEnabled: boolean;
  openCamera: () => void;
  openActivity: () => void;
  syncSteps: () => void;
  onEditFood: (entry: FoodEntry) => void;
  onAddWater: (amount: number) => void;
  onToggleReminders: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  profile, 
  todayMacros, 
  burnedCalories, 
  steps, 
  foodEntries,
  waterIntake,
  waterGoal,
  remindersEnabled,
  openCamera, 
  openActivity, 
  syncSteps,
  onEditFood,
  onAddWater,
  onToggleReminders
}) => {
  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);
  
  // Toggle for Calorie Ring (Left vs Consumed)
  const [showConsumed, setShowConsumed] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<'today' | 'week' | 'custom'>('today');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Goal - Food + Activity
  const caloriesLeft = Math.max(0, profile.dailyCalorieGoal - todayMacros.calories + burnedCalories);
  const caloriesConsumed = Math.round(todayMacros.calories);
  
  // Calculate Macro Goals based on Profile Goal
  const macroGoals = useMemo(() => {
    const cals = profile.dailyCalorieGoal;
    // Ratios: Protein/Fat/Carbs
    let ratio = { p: 0.25, f: 0.25, c: 0.5 }; // Default (Balance)

    if (profile.goal === 'lose_weight') {
      ratio = { p: 0.40, f: 0.30, c: 0.30 }; // High protein for satiety
    } else if (profile.goal === 'gain_muscle') {
      ratio = { p: 0.30, f: 0.20, c: 0.50 }; // Moderate protein, high carb
    }

    return {
      protein: Math.round((cals * ratio.p) / 4), // 4 kcal per gram
      fat: Math.round((cals * ratio.f) / 9),     // 9 kcal per gram
      carbs: Math.round((cals * ratio.c) / 4)    // 4 kcal per gram
    };
  }, [profile.dailyCalorieGoal, profile.goal]);

  const macroData = [
    { name: 'Белки', value: todayMacros.protein, color: '#34D399' }, // Emerald
    { name: 'Жиры', value: todayMacros.fat, color: '#FBBF24' }, // Amber
    { name: 'Углев', value: todayMacros.carbs, color: '#60A5FA' }, // Blue
  ];

  const displayData = macroData.every(d => d.value === 0) 
    ? [{ name: 'Empty', value: 1, color: '#E5E7EB' }] 
    : macroData;

  // Filter Logic
  const filteredFoodEntries = useMemo(() => {
    const now = new Date();
    // Start of today (00:00:00)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return foodEntries.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();

        if (filterType === 'today') {
            return entryTime >= todayStart;
        }
        if (filterType === 'week') {
            const weekStart = todayStart - (6 * 24 * 60 * 60 * 1000); // Last 7 days including today
            return entryTime >= weekStart;
        }
        if (filterType === 'custom') {
            if (!dateRange.start || !dateRange.end) return true;
            
            // Parse inputs (YYYY-MM-DD) to local time
            const sParts = dateRange.start.split('-').map(Number);
            const start = new Date(sParts[0], sParts[1]-1, sParts[2]).getTime();
            
            const eParts = dateRange.end.split('-').map(Number);
            // End of the end date
            const end = new Date(eParts[0], eParts[1]-1, eParts[2], 23, 59, 59, 999).getTime();
            
            return entryTime >= start && entryTime <= end;
        }
        return true;
    }).sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
  }, [foodEntries, filterType, dateRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-100 shadow-md rounded-lg text-xs">
          <p className="font-bold mb-1" style={{color: data.fill}}>{data.name}</p>
          <p>{Math.round(data.amount)}г ({Math.round(data.percent)}% от нормы)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Привет, {profile.name} 👋</h1>
          <p className="text-gray-500 text-sm">Давай достигнем целей сегодня!</p>
        </div>
        <div className="h-10 w-10 bg-gray-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
           <img src={`https://ui-avatars.com/api/?name=${profile.name}&background=random`} alt="Avatar" />
        </div>
      </div>

      {/* Main Calorie Ring */}
      <Card className="flex flex-col items-center justify-center py-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-blue-400"></div>
        <div 
          onClick={() => setShowConsumed(!showConsumed)}
          className="relative h-56 w-full cursor-pointer active:scale-95 transition-transform duration-200"
          title="Нажмите, чтобы переключить вид"
        >
           <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displayData}
                innerRadius={70}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                cornerRadius={5}
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
           </ResponsiveContainer>
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
             <span className="text-4xl font-bold text-gray-800 tracking-tight">
                {showConsumed ? caloriesConsumed : Math.round(caloriesLeft)}
             </span>
             <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                {showConsumed ? 'ккал съедено' : 'ккал ост.'}
             </span>
             {!showConsumed && burnedCalories > 0 && (
               <span className="text-xs text-orange-500 font-semibold bg-orange-50 px-2 py-0.5 rounded-full">
                 +{burnedCalories} сожжено
               </span>
             )}
              {showConsumed && (
               <span className="text-xs text-gray-400 font-medium">
                 из {profile.dailyCalorieGoal}
               </span>
             )}
           </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 w-full mt-2 text-center">
           <div className="flex flex-col items-center">
             <div className="w-2 h-2 rounded-full bg-emerald-400 mb-1"></div>
             <div className="text-xs text-gray-400 uppercase font-bold">Белки</div>
             <div className="font-bold text-gray-800 text-lg leading-none mt-1">
                 {Math.round(todayMacros.protein)}
                 <span className="text-xs text-gray-400 font-medium ml-0.5">/{macroGoals.protein}г</span>
             </div>
           </div>
           <div className="flex flex-col items-center">
             <div className="w-2 h-2 rounded-full bg-amber-400 mb-1"></div>
             <div className="text-xs text-gray-400 uppercase font-bold">Жиры</div>
             <div className="font-bold text-gray-800 text-lg leading-none mt-1">
                {Math.round(todayMacros.fat)}
                <span className="text-xs text-gray-400 font-medium ml-0.5">/{macroGoals.fat}г</span>
             </div>
           </div>
           <div className="flex flex-col items-center">
             <div className="w-2 h-2 rounded-full bg-blue-400 mb-1"></div>
             <div className="text-xs text-gray-400 uppercase font-bold">Углев.</div>
             <div className="font-bold text-gray-800 text-lg leading-none mt-1">
                {Math.round(todayMacros.carbs)}
                <span className="text-xs text-gray-400 font-medium ml-0.5">/{macroGoals.carbs}г</span>
             </div>
           </div>
        </div>
      </Card>

      {/* Water Tracker */}
      <Card className="bg-cyan-50 border-cyan-100 overflow-visible">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-200 rounded-lg text-cyan-700">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Водный баланс</h3>
              <p className="text-xs text-gray-500">{waterIntake} / {waterGoal} мл</p>
            </div>
          </div>
          <button 
             onClick={onToggleReminders}
             className={`p-2 rounded-full transition-colors ${remindersEnabled ? 'bg-cyan-200 text-cyan-800' : 'bg-white text-gray-400'}`}
             title="Напоминания каждые 2 часа"
          >
             <svg className="w-5 h-5" fill={remindersEnabled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>
        </div>

        <ProgressBar current={waterIntake} max={waterGoal} color="bg-cyan-400" />
        
        <div className="mt-4 flex gap-3">
          <button onClick={() => onAddWater(250)} className="flex-1 bg-white py-2 rounded-xl text-sm font-bold text-cyan-600 shadow-sm border border-cyan-100 active:scale-95 transition-all">
            + 250 мл
          </button>
          <button onClick={() => onAddWater(500)} className="flex-1 bg-white py-2 rounded-xl text-sm font-bold text-cyan-600 shadow-sm border border-cyan-100 active:scale-95 transition-all">
            + 500 мл
          </button>
        </div>
      </Card>

      {/* Activity / Steps */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded-lg">
               <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
            </div>
            Активность
          </h3>
          <span className="text-sm font-medium text-gray-600">{steps} / {profile.dailyStepGoal} шагов</span>
        </div>
        <ProgressBar current={steps} max={profile.dailyStepGoal} color="bg-red-500" />
        
        <div className="mt-4 flex gap-3">
             <button onClick={openActivity} className="flex-1 bg-orange-50 py-3 rounded-xl text-sm font-bold text-orange-600 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
               Тренировка
             </button>
             <button onClick={syncSteps} className="flex-1 bg-gray-50 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Синхр.
             </button>
        </div>
      </Card>

      {/* Food History */}
      <div>
        {/* Filter Header */}
        <div className="flex justify-between items-end mb-4 px-1">
            <h3 className="font-bold text-gray-800 text-lg">История питания</h3>
            <div className="relative">
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-3 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                >
                    <option value="today">Сегодня</option>
                    <option value="week">7 дней</option>
                    <option value="custom">Период</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>

        {filterType === 'custom' && (
            <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2 fade-in">
                <Input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="text-xs py-2 h-auto"
                />
                <Input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="text-xs py-2 h-auto"
                />
            </div>
        )}

        {filteredFoodEntries.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-300">
             <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </div>
             <p className="text-gray-500 text-sm">Нет записей за выбранный период.</p>
             {filterType === 'today' && (
                 <button onClick={openCamera} className="mt-2 text-primary font-bold text-sm">Добавить +</button>
             )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFoodEntries.map(entry => {
              const isExpanded = expandedFoodId === entry.id;

              // Data for the mini bar chart in expanded view
              const chartData = [
                { name: 'Белки', amount: entry.macros.protein, percent: (entry.macros.protein / macroGoals.protein) * 100, fill: '#34D399' },
                { name: 'Жиры', amount: entry.macros.fat, percent: (entry.macros.fat / macroGoals.fat) * 100, fill: '#FBBF24' },
                { name: 'Углев', amount: entry.macros.carbs, percent: (entry.macros.carbs / macroGoals.carbs) * 100, fill: '#60A5FA' },
              ];

              return (
                <div key={entry.id} className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/5 shadow-md' : ''}`}>
                   {/* Header */}
                   <div 
                     onClick={() => setExpandedFoodId(isExpanded ? null : entry.id)}
                     className="p-3 flex gap-3 items-center cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                   >
                       {/* Image */}
                       {entry.imageUri ? (
                         <img src={entry.imageUri} alt={entry.name} className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0" />
                       ) : (
                         <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                            <span className="text-[10px]">Нет фото</span>
                         </div>
                       )}
                       
                       <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start">
                             <h4 className="font-bold text-gray-800 truncate text-sm">{entry.name}</h4>
                             <span className="font-bold text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                                {Math.round(entry.macros.calories)} ккал
                             </span>
                         </div>
                         <div className="text-xs text-gray-500 flex justify-between items-center mt-1">
                            <div className="flex items-center gap-2">
                                <span className={`${entry.rating >= 7 ? 'text-emerald-500' : 'text-amber-500'} font-medium`}>{entry.rating}/10</span>
                                <span className="text-gray-300">•</span>
                                <span>{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                {filterType !== 'today' && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                                    </>
                                )}
                            </div>
                            <svg className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                         </div>
                       </div>
                   </div>

                   {/* Body */}
                   {isExpanded && (
                      <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                          {/* Macros */}
                          <div className="grid grid-cols-3 gap-2 my-3">
                              <div className="bg-emerald-50 p-2 rounded-xl text-center">
                                  <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Белки</div>
                                  <div className="font-bold text-gray-700">{Math.round(entry.macros.protein)}г</div>
                              </div>
                              <div className="bg-amber-50 p-2 rounded-xl text-center">
                                  <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Жиры</div>
                                  <div className="font-bold text-gray-700">{Math.round(entry.macros.fat)}г</div>
                              </div>
                              <div className="bg-blue-50 p-2 rounded-xl text-center">
                                  <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Углев.</div>
                                  <div className="font-bold text-gray-700">{Math.round(entry.macros.carbs)}г</div>
                              </div>
                          </div>

                          {/* Contribution Chart */}
                          <div className="mb-3">
                             <h5 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 text-center">Вклад в дневную цель (%)</h5>
                             <div className="h-24 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 10, fill: '#6B7280'}} interval={0} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                                        <Bar dataKey="percent" radius={[0, 4, 4, 0]} barSize={16} background={{ fill: '#F3F4F6' }}>
                                            {chartData.map((d, index) => (
                                                <Cell key={`cell-${index}`} fill={d.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                             </div>
                          </div>
                          
                          {/* Recommendation */}
                          {entry.recommendation && (
                              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
                                  <p className="text-xs text-gray-600 leading-relaxed italic">
                                     "{entry.recommendation}"
                                  </p>
                              </div>
                          )}

                          {/* Edit Button */}
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditFood(entry);
                            }}
                            className="w-full py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Редактировать запись
                          </button>
                      </div>
                   )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
