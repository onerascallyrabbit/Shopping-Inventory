
import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, StorageLocation, Product, SubLocation } from '../types';

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

const UNITS = ['pc', 'oz', 'lb', 'ml', 'lt', 'gal', 'count', 'pack', 'kg', 'g'];

type MappingField = keyof Omit<InventoryItem, 'id' | 'updatedAt' | 'productId'> | 'ignore';

const InventoryView: React.FC<InventoryViewProps> = ({ inventory, locations, subLocations, products, categoryOrder, onUpdateQty, onAddToInventory, onBulkAdd }) => {
  const [activeLocationId, setActiveLocationId] = useState<string>(locations[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  
  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'review'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<number, MappingField>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState({
    productId: '',
    itemName: '',
    category: 'Pantry',
    variety: '',
    subLocation: '',
    quantity: '1',
    unit: 'pc',
    locationId: activeLocationId
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

  const availableSubLocations = useMemo(() => {
    return subLocations.filter(s => s.locationId === (newItem.locationId || activeLocationId));
  }, [subLocations, newItem.locationId, activeLocationId]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.itemName) {
      onAddToInventory(
        newItem.productId || 'manual',
        newItem.itemName,
        newItem.category,
        newItem.variety,
        parseFloat(newItem.quantity) || 0,
        newItem.unit,
        newItem.locationId || activeLocationId,
        newItem.subLocation
      );
      setIsAdding(false);
      setNewItem({
        productId: '',
        itemName: '',
        category: 'Pantry',
        variety: '',
        subLocation: '',
        quantity: '1',
        unit: 'pc',
        locationId: activeLocationId
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert("CSV must have a header row and at least one data row.");
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(l => l.split(',').map(s => s.trim()));
      setCsvHeaders(headers);
      setCsvRows(rows);
      const initialMappings: Record<number, MappingField> = {};
      headers.forEach((header, index) => {
        const lower = header.toLowerCase();
        if (lower.includes('item') || lower.includes('name') || lower === 'product') initialMappings[index] = 'itemName';
        else if (lower.includes('variety') || lower.includes('type')) initialMappings[index] = 'variety';
        else if (lower.includes('sublocation') || lower.includes('shelf') || lower.includes('bin')) initialMappings[index] = 'subLocation';
        else if (lower.includes('qty') || lower.includes('quantity') || lower.includes('amount')) initialMappings[index] = 'quantity';
        else if (lower.includes('unit')) initialMappings[index] = 'unit';
        else if (lower.includes('category') || lower.includes('group')) initialMappings[index] = 'category';
        else if (lower.includes('location') || lower.includes('storage')) initialMappings[index] = 'locationId';
        else initialMappings[index] = 'ignore';
      });
      setMappings(initialMappings);
      setImportStep('map');
    };
    reader.readAsText(file);
  };

  const finalItemsToImport = useMemo(() => {
    if (importStep !== 'review') return [];
    return csvRows.map(row => {
      const item: any = { productId: 'manual', subLocation: '' };
      csvHeaders.forEach((_, idx) => {
        const field = mappings[idx];
        if (field && field !== 'ignore') {
          let val = row[idx];
          if (field === 'quantity') item[field] = parseFloat(val) || 0;
          else if (field === 'locationId') {
            const loc = locations.find(l => l.name.toLowerCase() === val.toLowerCase()) || 
                        locations.find(l => l.id === activeLocationId) || 
                        locations[0];
            item[field] = loc.id;
          } else if (field === 'category') {
             item[field] = categoryOrder.find(c => c.toLowerCase() === val.toLowerCase()) || "Other";
          } else item[field] = val;
        }
      });
      if (!item.category) item.category = "Other";
      if (!item.locationId) item.locationId = activeLocationId || locations[0]?.id;
      if (!item.unit) item.unit = 'pc';
      return item as Omit<InventoryItem, 'id' | 'updatedAt'>;
    }).filter(item => item.itemName);
  }, [csvRows, mappings, importStep, locations, activeLocationId, categoryOrder]);

  const executeImport = () => {
    onBulkAdd(finalItemsToImport);
    setIsImportModalOpen(false);
    setImportStep('upload');
    alert(`Successfully imported ${finalItemsToImport.length} items.`);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black text-slate-900">Household Stock</h2>
        <div className="flex space-x-2">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-white text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all shadow-sm flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Bulk Import
          </button>
          <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl active:scale-95 transition-all shadow-lg shadow-indigo-100">+ Add Stock</button>
        </div>
      </div>

      <div className="relative">
        <input type="text" placeholder="Search items, varieties, shelves..." className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {locations.map(loc => (
            <button key={loc.id} onClick={() => setActiveLocationId(loc.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeLocationId === loc.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
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
        {filteredInventory.length > 0 ? filteredInventory.map(item => (
          <div key={item.id} className="bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center space-x-2">
                   <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{item.itemName}</h4>
                   {item.variety && <span className="text-[10px] font-bold text-slate-400">({item.variety})</span>}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                   <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-widest">{item.category}</span>
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      {locations.find(l => l.id === item.locationId)?.name || 'Unknown'} 
                      {item.subLocation && <span className="text-indigo-400"> • {item.subLocation}</span>}
                   </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-600 leading-none">{item.quantity} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span></p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 flex items-center bg-slate-50 rounded-2xl p-1">
                <button onClick={() => onUpdateQty(item.id, -1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 active:scale-90 transition-all"><span className="text-xl font-black">-1</span></button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <button onClick={() => { const val = prompt('Amount to subtract:'); if(val) onUpdateQty(item.id, -parseFloat(val)); }} className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-widest py-2">Use Custom</button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <button onClick={() => onUpdateQty(item.id, 1)} className="w-10 h-10 flex items-center justify-center text-indigo-600 active:scale-90 transition-all"><span className="text-xl font-black">+1</span></button>
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
             <div className="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-200"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No stock matches filters</p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-40 duration-500 max-h-[90vh] flex flex-col">
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">Add to Inventory</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-300 p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</label>
                  <div className="relative">
                    <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})} />
                    {productSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 overflow-hidden">
                        {productSuggestions.map(p => (
                          <button key={p.id} type="button" onClick={() => setNewItem({ ...newItem, productId: p.id, itemName: p.itemName, variety: p.variety || '', category: p.category })} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 border-b border-slate-50">{p.itemName} {p.variety ? `(${p.variety})` : ''} <span className="text-[8px] text-slate-300 ml-1 uppercase">{p.category}</span></button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                      {categoryOrder.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Variety</label>
                    <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" value={newItem.variety} placeholder="e.g. Organic" onChange={e => setNewItem({...newItem, variety: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</label>
                    <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</label>
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage Location</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold appearance-none" value={newItem.locationId} onChange={e => setNewItem({...newItem, locationId: e.target.value})}>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shelf / Sub-location</label>
                  <div className="relative">
                    <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" list="subloc-seeds" placeholder="e.g. Blue Crate" value={newItem.subLocation} onChange={e => setNewItem({...newItem, subLocation: e.target.value})} />
                    <datalist id="subloc-seeds">
                      {availableSubLocations.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest active:scale-95 transition-all">Save Stock Item</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;
