import React from 'react';
import { Card, ProgressBar } from './UI';
import { UserProfile, Macros, FoodEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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
  // Goal - Food + Activity
  const caloriesLeft = Math.max(0, profile.dailyCalorieGoal - todayMacros.calories + burnedCalories);
  
  const macroData = [
    { name: 'Белки', value: todayMacros.protein, color: '#34D399' }, // Emerald
    { name: 'Жиры', value: todayMacros.fat, color: '#FBBF24' }, // Amber
    { name: 'Углев', value: todayMacros.carbs, color: '#60A5FA' }, // Blue
  ];

  const displayData = macroData.every(d => d.value === 0) 
    ? [{ name: 'Empty', value: 1, color: '#E5E7EB' }] 
    : macroData;

  const waterPercent = Math.min(100, Math.round((waterIntake / waterGoal) * 100));

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
        <div className="relative h-56 w-full">
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
           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-4xl font-bold text-gray-800 tracking-tight">{Math.round(caloriesLeft)}</span>
             <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">ккал ост.</span>
             {burnedCalories > 0 && (
               <span className="text-xs text-orange-500 font-semibold bg-orange-50 px-2 py-0.5 rounded-full">
                 +{burnedCalories} сожжено
               </span>
             )}
           </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 w-full mt-2 text-center">
           <div className="flex flex-col items-center">
             <div className="w-2 h-2 rounded-full bg-emerald-400 mb-1"></div>
             <div className="text-xs text-gray-400 uppercase font-bold">Белки</div>
             <div className="font-bold text-gray-800 text-lg">{Math.round(todayMacros.protein)}г</div>
           </div>
           <div className="flex flex-col items-center">
             <div className="w-2 h-2 rounded-full bg-amber-400 mb-1"></div>
             <div className="text-xs text-gray-400 uppercase font-bold">Жиры</div>
             <div className="font-bold text-gray-800 text-lg">{Math.round(todayMacros.fat)}г</div>
           </div>
           <div className="flex flex-col items-center">
             <div className="w-2 h-2 rounded-full bg-blue-400 mb-1"></div>
             <div className="text-xs text-gray-400 uppercase font-bold">Углев.</div>
             <div className="font-bold text-gray-800 text-lg">{Math.round(todayMacros.carbs)}г</div>
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
        <h3 className="font-bold text-gray-800 mb-3 text-lg px-1">История питания</h3>
        {foodEntries.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-300">
             <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </div>
             <p className="text-gray-500 text-sm">Пока пусто. Добавьте первый прием пищи!</p>
             <button onClick={openCamera} className="mt-2 text-primary font-bold text-sm">Добавить +</button>
          </div>
        ) : (
          <div className="space-y-3">
            {foodEntries.slice().reverse().map(entry => (
              <div key={entry.id} onClick={() => onEditFood(entry)} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-3 items-center active:scale-95 transition-transform">
                 {entry.imageUri ? (
                   <img src={entry.imageUri} alt={entry.name} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                 ) : (
                   <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <span className="text-xs">Нет фото</span>
                   </div>
                 )}
                 <div className="flex-1 min-w-0">
                   <h4 className="font-bold text-gray-800 truncate">{entry.name}</h4>
                   <div className="text-xs text-gray-500 flex gap-2 items-center mt-1">
                      <span className="font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{Math.round(entry.macros.calories)} ккал</span>
                      <span className="text-gray-300">•</span>
                      <span className={`${entry.rating >= 7 ? 'text-emerald-500' : 'text-amber-500'} font-medium`}>{entry.rating}/10</span>
                   </div>
                 </div>
                 <button className="p-2 text-gray-300 hover:text-primary transition-colors">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};