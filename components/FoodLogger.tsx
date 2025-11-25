import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, LoadingSpinner } from './UI';
import { analyzeFoodImage } from '../services/geminiService';
import { FoodEntry, Macros } from '../types';

interface FoodLoggerProps {
  onSave: (entry: FoodEntry) => void;
  onCancel: () => void;
  initialEntry?: FoodEntry | null;
}

export const FoodLogger: React.FC<FoodLoggerProps> = ({ onSave, onCancel, initialEntry }) => {
  const [step, setStep] = useState<'capture' | 'analyzing' | 'review'>('capture');
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{name: string, macros: Macros, rating: number, recommendation: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialEntry) {
      setStep('review');
      setImage(initialEntry.imageUri || null);
      setAnalysis({
        name: initialEntry.name,
        macros: initialEntry.macros,
        rating: initialEntry.rating,
        recommendation: initialEntry.recommendation
      });
    }
  }, [initialEntry]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Strip prefix for API
        const base64Data = base64.split(',')[1];
        setImage(base64);
        setStep('analyzing');
        performAnalysis(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const performAnalysis = async (base64Data: string) => {
    try {
      const result = await analyzeFoodImage(base64Data);
      setAnalysis(result);
      setStep('review');
    } catch (err) {
      alert("Не удалось проанализировать еду. Пожалуйста, попробуйте снова.");
      setStep('capture');
    }
  };

  const handleSave = () => {
    if (analysis) {
      onSave({
        id: initialEntry ? initialEntry.id : Date.now().toString(),
        name: analysis.name,
        macros: analysis.macros,
        rating: analysis.rating,
        recommendation: analysis.recommendation,
        imageUri: image || undefined,
        timestamp: initialEntry ? initialEntry.timestamp : Date.now()
      });
    }
  };

  if (step === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <LoadingSpinner />
        <p className="text-gray-600 font-medium animate-pulse">Советуемся с ИИ-диетологом...</p>
        {image && <img src={image} alt="Preview" className="w-32 h-32 object-cover rounded-xl opacity-50" />}
      </div>
    );
  }

  if (step === 'review' && analysis) {
    return (
      <div className="pb-24 space-y-6">
         {image && (
           <div className="relative h-64 w-full bg-black rounded-2xl overflow-hidden shadow-lg group">
             <img src={image} alt="Food" className="w-full h-full object-cover" />
             <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold shadow">
               Оценка здоровья: <span className={analysis.rating >= 7 ? 'text-green-600' : 'text-orange-500'}>{analysis.rating}/10</span>
             </div>
             {/* Retake photo button */}
             <button 
               onClick={() => {
                 fileInputRef.current?.click();
               }}
               className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur hover:bg-black/70 transition-colors"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
           </div>
         )}
         
         {/* Hidden input for retaking photo */}
         <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
         />

         <Card>
            <div className="mb-4">
              <label className="text-xs text-gray-500 uppercase font-bold">Название блюда</label>
              <Input 
                value={analysis.name} 
                onChange={(e) => setAnalysis({...analysis, name: e.target.value})} 
                className="font-bold text-lg mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-xs text-gray-500 uppercase font-bold">Калории</label>
                 <Input 
                   type="number"
                   value={analysis.macros.calories}
                   onChange={(e) => setAnalysis({...analysis, macros: {...analysis.macros, calories: Number(e.target.value)}})}
                 />
              </div>
              <div>
                 <label className="text-xs text-gray-500 uppercase font-bold">Белки (г)</label>
                 <Input 
                   type="number"
                   value={analysis.macros.protein}
                   onChange={(e) => setAnalysis({...analysis, macros: {...analysis.macros, protein: Number(e.target.value)}})}
                 />
              </div>
              <div>
                 <label className="text-xs text-gray-500 uppercase font-bold">Жиры (г)</label>
                 <Input 
                   type="number"
                   value={analysis.macros.fat}
                   onChange={(e) => setAnalysis({...analysis, macros: {...analysis.macros, fat: Number(e.target.value)}})}
                 />
              </div>
              <div>
                 <label className="text-xs text-gray-500 uppercase font-bold">Углеводы (г)</label>
                 <Input 
                   type="number"
                   value={analysis.macros.carbs}
                   onChange={(e) => setAnalysis({...analysis, macros: {...analysis.macros, carbs: Number(e.target.value)}})}
                 />
              </div>
            </div>
         </Card>

         <Card className="bg-blue-50 border-blue-100">
           <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-2">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             Рекомендация ИИ
           </h4>
           <p className="text-blue-900 text-sm leading-relaxed">{analysis.recommendation}</p>
         </Card>

         <div className="flex gap-3">
           <Button variant="outline" onClick={onCancel} className="flex-1">Отмена</Button>
           <Button onClick={handleSave} className="flex-1">Сохранить</Button>
         </div>
      </div>
    );
  }

  // Capture State
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] space-y-6">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Что вы едите?</h2>
      <p className="text-center text-gray-500 max-w-xs">Сфотографируйте еду. ИИ посчитает калории, макронутриенты и оценит полезность.</p>
      
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={() => fileInputRef.current?.click()}>Сделать фото</Button>
        <Button variant="outline" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
};