import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, StorageLocation, Product, SubLocation } from '../types';
import CsvImportModal from './CsvImportModal';
import { UNITS, SUB_CATEGORIES } from '../constants';

interface InventoryViewProps {
  inventory: InventoryItem[];
  locations: StorageLocation[];
  subLocations: SubLocation[];
  products: Product[];
  categoryOrder: string[];
  onUpdateQty: (id: string, delta: number) => void;
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  onRemoveItem: (id: string) => void;
  onAddToInventory: (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string, subCategory?: string) => void;
  onBulkAdd: (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => Promise<void>;
  onAddToList: (name: string, qty: number, unit: string, productId?: string) => void;
}

const InventoryView: React.FC<InventoryViewProps> = ({ 
  inventory, locations, subLocations, products, categoryOrder, 
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
  
  // Drag and Drop State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const [newItem, setNewItem] = useState({
    productId: '', itemName: '', category: 'Pantry', subCategory: '', variety: '', subLocation: '',
    quantity: '1', unit: 'pc', locationId: locations[0]?.id || ''
  });

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
      let groupName = 'General';
      
      if (activeLocationId === 'All') {
        const locName = locations.find(l => l.id === item.locationId)?.name || 'Unknown Location';
        groupName = locName;
      } else {
        groupName = item.subLocation || 'Loose / General';
      }

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(item);
    });
    return groups;
  }, [filteredInventory, activeLocationId, locations]);

  const currentSubLocations = useMemo(() => {
    if (activeLocationId === 'All') return [];
    return subLocations.filter(sl => sl.locationId === activeLocationId);
  }, [subLocations, activeLocationId]);

  const productSuggestions = useMemo(() => {
    if (!newItem.itemName || newItem.itemName.length < 2) return [];
    return products.filter(p => 
      p.itemName.toLowerCase().includes(newItem.itemName.toLowerCase())
    ).slice(0, 5);
  }, [products, newItem.itemName]);

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    // Ensure the drag is initiated correctly in all browsers
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleLocationHoverStart = (locId: string) => {
    if (!draggedItemId) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    
    hoverTimerRef.current = window.setTimeout(() => {
      setActiveLocationId(locId);
      setActiveSubLocation('All');
    }, 600);
  };

  const handleLocationHoverEnd = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleDropOnLocation = (e: React.DragEvent, locId: string) => {
    e.preventDefault();
    if (!draggedItemId) return;
    const item = inventory.find(i => i.id === draggedItemId);
    if (item) {
      const newLocId = locId === 'All' ? locations[0]?.id : locId;
      if (newLocId && item.locationId !== newLocId) {
        onUpdateItem(draggedItemId, { locationId: newLocId, subLocation: '' });
      }
    }
    handleDragEnd();
  };

  const handleDropOnShelf = (e: React.DragEvent, shelfName: string) => {
    e.preventDefault();
    if (!draggedItemId) return;
    const item = inventory.find(i => i.id === draggedItemId);
    if (!item) return;

    if (activeLocationId === 'All') {
      // In 'All' view, shelfName represents the Location Name of the group
      const targetLoc = locations.find(l => l.name === shelfName);
      if (targetLoc && item.locationId !== targetLoc.id) {
        onUpdateItem(draggedItemId, { locationId: targetLoc.id, subLocation: '' });
      }
    } else {
      // In a specific location view, shelfName is the actual sub-location (shelf)
      const newShelf = (shelfName === 'Loose / General' || shelfName === 'All') ? '' : shelfName;
      if (item.subLocation !== newShelf) {
        onUpdateItem(draggedItemId, { 
          locationId: activeLocationId, 
          subLocation: newShelf 
        });
      }
    }
    handleDragEnd();
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.itemName && newItem.locationId) {
      onAddToInventory(
        newItem.productId || 'manual', 
        newItem.itemName, 
        newItem.category, 
        newItem.variety, 
        parseFloat(newItem.quantity) || 0, 
        newItem.unit, 
        newItem.locationId, 
        newItem.subLocation,
        newItem.subCategory
      );
      setIsAdding(false);
      setNewItem({ ...newItem, productId: '', itemName: '', variety: '', subLocation: '', subCategory: '', quantity: '1' });
    }
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateItem(editingItem.id, editingItem);
      setEditingItem(null);
    }
  };

  const handleDepletionConfirm = (addToList: boolean) => {
    if (!depletedItem) return;
    if (addToList) {
      const fullName = `${depletedItem.itemName}${depletedItem.variety ? ` (${depletedItem.variety})` : ''}`;
      onAddToList(fullName, 1, depletedItem.unit, depletedItem.productId);
    }
    onUpdateQty(depletedItem.id, -1);
    setDepletedItem(null);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black text-slate-900">Stock</h2>
        <div className="flex space-x-2">
          <button onClick={() => setIsImporting(true)} className="bg-white text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all shadow-sm">Bulk Import</button>
          <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all shadow-lg">+ Add Stock</button>
        </div>
      </div>

      <div className="relative">
        <input type="text" placeholder="Search items, categories, shelves..." className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      <div className="space-y-3">
        {/* Primary Location Navigation Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <button 
            onClick={() => { setActiveLocationId('All'); setActiveSubLocation('All'); }}
            onDragOver={(e) => { e.preventDefault(); handleLocationHoverStart('All'); }}
            onDragLeave={handleLocationHoverEnd}
            onDrop={(e) => handleDropOnLocation(e, 'All')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeLocationId === 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'} ${draggedItemId ? 'ring-2 ring-slate-300 ring-offset-2 scale-105 z-10' : ''}`}
          >
            All Stock
          </button>
          {locations.map(loc => (
            <button 
              key={loc.id} 
              onClick={() => { setActiveLocationId(loc.id); setActiveSubLocation('All'); }}
              onDragOver={(e) => { e.preventDefault(); handleLocationHoverStart(loc.id); }}
              onDragLeave={handleLocationHoverEnd}
              onDrop={(e) => handleDropOnLocation(e, loc.id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeLocationId === loc.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'} ${draggedItemId ? 'ring-2 ring-indigo-300 ring-offset-2 scale-105 z-10' : ''}`}
            >
              {loc.name}
            </button>
          ))}
        </div>

        {/* Sub-Location (Shelf) Navigation Tabs - visible when a specific location is active */}
        {activeLocationId !== 'All' && (
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
             <button 
              onClick={() => setActiveSubLocation('All')}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnShelf(e, 'All')}
              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeSubLocation === 'All' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-300 border-slate-50'} ${draggedItemId ? 'ring-2 ring-indigo-400 ring-offset-1 scale-105' : ''}`}
            >
              All Shelves
            </button>
            {currentSubLocations.map(sl => (
              <button 
                key={sl.id} 
                onClick={() => setActiveSubLocation(sl.name)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnShelf(e, sl.name)}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeSubLocation === sl.name ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-300 border-slate-50'} ${draggedItemId ? 'ring-2 ring-indigo-400 ring-offset-1 scale-105' : ''}`}
              >
                {sl.name}
              </button>
            ))}
          </div>
        )}

        {/* Category Quick Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <button onClick={() => setActiveCategory('All')} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategory === 'All' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-100 text-slate-400 border-transparent'}`}>All Categories</button>
          {categoryOrder.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {Object.keys(groupedInventory).length > 0 ? Object.entries(groupedInventory).map(([shelfName, items]) => (
          <div 
            key={shelfName} 
            className={`space-y-3 p-2 rounded-[32px] transition-all relative ${draggedItemId ? 'bg-indigo-50/20 border-2 border-dashed border-indigo-200' : 'bg-transparent border-2 border-transparent'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropOnShelf(e, shelfName)}
          >
            {/* Transparent Drop Capture Overlay when dragging - ensures empty groups can still receive drops */}
            {draggedItemId && (
              <div className="absolute inset-0 z-10"></div>
            )}
            
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center justify-between relative z-20">
              <div className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2"></span>
                {shelfName}
              </div>
              <span className="text-slate-300">{items.length} items</span>
            </h3>
            
            <div className="space-y-2 relative z-20">
              {items.map(item => (
                <div 
                  key={item.id} 
                  draggable={!editingItem && !depletedItem}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white border border-slate-100 p-4 rounded-[28px] shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all cursor-grab active:cursor-grabbing ${draggedItemId === item.id ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                       <h4 className="font-black text-slate-800 text-xs truncate uppercase tracking-tight leading-tight">{item.itemName}</h4>
                       {item.variety && <span className="text-[9px] font-bold text-slate-400">({item.variety})</span>}
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                        {item.category}
                      </p>
                      {activeLocationId === 'All' && (
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">• {item.subLocation || 'Loose'}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-slate-50 rounded-2xl p-0.5 border border-slate-100/50 shrink-0">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (item.quantity === 1) {
                          setDepletedItem(item);
                        } else {
                          onUpdateQty(item.id, -1);
                        }
                      }} 
                      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all font-black text-lg"
                    >−</button>
                    
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="px-3 flex flex-col items-center justify-center min-w-[50px] group/qty"
                    >
                       <span className="text-sm font-black text-indigo-600 leading-none">{item.quantity}</span>
                       <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter mt-0.5">{item.unit}</span>
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateQty(item.id, 1); }} 
                      className="w-9 h-9 flex items-center justify-center text-indigo-600 hover:text-indigo-700 active:scale-90 transition-all font-black text-lg"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="py-20 text-center flex flex-col items-center">
             <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
             </div>
             <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No items found with current filters</p>
             {(activeLocationId !== 'All' || activeCategory !== 'All' || search) && (
               <button onClick={() => { setActiveLocationId('All'); setActiveCategory('All'); setSearch(''); }} className="mt-4 text-indigo-600 text-[10px] font-black uppercase underline">Clear All Filters</button>
             )}
          </div>
        )}
      </div>

      {/* Depletion Confirmation Modal */}
      {depletedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Out of Stock?</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  "{depletedItem.itemName}" is now depleted. Add it to your shopping list?
                </p>
              </div>
              <div className="space-y-2 pt-4">
                <button 
                  onClick={() => handleDepletionConfirm(true)}
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
                >
                  Yes, Add to List
                </button>
                <button 
                  onClick={() => handleDepletionConfirm(false)}
                  className="w-full py-4 bg-slate-50 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all"
                >
                  Just Remove
                </button>
                <button 
                  onClick={() => setDepletedItem(null)}
                  className="w-full py-2 text-slate-300 font-black uppercase tracking-widest text-[9px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-20">
            <div className="p-6 shrink-0 border-b border-slate-50 flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-slate-900 uppercase">Edit Stock Item</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precise Control</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="text-slate-300 p-2 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Item Name</label>
                <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold shadow-sm" value={editingItem.itemName} onChange={e => setEditingItem({...editingItem, itemName: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value, subCategory: ''})}>
                    {categoryOrder.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub-Category</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={editingItem.subCategory} onChange={e => setEditingItem({...editingItem, subCategory: e.target.value})}>
                    <option value="">General</option>
                    {(SUB_CATEGORIES[editingItem.category] || []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Location</label>
                  <select className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-4 text-xs font-bold appearance-none text-indigo-700" value={editingItem.locationId} onChange={e => setEditingItem({...editingItem, locationId: e.target.value, subLocation: ''})}>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Shelf</label>
                  <select className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-4 text-xs font-bold appearance-none text-indigo-700" value={editingItem.subLocation} onChange={e => setEditingItem({...editingItem, subLocation: e.target.value})}>
                    <option value="">Loose / General</option>
                    {subLocations.filter(sl => sl.locationId === editingItem.locationId).map(sl => <option key={sl.id} value={sl.name}>{sl.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={editingItem.unit} onChange={e => setEditingItem({...editingItem, unit: e.target.value})}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => { if(confirm('Delete this item?')) onRemoveItem(editingItem.id); setEditingItem(null); }} className="flex-1 bg-red-50 text-red-500 font-black py-5 rounded-[24px] uppercase tracking-widest text-[10px]">Delete Item</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest shadow-lg shadow-indigo-100">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Stock Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-20">
            <div className="p-6 shrink-0 border-b border-slate-50 flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-slate-900">Add Stock</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manual Entry</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="text-slate-300 p-2 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Item Details</label>
                <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="Item Name" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})} />
                {productSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                    {productSuggestions.map(p => (
                      <button key={p.id} type="button" onClick={() => setNewItem({ ...newItem, productId: p.id, itemName: p.itemName, variety: p.variety || '', category: p.category, subCategory: p.subCategory || '' })} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 border-b border-slate-50">{p.itemName}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value, subCategory: ''})}>
                    {categoryOrder.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub-Category</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={newItem.subCategory} onChange={e => setNewItem({...newItem, subCategory: e.target.value})}>
                    <option value="">General</option>
                    {(SUB_CATEGORIES[newItem.category] || []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-[32px] border border-indigo-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Target Storage (Req)</label>
                    <select 
                      required
                      className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-xs font-bold appearance-none text-indigo-700"
                      value={newItem.locationId}
                      onChange={e => setNewItem({...newItem, locationId: e.target.value, subLocation: ''})}
                    >
                      <option value="">Select Location...</option>
                      {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Specific Shelf</label>
                    <select 
                      className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 text-xs font-bold appearance-none text-indigo-700"
                      value={newItem.subLocation}
                      onChange={e => setNewItem({...newItem, subLocation: e.target.value})}
                    >
                      <option value="">No Shelf / General</option>
                      {subLocations.filter(sl => sl.locationId === newItem.locationId).map(sl => <option key={sl.id} value={sl.name}>{sl.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                  <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all">Add to Inventory</button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImporting && (
        <CsvImportModal 
          onClose={() => setIsImporting(false)} 
          onImport={async (items) => { 
            await onBulkAdd(items); 
            setIsImporting(false); 
          }} 
          locations={locations} 
          subLocations={subLocations}
          activeLocationId={activeLocationId === 'All' ? locations[0]?.id : activeLocationId} 
          categoryOrder={categoryOrder} 
        />
      )}
    </div>
  );
};

export default InventoryView;
