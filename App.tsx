
import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { FoodLogger } from './components/FoodLogger';
import { ChatBot } from './components/ChatBot';
import { Profile } from './components/Profile';
import { ActivityLogger } from './components/ActivityLogger';
import { AppView, FoodEntry, UserProfile, Macros, ActivityEntry, RoadmapStep, MealRemindersConfig, ReminderConfig } from './types';
import { Button, Input } from './components/UI';

// Mock Data
const INITIAL_PROFILE: UserProfile = {
  name: 'Алексей',
  height: 175,
  weight: 75,
  age: 28,
  gender: 'male',
  goal: 'lose_weight',
  activityLevel: 'active',
  dailyCalorieGoal: 2200,
  dailyStepGoal: 10000,
  allergies: '',
  preferences: '',
  healthConditions: ''
};

const INITIAL_MEAL_REMINDERS: MealRemindersConfig = {
  breakfast: { enabled: false, time: '09:00' },
  lunch: { enabled: false, time: '13:00' },
  dinner: { enabled: false, time: '19:00' }
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]); // Lifted state for roadmap
  const [steps, setSteps] = useState(4520); // Initial steps
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  
  // Step Sync State
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [stepInput, setStepInput] = useState('');

  // Water Tracking
  const [waterIntake, setWaterIntake] = useState(0);
  const WATER_GOAL = 2500;
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  // Meal Reminders
  const [mealReminders, setMealReminders] = useState<MealRemindersConfig>(INITIAL_MEAL_REMINDERS);
  const lastNotifiedMinute = useRef<string | null>(null);

  useEffect(() => {
    let interval: any;

    if (remindersEnabled) {
      // Check permission
      if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
          if (permission !== 'granted') {
            setRemindersEnabled(false);
          }
        });
      }

      // Set interval for 2 hours (2 * 60 * 60 * 1000 ms)
      interval = setInterval(() => {
        if (Notification.permission === 'granted') {
          new Notification("Время пить воду! 💧", {
            body: "Прошло 2 часа. Поддержите водный баланс для здоровья и энергии!",
            icon: "https://cdn-icons-png.flaticon.com/512/3105/3105807.png" // Generic water icon
          });
        }
      }, 7200000); 
    }

    return () => clearInterval(interval);
  }, [remindersEnabled]);

  // Meal Reminders Check Loop
  useEffect(() => {
    const checkMealReminders = () => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const currentMinuteStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      // Prevent multiple notifications in the same minute
      if (lastNotifiedMinute.current === currentMinuteStr) return;

      const labels: Record<string, string> = {
        breakfast: 'Завтрак',
        lunch: 'Обед',
        dinner: 'Ужин'
      };

      Object.entries(mealReminders).forEach(([key, value]) => {
        const config = value as ReminderConfig;
        if (config.enabled && config.time === currentMinuteStr) {
          new Notification(`Время приема пищи: ${labels[key]} 🍽️`, {
            body: `Пора подкрепиться! Не забудьте записать еду в приложение.`,
            icon: "https://cdn-icons-png.flaticon.com/512/1046/1046784.png"
          });
          lastNotifiedMinute.current = currentMinuteStr;
        }
      });
    };

    // Check every 10 seconds to catch the minute change accurately
    const interval = setInterval(checkMealReminders, 10000);
    return () => clearInterval(interval);
  }, [mealReminders]);

  const toggleReminders = () => {
    if (!remindersEnabled) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          setRemindersEnabled(true);
          new Notification("Напоминания включены", { body: "Мы напомним вам выпить воды через 2 часа." });
        } else {
          alert("Необходимо разрешить уведомления в браузере.");
        }
      });
    } else {
      setRemindersEnabled(false);
    }
  };

  const todayMacros: Macros = foodEntries.reduce((acc, entry) => ({
    calories: acc.calories + entry.macros.calories,
    protein: acc.protein + entry.macros.protein,
    fat: acc.fat + entry.macros.fat,
    carbs: acc.carbs + entry.macros.carbs
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const burnedCalories = activityEntries.reduce((acc, entry) => acc + entry.caloriesBurned, 0);

  const handleSaveFood = (entry: FoodEntry) => {
    if (editingFood) {
      setFoodEntries(prev => prev.map(item => item.id === entry.id ? entry : item));
      setEditingFood(null);
    } else {
      setFoodEntries([...foodEntries, entry]);
    }
    setView(AppView.DASHBOARD);
  };

  const handleEditFood = (entry: FoodEntry) => {
    setEditingFood(entry);
    setView(AppView.FOOD_LOG);
  };

  const handleCancelFood = () => {
    setEditingFood(null);
    setView(AppView.DASHBOARD);
  };

  const handleSaveActivity = (entry: ActivityEntry) => {
    setActivityEntries([...activityEntries, entry]);
    setView(AppView.DASHBOARD);
  };

  // Open Step Sync Modal
  const openSyncSteps = () => {
    setStepInput(steps.toString());
    setIsStepModalOpen(true);
  };

  // Save Steps
  const handleSaveSteps = () => {
    const newSteps = parseInt(stepInput);
    if (!isNaN(newSteps) && newSteps >= 0) {
      setSteps(newSteps);
      setIsStepModalOpen(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case AppView.DASHBOARD:
        return (
          <Dashboard 
            profile={profile}
            todayMacros={todayMacros}
            burnedCalories={burnedCalories}
            steps={steps}
            foodEntries={foodEntries}
            waterIntake={waterIntake}
            waterGoal={WATER_GOAL}
            remindersEnabled={remindersEnabled}
            openCamera={() => { setEditingFood(null); setView(AppView.FOOD_LOG); }}
            openActivity={() => setView(AppView.ACTIVITY)}
            syncSteps={openSyncSteps}
            onEditFood={handleEditFood}
            onAddWater={(amount) => setWaterIntake(prev => prev + amount)}
            onToggleReminders={toggleReminders}
          />
        );
      case AppView.FOOD_LOG:
        return (
          <FoodLogger 
            initialEntry={editingFood}
            onSave={handleSaveFood}
            onCancel={handleCancelFood}
          />
        );
      case AppView.ACTIVITY:
        return (
          <ActivityLogger 
            onSave={handleSaveActivity} 
            onCancel={() => setView(AppView.DASHBOARD)}
            userWeight={profile.weight}
          />
        );
      case AppView.CHAT:
        return (
          <ChatBot 
            userProfile={profile}
            todayMacros={todayMacros}
            foodHistory={foodEntries}
            waterIntake={waterIntake}
            activityCalories={burnedCalories}
          />
        );
      case AppView.PROFILE:
        return (
          <Profile 
            profile={profile} 
            onUpdateProfile={setProfile} 
            roadmap={roadmap}
            onUpdateRoadmap={setRoadmap}
            mealReminders={mealReminders}
            onUpdateMealReminders={setMealReminders}
          />
        );
      default:
        return null;
    }
  };

  // Bottom Navigation
  const NavItem = ({ active, icon, label, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full py-1 transition-colors ${active ? 'text-primary' : 'text-gray-400'}`}>
      <div className={`mb-1 transition-transform ${active ? 'scale-110' : ''}`}>{icon}</div>
      <span className="text-[10px] font-bold tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col relative overflow-hidden shadow-2xl">
      {/* Main Content Area */}
      <main className="flex-1 p-5 overflow-y-auto no-scrollbar scroll-smooth">
        {renderContent()}
      </main>

      {/* Bottom Tab Bar (Only show if not in specific sub-views like camera or activity input) */}
      {view !== AppView.FOOD_LOG && view !== AppView.ACTIVITY && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-2 flex justify-between items-end pb-8 z-50 rounded-t-3xl">
           <NavItem 
             active={view === AppView.DASHBOARD} 
             onClick={() => setView(AppView.DASHBOARD)}
             label="Сегодня"
             icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
           />
           <NavItem 
             active={view === AppView.CHAT}
             onClick={() => setView(AppView.CHAT)} 
             label="Тренер"
             icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
           />
           <div className="w-12"></div> {/* Spacing for floating button */}
           <NavItem 
             active={false}
             onClick={openSyncSteps}
             label="Синхр."
             icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
           />
           <NavItem 
             active={view === AppView.PROFILE}
             onClick={() => setView(AppView.PROFILE)} 
             label="Профиль"
             icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
           />
           
           {/* Center Action Button Overlay */}
           <div className="absolute left-1/2 -translate-x-1/2 -top-6">
              <button 
                onClick={() => { setEditingFood(null); setView(AppView.FOOD_LOG); }}
                className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full shadow-lg shadow-emerald-200/50 flex items-center justify-center text-white active:scale-95 transition-transform border-4 border-gray-50"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
           </div>
        </div>
      )}

      {/* Steps Sync Modal */}
      {isStepModalOpen && (
        <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center sm:items-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-gray-800">Синхронизация шагов</h3>
               <button onClick={() => setIsStepModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <p className="text-sm text-gray-500 mb-4">Введите текущее количество шагов с вашего фитнес-браслета или приложения Здоровье.</p>
             
             <div className="mb-6">
               <label className="text-xs text-gray-500 uppercase font-bold ml-1">Шаги сегодня</label>
               <Input 
                 type="number" 
                 value={stepInput} 
                 onChange={(e) => setStepInput(e.target.value)} 
                 className="text-2xl font-bold mt-1 text-center"
                 autoFocus
               />
             </div>
             
             <div className="flex gap-3">
               <Button variant="outline" onClick={() => setIsStepModalOpen(false)} className="flex-1">Отмена</Button>
               <Button onClick={handleSaveSteps} className="flex-1">Сохранить</Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;