import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, LoadingSpinner, MarkdownText } from './UI';
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
  const [analysis, setAnalysis] = useState<{name: string, macros: Macros, rating: number, ratingDescription?: string, recommendation: string} | null>(null);
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
      const fullRecommendation = analysis.ratingDescription 
        ? `${analysis.ratingDescription}\n\n${analysis.recommendation}` 
        : analysis.recommendation;

      onSave({
        id: initialEntry ? initialEntry.id : Date.now().toString(),
        name: analysis.name,
        macros: analysis.macros,
        rating: analysis.rating,
        recommendation: fullRecommendation,
        imageUri: image || undefined,
        timestamp: initialEntry ? initialEntry.timestamp : Date.now()
      });
    }
  };

  if (step === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <LoadingSpinner />
        <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-800">Изучаю фото...</h3>
            <p className="text-gray-500 font-medium">ИИ считает калории и оценивает полезность</p>
        </div>
        {image && <img src={image} alt="Preview" className="w-48 h-48 object-cover rounded-3xl opacity-80 shadow-inner" />}
      </div>
    );
  }

  if (step === 'review' && analysis) {
    return (
      <div className="pb-24 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
         {image && (
           <div className="relative h-72 w-full bg-black rounded-3xl overflow-hidden shadow-md group">
             <img src={image} alt="Food" className="w-full h-full object-cover opacity-90" />
             <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl text-sm font-bold shadow-lg text-gray-900 flex items-center gap-2">
               Оценка: 
               <span className={`text-base ${analysis.rating >= 7 ? 'text-green-600' : analysis.rating >= 5 ? 'text-amber-500' : 'text-red-500'}`}>{analysis.rating}/10</span>
             </div>
             
             <button 
               onClick={() => {
                 fileInputRef.current?.click();
               }}
               className="absolute bottom-4 right-4 bg-white/20 text-white p-3 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors border border-white/30"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
           </div>
         )}
         
         <input 
            type="file" 
            accept="image/*" 
            capture="environment"
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
         />

         <Card>
            <div className="mb-6">
              <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Название блюда</label>
              <Input 
                value={analysis.name} 
                onChange={(e) => setAnalysis({...analysis, name: e.target.value})} 
                className="font-bold text-xl mt-2 !bg-white border-gray-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Калории</label>
                 <Input 
                   type="number"
                   value={analysis.macros.calories}
                   onChange={(e) => setAnalysis({...analysis, macros: {...analysis.macros, calories: Number(e.target.value)}})}
                   className="mt-1"
                 />
              </div>
              <div>
                 <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Белки (г)</label>
                 <Input 
                   type="number"
                   value={analysis.macros.protein}
                   onChange={(e) => setAnalysis({...analysis, macros: {...analysis.macros, protein: Number(e.target.value)}})}
                   className="mt-1"
                 />
              </div>
              <div>
                 <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Жиры (г)</label>
                 <Input 
                   type="number"
                   value={analysis.macros.fat}
                   onChange={(e) => setAnalysis({...analysis, macros: {...analysis.macros, fat: Number(e.target.value)}})}
                   className="mt-1"
                 />
              </div>
              <div>
                 <label className="text-xs text-gray-500 uppercase font-bold tracking-wider ml-1">Углеводы (г)</label>
                 <Input 
                   type="number"
                   value={analysis.macros.carbs}
                   onChange={(e) => setAnalysis({...analysis, macros: {...analysis.macros, carbs: Number(e.target.value)}})}
                   className="mt-1"
                 />
              </div>
            </div>
         </Card>

         {/* RATING EXPLANATION */}
         {analysis.ratingDescription && (
            <Card className={`${analysis.rating >= 7 ? 'bg-green-50/50 border-green-100' : analysis.rating >= 5 ? 'bg-amber-50/50 border-amber-100' : 'bg-red-50/50 border-red-100'}`}>
               <h4 className={`font-bold mb-2 flex items-center gap-2 ${analysis.rating >= 7 ? 'text-green-800' : analysis.rating >= 5 ? 'text-amber-800' : 'text-red-800'}`}>
                 <span className="text-2xl">{analysis.rating >= 7 ? '🥦' : analysis.rating >= 5 ? '⚖️' : '🍔'}</span>
                 Анализ полезности
               </h4>
               <div className={`${analysis.rating >= 7 ? 'text-green-900' : analysis.rating >= 5 ? 'text-amber-900' : 'text-red-900'}`}>
                   <MarkdownText text={analysis.ratingDescription} />
               </div>
            </Card>
         )}

         <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
           <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
             <div className="bg-white p-1 rounded-lg text-blue-600 shadow-sm">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             Совет от ИИ
           </h4>
           <div className="text-blue-900/80">
                <MarkdownText text={analysis.recommendation} />
           </div>
         </Card>

         <div className="flex gap-4 pt-4">
           <Button variant="outline" onClick={onCancel} className="flex-1 border-gray-200">Отмена</Button>
           <Button onClick={handleSave} className="flex-[2]">Сохранить запись</Button>
         </div>
      </div>
    );
  }

  // Capture State
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] space-y-8 animate-in zoom-in-95 duration-500">
      <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
          <div className="relative w-32 h-32 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-4 border border-gray-50">
            <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Что на обед?</h2>
        <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">Сделайте фото еды. Я распознаю блюдо, посчитаю калории и дам совет.</p>
      </div>
      
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      
      <div className="flex flex-col gap-3 w-full max-w-xs pt-4">
        <Button onClick={() => fileInputRef.current?.click()} className="w-full text-lg py-4">Сделать фото</Button>
        <Button variant="outline" onClick={onCancel} className="w-full">Вернуться назад</Button>
      </div>
    </div>
  );
};