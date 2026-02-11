
import React, { useState, useMemo } from 'react';
import { InventoryItem, StorageLocation, Product, SubLocation } from '../../types';
import CsvImportModal from './CsvImportModal';
import { UNITS } from '../../constants';

interface InventoryViewProps {
  inventory: InventoryItem[];
  locations: StorageLocation[];
  subLocations: SubLocation[];
  products: Product[];
  categoryOrder: string[];
  onUpdateQty: (id: string, delta: number) => void;
  onAddToInventory: (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string) => void;
  onBulkAdd: (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ inventory, locations, subLocations, products, categoryOrder, onUpdateQty, onAddToInventory, onBulkAdd }) => {
  const [activeLocationId, setActiveLocationId] = useState<string>(locations[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState('');
  
  const [newItem, setNewItem] = useState({
    productId: '', itemName: '', category: 'Pantry', variety: '', subLocation: '',
    quantity: '1', unit: 'pc', locationId: activeLocationId
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) || 
                           (item.variety && item.variety.toLowerCase().includes(search.toLowerCase())) ||
                           (item.subLocation && item.subLocation.toLowerCase().includes(search.toLowerCase()));
      const matchesLocation = (search || activeCategory !== 'All') ? true : item.locationId === activeLocationId;
      const matchesCategory = activeCategory === 'All' ? true : item.category === activeCategory;
      return matchesSearch && matchesLocation && matchesCategory;
    });
  }, [inventory, activeLocationId, search, activeCategory]);

  const productSuggestions = useMemo(() => {
    if (newItem.itemName.length < 2) return [];
    return products.filter(p => p.itemName.toLowerCase().includes(newItem.itemName.toLowerCase())).slice(0, 5);
  }, [newItem.itemName, products]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.itemName) {
      onAddToInventory(newItem.productId || 'manual', newItem.itemName, newItem.category, newItem.variety, parseFloat(newItem.quantity) || 0, newItem.unit, newItem.locationId || activeLocationId, newItem.subLocation);
      setIsAdding(false);
      setNewItem({ ...newItem, productId: '', itemName: '', variety: '', subLocation: '', quantity: '1' });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black text-slate-900">Household Stock</h2>
        <div className="flex space-x-2">
          <button onClick={() => setIsImporting(true)} className="bg-white text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all shadow-sm">Bulk Import</button>
          <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all shadow-lg">+ Add Stock</button>
        </div>
      </div>

      <div className="relative">
        <input type="text" placeholder="Search items, varieties, shelves..." className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {locations.map(loc => (
            <button key={loc.id} onClick={() => setActiveLocationId(loc.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeLocationId === loc.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
              {loc.name}
            </button>
          ))}
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <button onClick={() => setActiveCategory('All')} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategory === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-100 text-slate-400 border-transparent'}`}>All Categories</button>
          {categoryOrder.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-transparent'}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center space-x-2">
                   <h4 className="font-black text-slate-800 text-sm truncate uppercase">{item.itemName}</h4>
                   {item.variety && <span className="text-[10px] font-bold text-slate-400">({item.variety})</span>}
                </div>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">
                  {locations.find(l => l.id === item.locationId)?.name} {item.subLocation && `• ${item.subLocation}`}
                </p>
              </div>
              <p className="text-xl font-black text-indigo-600">{item.quantity} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span></p>
            </div>
            <div className="flex items-center bg-slate-50 rounded-2xl p-1">
              <button onClick={() => onUpdateQty(item.id, -1)} className="w-10 h-10 flex items-center justify-center text-slate-400 font-black">-1</button>
              <button onClick={() => { const v = prompt('Subtract:'); if(v) onUpdateQty(item.id, -parseFloat(v)); }} className="flex-1 text-[9px] font-black text-slate-400 uppercase">Custom</button>
              <button onClick={() => onUpdateQty(item.id, 1)} className="w-10 h-10 flex items-center justify-center text-indigo-600 font-black">+1</button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Add Stock</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-300"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" placeholder="Item Name" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                  {categoryOrder.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" placeholder="Variety" value={newItem.variety} onChange={e => setNewItem({...newItem, variety: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                <select className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest">Save Stock</button>
            </form>
          </div>
        </div>
      )}

      {isImporting && (
        <CsvImportModal 
          onClose={() => setIsImporting(false)} 
          onImport={(items) => { onBulkAdd(items); setIsImporting(false); }} 
          locations={locations} 
          activeLocationId={activeLocationId} 
          categoryOrder={categoryOrder} 
        />
      )}
    </div>
  );
};

export default InventoryView;
