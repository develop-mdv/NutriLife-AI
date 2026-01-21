
import React, { useState, useEffect } from 'react';
import { Card, Button, LoadingSpinner, ProgressBar, Input } from './UI';
import { suggestWalkingRoutes, validateAddress } from '../services/geminiService';
import { WalkingRoute } from '../types';

interface WalksProps {
  currentSteps: number;
  dailyGoal: number;
}

type WalkMode = 'nearby' | 'direct' | 'custom_address';

export const Walks: React.FC<WalksProps> = ({ currentSteps, dailyGoal }) => {
  const [activeTab, setActiveTab] = useState<WalkMode>('nearby');
  const [routes, setRoutes] = useState<WalkingRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [stepsNeeded, setStepsNeeded] = useState(0);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [customAddress, setCustomAddress] = useState('');
  
  // Address Verification State
  const [addressVerified, setAddressVerified] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setStepsNeeded(Math.max(0, dailyGoal - currentSteps));
  }, [currentSteps, dailyGoal]);

  const handleVerifyAddress = async () => {
      if (!customAddress.trim()) return;
      setIsVerifying(true);
      setVerifiedAddress(null);
      setLocationError(null);
      
      const normalized = await validateAddress(customAddress);
      
      if (normalized) {
          setVerifiedAddress(normalized);
          setAddressVerified(true);
      } else {
          setLocationError("Не удалось найти такой адрес. Попробуйте уточнить.");
          setAddressVerified(false);
      }
      setIsVerifying(false);
  };

  const handleFindRoutes = () => {
    setLoading(true);
    setLocationError(null);
    setRoutes([]);

    // Check if we need geolocation for the selected mode
    if (activeTab === 'custom_address') {
      if (!verifiedAddress) {
        setLocationError("Сначала подтвердите адрес.");
        setLoading(false);
        return;
      }
      fetchRoutes(null, null, verifiedAddress); 
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Геолокация не поддерживается вашим устройством.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        fetchRoutes(latitude, longitude);
      },
      (error) => {
        console.error(error);
        let msg = "Не удалось получить ваше местоположение.";
        if (error.code === 1) msg = "Разрешите доступ к геолокации, чтобы найти маршруты рядом.";
        setLocationError(msg);
        setLoading(false);
      }
    );
  };

  const fetchRoutes = async (lat: number | null, lng: number | null, addressOverride?: string) => {
    try {
      const fetchedRoutes = await suggestWalkingRoutes(
        lat,
        lng,
        stepsNeeded > 0 ? stepsNeeded : 3000,
        activeTab,
        addressOverride || customAddress
      );
      setRoutes(fetchedRoutes);
    } catch (error) {
      console.error(error);
      setLocationError("Не удалось найти маршруты. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to build Yandex Maps Route Link
  const getYandexLink = (route: WalkingRoute) => {
    let startPoint = "";
    if (activeTab === 'custom_address' && verifiedAddress) {
      startPoint = verifiedAddress;
    } else if (userLocation) {
      startPoint = `${userLocation.lat},${userLocation.lng}`;
    }

    const start = encodeURIComponent(startPoint);
    const routeEnd = encodeURIComponent(route.endLocation);

    let rtext = "";
    
    if (activeTab === 'nearby') {
        // Nearby logic: User -> Park Start -> Park End (or just start if AI gave generic park)
        const routeStart = encodeURIComponent(route.startLocation);
        rtext = `${start}~${routeStart}~${routeEnd}`;
    } else {
        // Direct or Custom logic
        if (route.isRoundTrip) {
            // A -> B -> A
            rtext = `${start}~${routeEnd}~${start}`;
        } else {
            // A -> B
            rtext = `${start}~${routeEnd}`;
        }
    }

    return `https://yandex.ru/maps/?rtext=${rtext}&rtt=pd`;
  };

  const getGoogleLink = (route: WalkingRoute) => {
    let origin = "";
    if (activeTab === 'custom_address' && verifiedAddress) {
       origin = verifiedAddress;
    } else if (userLocation) {
       origin = `${userLocation.lat},${userLocation.lng}`;
    }

    // If round trip, destination is origin. If one way, destination is route end.
    const destination = route.isRoundTrip ? origin : encodeURIComponent(route.endLocation);
    
    // Waypoints
    let waypoints = "";
    if (activeTab === 'nearby') {
        // Walk via the start location of the park
        waypoints = encodeURIComponent(route.startLocation);
    } else if (route.isRoundTrip) {
        // Walk via the turnaround point
        waypoints = encodeURIComponent(route.endLocation);
    }

    let link = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
    if (waypoints) {
        link += `&waypoints=${waypoints}`;
    }
    return link;
  }

  // Reset verification when changing tabs or typing new address
  useEffect(() => {
      setAddressVerified(false);
      setVerifiedAddress(null);
  }, [activeTab]);

  return (
    <div className="pb-24 space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-2">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Прогулки 🚶</h1>
           <p className="text-gray-500 text-sm">Маршруты для вашей цели</p>
        </div>
        <div className="text-right">
           <span className="text-2xl font-bold text-primary">{currentSteps}</span>
           <span className="text-xs text-gray-400 block">из {dailyGoal} шагов</span>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 p-4">
         <div className="mb-2 flex justify-between text-sm font-medium">
             <span className="text-emerald-800">Прогресс цели</span>
             <span className="text-emerald-600">{Math.round((currentSteps/dailyGoal)*100)}%</span>
         </div>
         <ProgressBar current={currentSteps} max={dailyGoal} color="bg-emerald-500" />
         <p className="mt-4 text-emerald-800 text-xs leading-relaxed">
             Осталось: <b>{stepsNeeded > 0 ? stepsNeeded : 0} шагов</b> (~{((Math.max(0, stepsNeeded) * 0.7) / 1000).toFixed(1)} км).
         </p>
      </Card>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('nearby')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'nearby' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Рядом
        </button>
        <button 
          onClick={() => setActiveTab('direct')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'direct' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          От меня
        </button>
        <button 
          onClick={() => setActiveTab('custom_address')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'custom_address' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          От адреса
        </button>
      </div>

      {/* Content based on Tab */}
      <div className="space-y-4">
         {activeTab === 'custom_address' && (
             <div className="space-y-2">
                 <div className="flex gap-2">
                     <Input 
                        placeholder="Введите адрес (дом, офис...)" 
                        value={customAddress}
                        onChange={(e) => {
                            setCustomAddress(e.target.value);
                            setAddressVerified(false);
                        }}
                        className="bg-white"
                     />
                     <Button 
                        onClick={handleVerifyAddress} 
                        variant="secondary"
                        disabled={isVerifying || !customAddress}
                        className="px-4"
                     >
                         {isVerifying ? <LoadingSpinner /> : 'Проверить'}
                     </Button>
                 </div>
                 
                 {verifiedAddress && (
                     <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-sm flex items-start gap-2 animate-in slide-in-from-top-1">
                         <span className="text-emerald-600 mt-0.5">✓</span>
                         <div>
                             <span className="text-gray-500 text-xs block">Адрес найден:</span>
                             <span className="font-bold text-gray-800">{verifiedAddress}</span>
                         </div>
                     </div>
                 )}
             </div>
         )}

         {activeTab === 'nearby' && (
             <p className="text-xs text-gray-500 px-1">
                 ИИ найдет красивые парки и скверы поблизости, где можно погулять.
             </p>
         )}

         {activeTab === 'direct' && (
             <p className="text-xs text-gray-500 px-1">
                 ИИ проложит маршрут от вашего текущего положения до интересного места и обратно.
             </p>
         )}

         <Button 
            onClick={handleFindRoutes} 
            disabled={loading || (activeTab === 'custom_address' && !addressVerified)} 
            className="w-full shadow-emerald-200"
         >
            {loading ? 'Строю маршруты...' : 'Подобрать прогулку'}
         </Button>

         {locationError && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-red-600 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {locationError}
            </div>
        )}
      </div>

      {loading && !locationError && (
        <div className="flex flex-col items-center py-8">
           <LoadingSpinner />
           <p className="text-gray-500 mt-4 animate-pulse text-xs text-center px-8">
               {activeTab === 'nearby' ? "Ищу парки и зеленые зоны..." : "Подбираю идеальную дистанцию..."}
           </p>
        </div>
      )}

      {!loading && routes.length > 0 && (
         <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-bold text-gray-800 ml-1">Найденные маршруты</h3>
            {routes.map((route, idx) => (
               <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none"></div>
                   
                   <div className="flex justify-between items-start mb-2 relative z-10">
                       <h4 className="font-bold text-gray-900 text-lg pr-4">{route.title}</h4>
                       <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                           ~{route.distanceKm} км
                       </span>
                   </div>

                   {/* Route Type Badge */}
                   <div className="mb-3">
                       {route.isRoundTrip ? (
                           <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-purple-100">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                               Туда-обратно
                           </span>
                       ) : (
                           <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-gray-200">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                               В одну сторону
                           </span>
                       )}
                   </div>
                   
                   <p className="text-gray-600 text-sm mb-4 leading-relaxed relative z-10">{route.description}</p>
                   
                   <div className="flex flex-wrap gap-2 mb-4">
                       <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 truncate max-w-full">
                           <b>Старт:</b> {route.startLocation}
                       </div>
                       {route.endLocation && route.endLocation !== route.startLocation && !route.isRoundTrip && (
                           <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 truncate max-w-full">
                               <b>Финиш:</b> {route.endLocation}
                           </div>
                       )}
                       {route.isRoundTrip && (
                           <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 truncate max-w-full">
                               <b>Через:</b> {route.endLocation}
                           </div>
                       )}
                   </div>

                   <div className="flex gap-2">
                       <a 
                         href={getYandexLink(route)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex-1 flex items-center justify-center gap-2 py-3 bg-yellow-400 text-black font-bold rounded-xl text-sm hover:bg-yellow-500 transition-colors shadow-sm active:scale-95"
                       >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          Яндекс
                       </a>
                       <a 
                         href={getGoogleLink(route)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 hover:text-primary transition-colors active:scale-95"
                       >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>
                          Google
                       </a>
                   </div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
};
