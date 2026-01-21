
import React, { useState, useEffect } from 'react';
import { Button, Card, Input } from './UI';
import { ActivityEntry } from '../types';

interface ActivityLoggerProps {
  onSave: (entry: ActivityEntry) => void;
  onCancel: () => void;
  userWeight: number;
}

const ACTIVITIES = [
  { id: 'run', label: 'Бег', met: 9.8 },
  { id: 'walk', label: 'Ходьба', met: 3.5 },
  { id: 'gym', label: 'Тренажерный зал', met: 6.0 },
  { id: 'yoga', label: 'Йога', met: 2.5 },
  { id: 'cycle', label: 'Велосипед', met: 7.5 },
  { id: 'swim', label: 'Плавание', met: 6.0 },
];

const INTENSITIES = [
    { id: 'low', label: 'Легкая', factor: 0.8 },
    { id: 'medium', label: 'Средняя', factor: 1.0 },
    { id: 'high', label: 'Высокая', factor: 1.2 },
];

export const ActivityLogger: React.FC<ActivityLoggerProps> = ({ onSave, onCancel, userWeight }) => {
  const [selectedActivity, setSelectedActivity] = useState(ACTIVITIES[0]);
  const [selectedIntensity, setSelectedIntensity] = useState(INTENSITIES[1]); // Medium default
  const [duration, setDuration] = useState('30');
  const [calories, setCalories] = useState('0');

  // Formula: Calories = MET * IntensityFactor * Weight(kg) * Time(hours)
  useEffect(() => {
    const hours = parseInt(duration) || 0;
    const calculated = Math.round(selectedActivity.met * selectedIntensity.factor * userWeight * (hours / 60));
    setCalories(calculated.toString());
  }, [selectedActivity, selectedIntensity, duration, userWeight]);

  const handleSave = () => {
    onSave({
      id: Date.now().toString(),
      type: `${selectedActivity.label} (${selectedIntensity.label.toLowerCase()})`,
      durationMinutes: parseInt(duration),
      caloriesBurned: parseInt(calories),
      timestamp: Date.now()
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-gray-800">Добавить активность</h2>
        <p className="text-gray-500 text-sm">Что вы сегодня делали?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto no-scrollbar">
        {ACTIVITIES.map((activity) => (
          <button
            key={activity.id}
            onClick={() => setSelectedActivity(activity)}
            className={`p-3 rounded-xl border-2 font-medium transition-all text-sm ${
              selectedActivity.id === activity.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-transparent bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {activity.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="space-y-4">
             {/* Intensity */}
             <div>
                 <label className="text-xs text-gray-500 uppercase font-bold">Интенсивность</label>
                 <div className="flex bg-gray-50 p-1 rounded-lg mt-2">
                     {INTENSITIES.map(intensity => (
                         <button
                            key={intensity.id}
                            onClick={() => setSelectedIntensity(intensity)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                selectedIntensity.id === intensity.id ? 'bg-white shadow text-gray-900' : 'text-gray-400'
                            }`}
                         >
                             {intensity.label}
                         </button>
                     ))}
                 </div>
             </div>

             {/* Duration */}
             <div>
                <label className="text-xs text-gray-500 uppercase font-bold">Длительность (мин)</label>
                <div className="flex items-center gap-4 mt-1">
                <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="text-lg font-bold"
                />
                </div>
            </div>
        </div>
      </Card>

      <div className="bg-orange-50 p-6 rounded-2xl flex flex-col items-center justify-center border border-orange-100 relative">
        <div className="w-full text-center">
            <span className="text-orange-600 font-medium mb-1 block">Сожжено (ккал)</span>
            <input 
               type="number"
               value={calories}
               onChange={(e) => setCalories(e.target.value)}
               className="text-4xl font-bold text-gray-800 bg-transparent text-center focus:outline-none focus:border-b-2 border-orange-300 w-32"
            />
        </div>
        <div className="absolute top-2 right-2 text-[10px] text-orange-400 font-bold bg-white/50 px-2 rounded-full">
            Можно редактировать
        </div>
      </div>

      <div className="mt-auto flex gap-3 pb-20">
        <Button variant="outline" onClick={onCancel} className="flex-1">Отмена</Button>
        <Button onClick={handleSave} className="flex-1 bg-orange-500 hover:bg-orange-600 shadow-orange-200">
          Добавить
        </Button>
      </div>
    </div>
  );
};
