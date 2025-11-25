import React, { useState } from 'react';
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

export const ActivityLogger: React.FC<ActivityLoggerProps> = ({ onSave, onCancel, userWeight }) => {
  const [selectedActivity, setSelectedActivity] = useState(ACTIVITIES[0]);
  const [duration, setDuration] = useState('30');

  // Formula: Calories = MET * Weight(kg) * Time(hours)
  const calculateCalories = () => {
    const hours = parseInt(duration) / 60;
    return Math.round(selectedActivity.met * userWeight * hours);
  };

  const handleSave = () => {
    const calories = calculateCalories();
    onSave({
      id: Date.now().toString(),
      type: selectedActivity.label,
      durationMinutes: parseInt(duration),
      caloriesBurned: calories,
      timestamp: Date.now()
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-gray-800">Добавить активность</h2>
        <p className="text-gray-500 text-sm">Что вы сегодня делали?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ACTIVITIES.map((activity) => (
          <button
            key={activity.id}
            onClick={() => setSelectedActivity(activity)}
            className={`p-4 rounded-xl border-2 font-medium transition-all ${
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
        <label className="text-xs text-gray-500 uppercase font-bold">Длительность (минут)</label>
        <div className="flex items-center gap-4 mt-2">
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="text-lg font-bold"
          />
          <span className="text-gray-400 font-medium">мин</span>
        </div>
      </Card>

      <div className="bg-orange-50 p-6 rounded-2xl flex flex-col items-center justify-center border border-orange-100">
        <span className="text-orange-600 font-medium mb-1">Вы сожгли примерно</span>
        <span className="text-4xl font-bold text-gray-800">{calculateCalories()}</span>
        <span className="text-gray-400 text-sm uppercase font-bold tracking-wider">ккал</span>
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