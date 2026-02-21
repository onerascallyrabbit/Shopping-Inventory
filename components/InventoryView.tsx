import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, StorageLocation, Product, SubLocation, CustomCategory, CustomSubCategory } from '../types';
import CsvImportModal from './CsvImportModal';
import { UNITS, SUB_CATEGORIES, DEFAULT_CATEGORIES } from '../constants';

interface InventoryViewProps {
  inventory: InventoryItem[];
  locations: StorageLocation[];
  subLocations: SubLocation[];
  products: Product[];
  categoryOrder: string[];
  customCategories: CustomCategory[];
  customSubCategories: CustomSubCategory[];
  onUpdateQty: (id: string, delta: number) => void;
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  onRemoveItem: (id: string) => void;
  onAddToInventory: (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string, subCategory?: string) => void;
  onBulkAdd: (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => Promise<void>;
  onAddToList: (name: string, qty: number, unit: string, productId?: string) => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ 
  inventory, locations, subLocations, products, categoryOrder, 
  customCategories, customSubCategories,
  onUpdateQty, onUpdateItem, onRemoveItem, onAddToInventory, onBulkAdd, onAddToList
}) => {
  const [activeLocationId, setActiveLocationId] = useState<string>('All');
  const [activeSubLocation, setActiveSubLocation] = useState<string>('All');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [depletedItem, setDepletedItem] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState('');
  const [recentlyAddedToList, setRecentlyAddedToList] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const allAvailableCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)])).sort();
  }, [customCategories]);

  const getSubCategoriesFor = (catName: string) => {
    const globals = SUB_CATEGORIES[catName] || [];
    const customs = customSubCategories.filter(sc => sc.categoryId === catName).map(sc => sc.name);
    return Array.from(new Set([...globals, ...customs])).sort();
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) || 
                           (item.variety && item.variety.toLowerCase().includes(search.toLowerCase())) ||
                           (item.subLocation && item.subLocation.toLowerCase().includes(search.toLowerCase())) ||
                           (item.subCategory && item.subCategory.toLowerCase().includes(search.toLowerCase()));
      const matchesLocation = activeLocationId === 'All' ? true : item.locationId === activeLocationId;
      const matchesSubLocation = activeSubLocation === 'All' ? true : item.subLocation === activeSubLocation;
      const matchesCategory = activeCategory === 'All' ? true : item.category === activeCategory;
      return matchesSearch && matchesLocation && matchesSubLocation && matchesCategory;
    });
  }, [inventory, activeLocationId, activeSubLocation, search, activeCategory]);

  const groupedInventory = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredInventory.forEach(item => {
      let groupName = activeLocationId === 'All' ? (locations.find(l => l.id === item.locationId)?.name || 'Unknown') : (item.subLocation || 'Loose / General');
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(item);
    });
    return groups;
  }, [filteredInventory, activeLocationId, locations]);

  const handleCopyNames = () => {
    if (filteredInventory.length === 0) return;
    
    // Deduplicate names to provide a clean CSV list
    const names = Array.from(new Set(filteredInventory.map(item => item.itemName))).sort();
    const csvList = names.join(', ');
    
    navigator.clipboard.writeText(csvList).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleUpdateQty = (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === 0 && item.quantity > 0) {
      setDepletedItem(item);
    }
    onUpdateQty(id, delta);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col space-y-4 px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Stock</h2>
          <div className="flex items-center space-x-1.5">
            <button 
              onClick={handleCopyNames}
              disabled={filteredInventory.length === 0}
              title="Copy Names"
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all border ${isCopied ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 active:scale-95 shadow-sm'} ${filteredInventory.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              {isCopied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
              )}
            </button>
            <button 
              onClick={() => setIsImporting(true)} 
              title="Bulk Import"
              className="bg-white text-indigo-600 border border-indigo-100 w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            </button>
            <button 
              onClick={() => setIsAdding(true)} 
              className="bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl active:scale-95 shadow-lg flex items-center space-x-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              <span className="hidden xs:inline">Add</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <input type="text" placeholder="Search items, shelves..." className="w-full bg-white border rounded-2xl py-3 pl-10 pr-4 text-sm shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      <div className="space-y-3">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <button onClick={() => setActiveLocationId('All')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${activeLocationId === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>All Stock</button>
          {locations.map(loc => <button key={loc.id} onClick={() => setActiveLocationId(loc.id)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${activeLocationId === loc.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100'}`}>{loc.name}</button>)}
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <button onClick={() => setActiveCategory('All')} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border ${activeCategory === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-100 text-slate-400 border-transparent'}`}>All Categories</button>
          {allAvailableCategories.map(cat => <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border ${activeCategory === cat ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>{cat}</button>)}
        </div>
      </div>

      <div className="space-y-10">
        {Object.entries(groupedInventory).map(([shelfName, items]) => (
          <div key={shelfName} className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{shelfName}</h3>
            <div className="space-y-2">
              {(items as any[]).map(item => (
                <div key={item.id} className="bg-white border p-4 rounded-[28px] shadow-sm flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-black text-slate-800 text-xs truncate uppercase leading-tight">{item.itemName}</h4>
                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">{item.category} {item.subCategory && `> ${item.subCategory}`}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => { onAddToList(item.itemName, 1, item.unit, item.productId); setRecentlyAddedToList(item.id); setTimeout(() => setRecentlyAddedToList(null), 2000); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${recentlyAddedToList === item.id ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}>
                      {recentlyAddedToList === item.id ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>}
                    </button>
                    <div className="flex items-center bg-slate-50 rounded-xl p-0.5">
                      <button onClick={() => handleUpdateQty(item.id, -1)} className="w-8 h-8 text-slate-400 font-black">-</button>
                      <button onClick={() => setEditingItem(item)} className="px-2 text-xs font-black text-indigo-600">{item.quantity} {item.unit}</button>
                      <button onClick={() => handleUpdateQty(item.id, 1)} className="w-8 h-8 text-indigo-600 font-black">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-6 space-y-6">
            <h3 className="text-xl font-black uppercase">Edit Item</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase">Item Name</label><input className="w-full bg-slate-50 rounded-xl px-4 py-3 font-bold" value={editingItem.itemName} onChange={e => setEditingItem({...editingItem, itemName: e.target.value})} /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase">Category</label><select className="w-full bg-slate-50 rounded-xl px-4 py-3 font-bold" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value, subCategory: ''})}>{allAvailableCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase">Sub-Category</label><select className="w-full bg-slate-50 rounded-xl px-4 py-3 font-bold" value={editingItem.subCategory} onChange={e => setEditingItem({...editingItem, subCategory: e.target.value})}><option value="">None</option>{getSubCategoriesFor(editingItem.category).map(sc => <option key={sc} value={sc}>{sc}</option>)}</select></div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setEditingItem(null)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[10px]">Cancel</button>
              <button onClick={() => { onUpdateItem(editingItem.id, editingItem); setEditingItem(null); }} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase text-[10px]">Save</button>
            </div>
          </div>
        </div>
      )}

      {depletedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase text-slate-900">Out of Stock</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                <span className="font-black text-slate-900">{depletedItem.itemName}</span> is now empty. Add it to your shopping list?
              </p>
            </div>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => {
                  onAddToList(depletedItem.itemName, 1, depletedItem.unit, depletedItem.productId);
                  setDepletedItem(null);
                }}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-transform"
              >
                Add to List
              </button>
              <button 
                onClick={() => setDepletedItem(null)}
                className="w-full bg-slate-50 text-slate-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-transform"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {isImporting && (
        <CsvImportModal 
          onClose={() => setIsImporting(false)} 
          onImport={async (items) => { await onBulkAdd(items); setIsImporting(false); }} 
          locations={locations} subLocations={subLocations} activeLocationId={activeLocationId === 'All' ? locations[0]?.id : activeLocationId} categoryOrder={categoryOrder}
          customCategories={customCategories} customSubCategories={customSubCategories}
        />
      )}
    </div>
  );
};

export default InventoryView;
