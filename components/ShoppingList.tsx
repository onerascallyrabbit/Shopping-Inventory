
import React, { useState } from 'react';
import { ShoppingItem, Product, StorageLocation, SubLocation } from '../types';
import StockPurchasedModal from './StockPurchasedModal';

interface ShoppingListProps {
  items: ShoppingItem[];
  products: Product[];
  storageLocations: StorageLocation[];
  subLocations: SubLocation[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (name: string, qty: number, unit: string) => void;
  onAddToInventory: (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string, subCategory?: string) => void;
}

const UNITS = ['pc', 'oz', 'lb', 'ml', 'lt', 'gal', 'count', 'pack', 'kg', 'g'];

const ShoppingList: React.FC<ShoppingListProps> = ({ items, products, storageLocations, subLocations, onToggle, onRemove, onAdd, onAddToInventory }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState('pc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stockingItem, setStockingItem] = useState<ShoppingItem | null>(null);

  const getSmartSuggestion = (itemName: string) => {
    const product = products.find(p => p.itemName.toLowerCase().includes(itemName.toLowerCase()));
    if (!product || product.history.length === 0) return null;
    const bestRecord = [...product.history].sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity))[0];
    return {
      store: bestRecord.store,
      price: bestRecord.price,
      unit: bestRecord.unit,
      qty: bestRecord.quantity,
      image: bestRecord.image
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      onAdd(newItemName, parseFloat(newQty) || 1, newUnit);
      setNewItemName('');
      setNewQty('1');
    }
  };

  const handleStockConfirm = (...args: Parameters<typeof onAddToInventory>) => {
    onAddToInventory(...args);
    if (stockingItem) onRemove(stockingItem.id);
  };

  const activeItems = items.filter(i => !i.isCompleted);
  const completedItems = items.filter(i => i.isCompleted);

  return (
    <div className="space-y-6 pb-24">
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-[32px] border border-slate-200 shadow-sm space-y-3">
        <input 
          type="text"
          placeholder="What do you need?..."
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm font-bold placeholder:text-slate-300"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
        />
        
        <div className="flex items-center space-x-2">
          <div className="flex-1 flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-3 py-1">
            <div className="flex-1">
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Qty</label>
              <input type="number" step="0.1" className="w-full bg-transparent border-none p-0 text-sm font-black text-slate-900 focus:ring-0" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
            </div>
            <div className="w-px h-8 bg-slate-200 mx-2"></div>
            <div className="flex-1">
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">Unit</label>
              <select className="w-full bg-transparent border-none p-0 text-sm font-bold text-indigo-600 focus:ring-0 appearance-none" value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="h-14 w-14 text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center active:scale-95">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {activeItems.map(item => {
          const suggestion = getSmartSuggestion(item.name);
          const genericImg = `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=120&h=120&grocery,${item.name}`;

          return (
            <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-[32px] shadow-sm">
              <div className="flex items-center">
                <button 
                  onClick={() => onToggle(item.id)}
                  className="w-8 h-8 rounded-full border-2 border-slate-100 mr-3 shrink-0 active:bg-indigo-50"
                ></button>
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{item.name}</h4>
                  <div 
                    onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                    className="inline-flex items-center mt-0.5 cursor-pointer hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">
                      {item.neededQuantity} {item.unit}
                    </span>
                    <svg className="w-3 h-3 text-slate-300 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setStockingItem(item)}
                    className="text-indigo-400 hover:text-indigo-600 p-2"
                    title="Stock directly"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </button>
                  <button onClick={() => onRemove(item.id)} className="text-slate-200 hover:text-red-400 p-2 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {editingId === item.id && (
                <div className="mt-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                  <div className="flex items-center space-x-2">
                     <div className="flex-1">
                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Update Needed</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number" 
                            className="w-20 bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-xs font-black text-center" 
                            defaultValue={item.neededQuantity}
                            onBlur={(e) => {
                               item.neededQuantity = parseFloat(e.target.value) || 1;
                               setEditingId(null);
                            }}
                          />
                          <select 
                            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 text-xs font-bold appearance-none text-indigo-600"
                            defaultValue={item.unit}
                            onChange={(e) => {
                               item.unit = e.target.value;
                               setEditingId(null);
                            }}
                          >
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                     </div>
                  </div>
                </div>
              )}
              
              {suggestion && (
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 overflow-hidden border border-slate-50">
                      <img src={suggestion.image || genericImg} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Best recorded</p>
                      <p className="text-[10px] font-bold text-slate-600 leading-none">{suggestion.store}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 leading-none">${suggestion.price.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1">/{suggestion.qty}{suggestion.unit}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {completedItems.length > 0 && (
          <div className="pt-6 space-y-2 opacity-50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cart History</h3>
            {completedItems.map(item => (
              <div key={item.id} className="flex items-center bg-slate-100 border border-slate-200 p-3 rounded-2xl group relative overflow-hidden">
                <button onClick={() => onToggle(item.id)} className="w-6 h-6 rounded-full bg-emerald-500 mr-3 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                </button>
                <h4 className="flex-1 font-bold text-slate-500 text-xs line-through uppercase tracking-tight">{item.name}</h4>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setStockingItem(item)}
                    className="p-1.5 text-indigo-400 hover:text-indigo-600 transition-colors"
                    title="Move to Stock"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </button>
                  <button onClick={() => onRemove(item.id)} className="text-slate-300 p-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="bg-indigo-50 w-20 h-20 rounded-[32px] flex items-center justify-center mb-6 text-indigo-300">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-slate-900 font-black text-lg">Trip list is empty</p>
            <p className="text-xs text-slate-400 mt-2 max-w-[200px] font-medium leading-relaxed">Log items to your inventory first, then add them to your trip list with specific counts.</p>
          </div>
        )}
      </div>

      {stockingItem && (
        <StockPurchasedModal 
          item={stockingItem}
          products={products}
          storageLocations={storageLocations}
          subLocations={subLocations}
          onClose={() => setStockingItem(null)}
          onConfirm={handleStockConfirm}
        />
      )}
    </div>
  );
};

export default ShoppingList;
