import React, { useState, useMemo } from 'react';
import { CellarItem, ConsumptionLog, Family } from '../types';

interface CellarViewProps {
  items: CellarItem[];
  logs: ConsumptionLog[];
  onUpdateQty: (id: string, delta: number) => void;
  onAddItem: (item: Omit<CellarItem, 'id' | 'updatedAt' | 'userId'>) => void;
  onUpdateItem: (id: string, updates: Partial<CellarItem>) => void;
  onRemoveItem: (id: string) => void;
  onLogConsumption: (itemId: string, quantity: number, occasion?: string, notes?: string) => void;
  onAddToList: (name: string, qty: number, unit: string, productId?: string, category?: string) => void;
  activeFamily: Family | null;
}

const CELLAR_CATEGORIES = ['Wine', 'Beer', 'Spirits'] as const;

const CellarView: React.FC<CellarViewProps> = ({
  items, logs, onUpdateQty, onAddItem, onUpdateItem, onRemoveItem, onLogConsumption, onAddToList, activeFamily
}) => {
  const [activeTab, setActiveTab] = useState<'Wine' | 'Beer' | 'Spirits'>('Wine');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<CellarItem | null>(null);
  const [consumingItem, setConsumingItem] = useState<CellarItem | null>(null);
  const [consumptionNotes, setConsumptionNotes] = useState('');
  const [consumptionOccasion, setConsumptionOccasion] = useState('');

  const stats = useMemo(() => {
    const wine = items.filter(i => i.category === 'Wine').reduce((acc, i) => acc + i.quantity, 0);
    const beer = items.filter(i => i.category === 'Beer').reduce((acc, i) => acc + i.quantity, 0);
    const spirits = items.filter(i => i.category === 'Spirits').reduce((acc, i) => acc + i.quantity, 0);
    return { wine, beer, spirits };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(i => i.category === activeTab);
  }, [items, activeTab]);

  const getStockColor = (item: CellarItem) => {
    if (item.quantity <= 0) return 'text-red-500 bg-red-50 border-red-100';
    if (item.quantity <= item.lowStockThreshold) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  };

  const handleConsume = () => {
    if (!consumingItem) return;
    onUpdateQty(consumingItem.id, -1);
    onLogConsumption(consumingItem.id, 1, consumptionOccasion, consumptionNotes);
    setConsumingItem(null);
    setConsumptionNotes('');
    setConsumptionOccasion('');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 px-1">
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Wine</p>
          <p className="text-xl font-black text-slate-900">{stats.wine}</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Beer</p>
          <p className="text-xl font-black text-slate-900">{stats.beer}</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Spirits</p>
          <p className="text-xl font-black text-slate-900">{stats.spirits}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black text-slate-900">Cellar</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl active:scale-95 shadow-lg flex items-center space-x-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
          <span>Add Item</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {CELLAR_CATEGORIES.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveTab(cat)} 
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${activeTab === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-[32px] p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <p className="text-slate-400 text-sm font-medium">No {activeTab.toLowerCase()} in your cellar yet.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm flex items-center justify-between group active:scale-[0.98] transition-transform">
              <div className="flex-1 min-w-0 pr-4" onClick={() => setEditingItem(item)}>
                <div className="flex items-center space-x-2">
                  <h4 className="font-black text-slate-800 text-sm truncate uppercase leading-tight">{item.name}</h4>
                  {item.isOpened && (
                    <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Opened</span>
                  )}
                </div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">{item.type} {item.vintage && `• ${item.vintage}`}</p>
                <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase mt-2 ${getStockColor(item)}`}>
                  <span>{item.quantity <= item.lowStockThreshold ? 'Low Stock' : 'In Stock'}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {item.quantity > 0 && (
                  <button 
                    onClick={() => setConsumingItem(item)}
                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
                )}
                <div className="flex items-center bg-slate-50 rounded-2xl p-1">
                  <button onClick={() => onUpdateQty(item.id, -1)} className="w-10 h-10 text-slate-400 font-black text-lg">-</button>
                  <div className="px-3 text-sm font-black text-slate-900 min-w-[3rem] text-center">
                    {item.quantity}
                    <span className="text-[10px] text-slate-400 ml-1 font-medium">{item.unit}</span>
                  </div>
                  <button onClick={() => onUpdateQty(item.id, 1)} className="w-10 h-10 text-indigo-600 font-black text-lg">+</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Low Stock Alerts */}
      {items.some(i => i.quantity <= i.lowStockThreshold) && (
        <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">Running Low</h3>
          </div>
          <div className="space-y-2">
            {items.filter(i => i.quantity <= i.lowStockThreshold).map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-amber-800">{item.name} ({item.quantity} left)</p>
                <button 
                  onClick={() => onAddToList(item.name, item.lowStockThreshold * 2, item.unit, undefined, 'Cellar Restock')}
                  className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm"
                >
                  Add to List
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingItem) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-black uppercase">{editingItem ? 'Edit Item' : 'Add to Cellar'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Name / Label</label>
                <input 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. Whispering Angel"
                  defaultValue={editingItem?.name || ''} 
                  id="cellar-name"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Category</label>
                <select 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                  defaultValue={editingItem?.category || activeTab}
                  id="cellar-category"
                >
                  {CELLAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Type / Style</label>
                <input 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. Rosé"
                  defaultValue={editingItem?.type || ''} 
                  id="cellar-type"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Quantity</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  defaultValue={editingItem?.quantity || 1} 
                  id="cellar-qty"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Low Stock Alert</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  defaultValue={editingItem?.lowStockThreshold || 2} 
                  id="cellar-threshold"
                />
              </div>
              <div className="col-span-2 flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="cellar-opened" 
                  className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked={editingItem?.isOpened || false}
                />
                <label htmlFor="cellar-opened" className="text-xs font-bold text-slate-700">Mark as Opened / Partial</label>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button 
                onClick={() => { setIsAdding(false); setEditingItem(null); }} 
                className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const name = (document.getElementById('cellar-name') as HTMLInputElement).value;
                  const category = (document.getElementById('cellar-category') as HTMLSelectElement).value as any;
                  const type = (document.getElementById('cellar-type') as HTMLInputElement).value;
                  const quantity = Number((document.getElementById('cellar-qty') as HTMLInputElement).value);
                  const threshold = Number((document.getElementById('cellar-threshold') as HTMLInputElement).value);
                  const isOpened = (document.getElementById('cellar-opened') as HTMLInputElement).checked;

                  if (editingItem) {
                    onUpdateItem(editingItem.id, { name, category, type, quantity, lowStockThreshold: threshold, isOpened });
                  } else {
                    onAddItem({ name, category, type, quantity, lowStockThreshold: threshold, isOpened, unit: category === 'Beer' ? 'cans' : 'bottles', familyId: activeFamily?.id });
                  }
                  setIsAdding(false);
                  setEditingItem(null);
                }} 
                className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200"
              >
                {editingItem ? 'Save Changes' : 'Add to Cellar'}
              </button>
            </div>
            
            {editingItem && (
              <button 
                onClick={() => { if(confirm('Delete this item?')) { onRemoveItem(editingItem.id); setEditingItem(null); } }}
                className="w-full text-red-500 font-black text-[9px] uppercase tracking-[0.2em] pt-2"
              >
                Delete Item
              </button>
            )}
          </div>
        </div>
      )}

      {/* Consume Modal */}
      {consumingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black uppercase">Consume Item</h3>
              <p className="text-slate-400 text-sm font-medium">Enjoying a <span className="text-slate-900 font-black">{consumingItem.name}</span>?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Occasion (Optional)</label>
                <input 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. Dinner with friends"
                  value={consumptionOccasion}
                  onChange={e => setConsumptionOccasion(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Notes / Review</label>
                <textarea 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none" 
                  placeholder="How was it?"
                  value={consumptionNotes}
                  onChange={e => setConsumptionNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setConsumingItem(null)} 
                className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleConsume}
                className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200"
              >
                Log & Consume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellarView;
