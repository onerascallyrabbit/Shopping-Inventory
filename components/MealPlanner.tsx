
import React, { useState } from 'react';
import { MealIdea, Family } from '../types';

interface MealPlannerProps {
  mealIdeas: MealIdea[];
  loading: boolean;
  onRefresh: () => void;
  onCook: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onAddToList: (name: string, qty: number, unit: string) => void;
  activeFamily: Family | null;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ 
  mealIdeas, loading, onRefresh, onCook, onRate, onAddToList, activeFamily 
}) => {
  const [filter, setFilter] = useState<'all' | 'ready' | 'close'>('all');
  const [selectedMeal, setSelectedMeal] = useState<MealIdea | null>(null);

  const filteredMeals = mealIdeas.filter(m => {
    if (filter === 'ready') return m.matchPercentage === 100;
    if (filter === 'close') return m.matchPercentage >= 75 && m.matchPercentage < 100;
    return true;
  });

  const lastGen = mealIdeas.length > 0 ? new Date(mealIdeas[0].generatedAt) : null;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Meal Ideas</h2>
          {lastGen && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Freshness: {lastGen.toLocaleDateString()} at {lastGen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button 
          onClick={onRefresh} 
          disabled={loading}
          className={`bg-indigo-600 text-white text-[10px] font-black uppercase px-6 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center space-x-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          )}
          <span>{loading ? 'Thinking...' : 'New Ideas'}</span>
        </button>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {(['all', 'ready', 'close'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${filter === f ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
          >
            {f === 'all' ? 'All Ideas' : f === 'ready' ? 'Ready Now' : 'Close Matches'}
          </button>
        ))}
      </div>

      {mealIdeas.length === 0 && !loading ? (
        <div className="text-center py-20 flex flex-col items-center">
           <div className="bg-indigo-50 p-8 rounded-[40px] mb-6 text-indigo-400">
             <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
             </svg>
           </div>
           <p className="text-slate-900 font-black text-sm uppercase tracking-widest">No Meal Ideas Yet</p>
           <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight max-w-[200px] leading-relaxed">
             {!activeFamily ? "Join a Family Hub in Settings to enable shared meal planning." : "Tap 'New Ideas' and let the AI chef analyze your pantry stock!"}
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMeals.map(meal => (
            <div 
              key={meal.id} 
              onClick={() => setSelectedMeal(meal)}
              className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col space-y-4 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest ${meal.matchPercentage === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {meal.matchPercentage === 100 ? '100% Match' : `${meal.matchPercentage}% Stock`}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{meal.difficulty}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{meal.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-indigo-600">{meal.cookTime}m</p>
                  <p className="text-[8px] font-black text-slate-300 uppercase">Cook Time</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">{meal.description}</p>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center -space-x-1.5">
                  {meal.ingredients.slice(0, 4).map((ing, i) => (
                    <div key={i} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black ${ing.isMissing ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {ing.name[0].toUpperCase()}
                    </div>
                  ))}
                  {meal.ingredients.length > 4 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 text-slate-400 text-[8px] font-black flex items-center justify-center">
                      +{meal.ingredients.length - 4}
                    </div>
                  )}
                </div>
                {meal.cookCount > 0 && (
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Cooked {meal.cookCount}x</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMeal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
              <div className="min-w-0">
                <h3 className="text-xl font-black text-slate-900 uppercase truncate pr-4">{selectedMeal.title}</h3>
                <div className="flex items-center space-x-3 mt-1">
                   <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{selectedMeal.cookTime} Minutes</span>
                   <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">•</span>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedMeal.difficulty}</span>
                </div>
              </div>
              <button onClick={() => setSelectedMeal(null)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section className="space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Overview</p>
                 <div className="bg-slate-50 p-5 rounded-[32px] text-xs font-medium text-slate-600 leading-relaxed italic border border-slate-100">
                    "{selectedMeal.description}"
                 </div>
              </section>

              <section className="space-y-4">
                 <div className="flex items-center justify-between px-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredients</p>
                   <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">{selectedMeal.matchPercentage}% Matched</span>
                 </div>
                 <div className="grid grid-cols-1 gap-2">
                    {selectedMeal.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center space-x-3">
                           {ing.isMissing ? (
                             <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                             </div>
                           ) : (
                             <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                             </div>
                           )}
                           <span className={`text-[11px] font-black uppercase tracking-tight ${ing.isMissing ? 'text-slate-400' : 'text-slate-800'}`}>{ing.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                           <span className="text-[10px] font-bold text-slate-400">{ing.quantity} {ing.unit}</span>
                           {ing.isMissing && (
                             <button 
                               onClick={() => onAddToList(ing.name, ing.quantity, ing.unit)}
                               className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg active:scale-90"
                             >
                               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                             </button>
                           )}
                        </div>
                      </div>
                    ))}
                 </div>
              </section>

              <section className="space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cooking Instructions</p>
                 <div className="space-y-6">
                    {selectedMeal.instructions.map((step, i) => (
                      <div key={i} className="flex space-x-4">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                          {i + 1}
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 leading-relaxed pt-0.5">{step}</p>
                      </div>
                    ))}
                 </div>
              </section>

              <section className="pt-4 border-t border-slate-50 space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">How was it?</p>
                 <div className="flex justify-center space-x-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star} 
                        onClick={() => onRate(selectedMeal.id, star)}
                        className={`text-2xl transition-all active:scale-125 ${star <= (selectedMeal.rating || 0) ? 'grayscale-0' : 'grayscale opacity-20'}`}
                      >
                        ⭐
                      </button>
                    ))}
                 </div>
              </section>
            </div>
            
            <div className="p-6 bg-slate-50 border-t flex space-x-3 shrink-0">
               <button 
                 onClick={() => { onCook(selectedMeal.id); setSelectedMeal(null); }}
                 className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-[20px] uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all"
               >
                 I Cooked This
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanner;
