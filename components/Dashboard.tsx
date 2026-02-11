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
    .slice(0, 3);

  const getFullName = (p: Product) => `${p.itemName}${p.variety ? ` (${p.variety})` : ''}`;

  const handleAddDeal = (deal: any) => {
    onAddToList(getFullName(deal.product), parseFloat(promptQty) || 1, promptUnit, deal.product.id);
    setPromptingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Action Center */}
      <section className="bg-indigo-600 rounded-[32px] p-6 shadow-xl shadow-indigo-100 text-white">
        <h2 className="text-xl font-black mb-4">Track a Price</h2>
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => document.dispatchEvent(new CustomEvent('openAddModal', { detail: { mode: 'type' } }))}
            className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-3 aspect-square active:scale-95 transition-transform"
          >
            <div className="bg-white/20 p-2 rounded-xl mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Type</span>
          </button>

          <button 
            onClick={() => document.dispatchEvent(new CustomEvent('openAddModal', { detail: { mode: 'product' } }))}
            className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-3 aspect-square active:scale-95 transition-transform"
          >
            <div className="bg-white/20 p-2 rounded-xl mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Photo</span>
          </button>

          <button 
            onClick={() => document.dispatchEvent(new CustomEvent('openAddModal', { detail: { mode: 'barcode' } }))}
            className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-3 aspect-square active:scale-95 transition-transform"
          >
            <div className="bg-white/20 p-2 rounded-xl mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">UPC</span>
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-800">Best Values Found</h2>
        </div>
        <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {bestValueDeals.length > 0 ? bestValueDeals.map((deal) => (
            <div key={deal.id} className="min-w-[200px] bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-widest w-fit">Best Deal</span>
              <h3 className="mt-3 font-bold text-slate-900 truncate text-sm">{getFullName(deal.product)}</h3>
              {deal.product.subCategory && (
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                  {deal.product.category} > {deal.product.subCategory}
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5">{deal.store}</p>
              <div className="mt-3 flex items-baseline space-x-1">
                <span className="text-xl font-black text-slate-900">${deal.price.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400">/ {deal.quantity}{deal.unit}</span>
              </div>
              
              <div className="mt-auto pt-4">
                {promptingId === deal.id ? (
                  <div className="space-y-2 animate-in fade-in zoom-in-95">
                    <div className="flex space-x-1">
                      <input 
                        type="number" 
                        autoFocus
                        className="w-12 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-black text-center"
                        value={promptQty}
                        onChange={(e) => setPromptQty(e.target.value)}
                      />
                      <select 
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-bold appearance-none text-indigo-600"
                        value={promptUnit}
                        onChange={(e) => setPromptUnit(e.target.value)}
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => setPromptingId(null)}
                        className="flex-1 py-1.5 bg-slate-100 text-slate-400 text-[10px] font-black uppercase rounded-lg"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleAddDeal(deal)}
                        className="flex-1 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setPromptingId(deal.id);
                      setPromptUnit(deal.unit === 'lb' ? 'pc' : deal.unit);
                      setPromptQty('1');
                    }}
                    className="w-full py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all"
                  >
                    Add to List
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="w-full py-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400">
               <p className="text-sm font-medium">No deals logged yet.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-800 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {recentRecords.length > 0 ? recentRecords.map((record) => (
            <div key={record.id} className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 overflow-hidden shrink-0">
                    {record.image ? (
                      <img src={record.image} alt={record.product.itemName} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{getFullName(record.product)}</h3>
                    {record.product.subCategory && (
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">
                        {record.product.category} > {record.product.subCategory}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wide">{record.store} • {new Date(record.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-slate-900 text-base">${record.price.toFixed(2)}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">{record.quantity} {record.unit}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-50">
                {promptingId === record.id ? (
                  <div className="flex items-center space-x-2 animate-in fade-in">
                    <input 
                      type="number" 
                      className="w-16 bg-slate-50 border border-slate-100 rounded-lg py-2 px-2 text-xs font-black text-center"
                      value={promptQty}
                      onChange={(e) => setPromptQty(e.target.value)}
                    />
                    <select 
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-lg py-2 px-2 text-xs font-bold text-indigo-600"
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
                      className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg"
                    >
                      Confirm
                    </button>
                    <button onClick={() => setPromptingId(null)} className="p-2 text-slate-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setPromptingId(record.id);
                      setPromptUnit(record.unit === 'lb' ? 'pc' : record.unit);
                      setPromptQty('1');
                    }}
                    className="w-full py-2 bg-slate-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-colors"
                  >
                    Add to Trip List
                  </button>
                )}
              </div>
            </div>
          )) : (
            <p className="text-center text-slate-300 py-8 italic text-sm">Tap a button above to start logging prices!</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
