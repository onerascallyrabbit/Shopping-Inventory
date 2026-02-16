
import React, { useState } from 'react';
import { Product } from '../types';

interface DashboardProps {
  products: Product[];
  onAddToList: (name: string, qty: number, unit: string, productId?: string) => void;
}

const UNITS = ['pc', 'oz', 'lb', 'ml', 'lt', 'gal', 'count', 'pack', 'kg', 'g'];

const Dashboard: React.FC<DashboardProps> = ({ products, onAddToList }) => {
  const [promptingId, setPromptingId] = useState<string | null>(null);
  const [promptQty, setPromptQty] = useState('1');
  const [promptUnit, setPromptUnit] = useState('pc');

  const recentRecords = products
    .flatMap(p => p.history.map(h => ({ ...h, product: p })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const bestValueDeals = products
    .map(p => {
      const best = [...p.history].sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity))[0];
      return { ...best, product: p };
    })
    .sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity))
    .slice(0, 5);

  const getFullName = (p: Product) => `${p.itemName}${p.variety ? ` (${p.variety})` : ''}`;

  const handleAddDeal = (deal: any) => {
    onAddToList(getFullName(deal.product), parseFloat(promptQty) || 1, promptUnit, deal.product.id);
    setPromptingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Action Center */}
      <section className="bg-indigo-600 rounded-[32px] p-5 shadow-xl shadow-indigo-100 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-sm font-black uppercase tracking-widest mb-3 opacity-90">Track a Price</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('openAddModal', { detail: { mode: 'type' } }))}
              className="flex-1 flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-md rounded-xl py-2.5 px-3 active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-[0.1em]">Type</span>
            </button>

            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('openAddModal', { detail: { mode: 'product' } }))}
              className="flex-1 flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-md rounded-xl py-2.5 px-3 active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-[0.1em]">Photo</span>
            </button>

            <button 
              onClick={() => document.dispatchEvent(new CustomEvent('openAddModal', { detail: { mode: 'barcode' } }))}
              className="flex-1 flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-md rounded-xl py-2.5 px-3 active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-[0.1em]">UPC</span>
            </button>
          </div>
        </div>
        <svg className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </section>

      {/* Best Values List */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Top Value Deals</h2>
        </div>
        <div className="space-y-2">
          {bestValueDeals.length > 0 ? bestValueDeals.map((deal) => (
            <div key={deal.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-900 truncate text-[11px] uppercase tracking-tight">{getFullName(deal.product)}</h3>
                  <span className="text-[7px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded uppercase tracking-tighter shrink-0">Value</span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <p className="text-[9px] text-slate-400 font-medium truncate uppercase">{deal.store}</p>
                  <span className="text-slate-200 text-[8px]">•</span>
                  <p className="text-[9px] font-black text-indigo-500 tracking-tight">
                    ${deal.price.toFixed(2)} <span className="text-slate-300 font-bold uppercase">/ {deal.quantity}{deal.unit}</span>
                  </p>
                </div>
              </div>
              
              <div className="shrink-0">
                {promptingId === deal.id ? (
                  <div className="flex items-center space-x-1 animate-in fade-in zoom-in-95">
                    <input 
                      type="number" 
                      autoFocus
                      className="w-10 bg-slate-50 border border-slate-100 rounded-lg p-1 text-[10px] font-black text-center"
                      value={promptQty}
                      onChange={(e) => setPromptQty(e.target.value)}
                    />
                    <select 
                      className="w-12 bg-slate-50 border border-slate-100 rounded-lg p-1 text-[10px] font-bold appearance-none text-indigo-600"
                      value={promptUnit}
                      onChange={(e) => setPromptUnit(e.target.value)}
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button 
                      onClick={() => handleAddDeal(deal)}
                      className="p-2 bg-indigo-600 text-white rounded-lg active:scale-95"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button onClick={() => setPromptingId(null)} className="p-2 text-slate-300">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setPromptingId(deal.id);
                      setPromptUnit(deal.unit === 'lb' ? 'pc' : deal.unit);
                      setPromptQty('1');
                    }}
                    className="h-8 w-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl active:scale-95 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="w-full py-8 flex flex-col items-center justify-center bg-slate-50 rounded-[24px] border border-dashed border-slate-200 text-slate-400">
               <svg className="w-8 h-8 opacity-20 mb-2" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
               </svg>
               <p className="text-[9px] font-black uppercase tracking-widest">No deals logged yet.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Recent Activity</h2>
        <div className="space-y-3">
          {recentRecords.length > 0 ? recentRecords.map((record) => (
            <div key={record.id} className="bg-white p-3 rounded-2xl border border-slate-50 shadow-sm flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-indigo-600 overflow-hidden shrink-0 border border-slate-100">
                    {record.image ? (
                      <img src={record.image} alt={record.product.itemName} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-4 h-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-[11px] leading-tight truncate uppercase tracking-tight">{getFullName(record.product)}</h3>
                    <p className="text-[8px] text-slate-400 mt-0.5 font-medium uppercase tracking-wide truncate">{record.store} • {new Date(record.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-slate-900 text-sm leading-none">${record.price.toFixed(2)}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase mt-1">{record.quantity}{record.unit}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-50 flex justify-end">
                {promptingId === record.id ? (
                  <div className="flex items-center space-x-1 animate-in fade-in w-full">
                    <input 
                      type="number" 
                      className="w-10 bg-slate-50 border border-slate-100 rounded-lg p-1 text-[10px] font-black text-center"
                      value={promptQty}
                      onChange={(e) => setPromptQty(e.target.value)}
                    />
                    <select 
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-1 text-[10px] font-bold text-indigo-600"
                      value={promptUnit}
                      onChange={(e) => setPromptUnit(e.target.value)}
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button 
                      onClick={() => {
                        onAddToList(getFullName(record.product), parseFloat(promptQty) || 1, promptUnit, record.product.id);
                        setPromptingId(null);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-lg active:scale-95"
                    >
                      Add
                    </button>
                    <button onClick={() => setPromptingId(null)} className="p-1.5 text-slate-300">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setPromptingId(record.id);
                      setPromptUnit(record.unit === 'lb' ? 'pc' : record.unit);
                      setPromptQty('1');
                    }}
                    className="bg-slate-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg active:scale-95 transition-colors"
                  >
                    Add to List
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-12 flex flex-col items-center">
               <div className="bg-indigo-50 p-4 rounded-full mb-3 text-indigo-200">
                 <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                 </svg>
               </div>
               <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No Activity Yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
