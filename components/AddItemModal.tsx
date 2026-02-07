
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PriceRecord, Product, StoreLocation } from '../types';
import { identifyProductFromImage } from '../services/geminiService';

interface AddItemModalProps {
  onClose: () => void;
  onSubmit: (category: string, itemName: string, variety: string, record: Omit<PriceRecord, 'id' | 'date'>, brand?: string, barcode?: string) => void;
  onSaveToList: (name: string, qty: number, unit: string) => void;
  initialMode?: 'type' | 'barcode' | 'product' | 'tag';
  products: Product[];
  location?: string;
  savedStores: StoreLocation[];
  lastUsedStore?: string;
}

const COMMON_CATEGORIES = [
  "Produce", "Dairy", "Meat", "Seafood", "Deli", "Bakery",
  "Frozen", "Pantry", "Beverages", "Household", "Personal Care",
  "Baby", "Pets", "Other"
];

const UNITS = ['pc', 'oz', 'lb', 'ml', 'lt', 'gal', 'count', 'pack', 'kg', 'g'];

const SEED_DATA: Record<string, Record<string, string[]>> = {
  "Produce": {
    "Onion": ["Yellow", "Red", "White", "Sweet", "Green"],
    "Apple": ["Gala", "Fuji", "Honeycrisp", "Granny Smith", "Pink Lady"],
    "Potato": ["Russet", "Red", "Yukon Gold", "Sweet"],
    "Tomato": ["Roma", "Beefsteak", "Cherry", "On the Vine"],
    "Lettuce": ["Romaine", "Iceberg", "Spinach", "Spring Mix"],
    "Banana": ["Organic", "Standard"]
  },
  "Dairy": {
    "Milk": ["Whole", "2%", "1%", "Skim", "Almond", "Oat", "Soy"],
    "Eggs": ["Large White", "Large Brown", "Cage Free", "Organic"],
    "Cheese": ["Cheddar", "Mozzarella", "Parmesan", "Swiss"],
    "Yogurt": ["Greek", "Plain", "Vanilla", "Strawberry"]
  }
};

const NATIONAL_STORES = ["Walmart", "Target", "Costco", "Whole Foods", "Trader Joe's", "Aldi", "Kroger", "Safeway", "Publix"];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onSubmit, products, initialMode = 'tag', location = '', savedStores, lastUsedStore }) => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'type' | 'barcode' | 'product' | 'tag'>(initialMode);
  const [hasManuallyEditedStore, setHasManuallyEditedStore] = useState(false);
  
  const [formData, setFormData] = useState({
    category: 'Produce',
    itemName: '',
    variety: '',
    brand: '',
    barcode: '',
    store: lastUsedStore || '',
    price: '',
    quantity: '1',
    unit: 'lb'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasManuallyEditedStore) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const nearbyStore = savedStores.find(s => s.lat && s.lng && getDistance(latitude, longitude, s.lat, s.lng) < 0.1);
      if (nearbyStore) {
        setFormData(prev => ({ ...prev, store: nearbyStore.name }));
      }
    });
  }, [savedStores, hasManuallyEditedStore]);

  const suggestedItems = useMemo(() => {
    const seeds = Object.keys(SEED_DATA[formData.category] || {});
    const historical = products.filter(p => p.category === formData.category).map(p => p.itemName);
    return Array.from(new Set([...seeds, ...historical])).sort();
  }, [formData.category, products]);

  const suggestedVarieties = useMemo(() => {
    const seeds = SEED_DATA[formData.category]?.[formData.itemName] || [];
    const historical = products.filter(p => p.category === formData.category && p.itemName === formData.itemName).map(p => p.variety).filter((v): v is string => !!v);
    return Array.from(new Set([...seeds, ...historical])).sort();
  }, [formData.category, formData.itemName, products]);

  const suggestedStores = useMemo(() => {
    const regional: string[] = [];
    if (location?.toUpperCase().includes('TX')) regional.push('H-E-B', 'Randalls');
    if (location?.toUpperCase().includes('CA')) regional.push('Vons', 'Ralphs', 'Safeway');
    
    const historical = products.map(p => p.history.map(h => h.store)).flat();
    const saved = savedStores.map(s => s.name);
    
    const all = [
      ...(lastUsedStore ? [lastUsedStore] : []),
      ...saved,
      ...regional,
      ...NATIONAL_STORES,
      ...historical
    ];
    return Array.from(new Set(all)).filter(Boolean);
  }, [location, products, savedStores, lastUsedStore]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        setLoading(true);
        const analyzed = await identifyProductFromImage(base64, inputMode === 'type' ? 'tag' : inputMode);
        if (analyzed) {
          const suggestedCategory = COMMON_CATEGORIES.find(c => c.toLowerCase() === (analyzed.category || '').toLowerCase()) || "Other";
          setFormData(prev => ({
            ...prev,
            category: suggestedCategory,
            itemName: analyzed.itemName || prev.itemName,
            variety: analyzed.variety || prev.variety || '',
            brand: analyzed.brand || prev.brand,
            barcode: analyzed.barcode || prev.barcode,
            price: analyzed.price?.toString() || prev.price,
            store: analyzed.store || prev.store,
            quantity: analyzed.quantity?.toString() || prev.quantity,
            unit: analyzed.unit || prev.unit,
          }));
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData.category, formData.itemName, formData.variety, { store: formData.store, price: parseFloat(formData.price), quantity: parseFloat(formData.quantity), unit: formData.unit, image: image || undefined }, formData.brand, formData.barcode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-lg h-[95vh] sm:h-auto sm:max-h-[90vh] sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-40 duration-500">
        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-slate-50">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-300 hover:text-slate-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['type', 'product', 'barcode'] as const).map(mode => (
                <button 
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${inputMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >
                  {mode === 'type' ? 'Type' : mode === 'product' ? 'Photo' : 'UPC'}
                </button>
              ))}
          </div>
          <div className="w-8"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-3xl font-black text-slate-900 leading-none">Log Price</h2>
              {inputMode === 'type' && (
                <button 
                  onClick={() => setInputMode('product')}
                  className="p-2 bg-slate-50 rounded-xl text-indigo-500 active:scale-95 transition-transform border border-slate-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              )}
            </div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">AI Enhanced</span>
          </div>

          {inputMode !== 'type' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative h-48 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${image ? 'border-transparent bg-slate-900 overflow-hidden' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
            >
              {image ? (
                <img src={image} alt="Capture" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-2 text-indigo-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Snap {inputMode === 'barcode' ? 'Barcode' : 'Item'}</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" capture="environment" />
            </div>
          )}

          {loading && (
            <div className="bg-indigo-600 p-4 rounded-[24px] flex items-center justify-center space-x-3 shadow-lg shadow-indigo-200 animate-pulse">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-white font-black uppercase tracking-widest">Gemini is analyzing...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 pb-12">
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store Name</label>
                <input 
                  required 
                  list="store-seeds" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/10 transition-shadow" 
                  placeholder="e.g. Walmart, Safeway" 
                  value={formData.store} 
                  onFocus={() => {
                    // Per user request: clear it out on focus to show full list
                    setFormData(prev => ({ ...prev, store: '' }));
                  }}
                  onChange={(e) => {
                    setFormData({...formData, store: e.target.value});
                    setHasManuallyEditedStore(true);
                  }} 
                />
                <datalist id="store-seeds">
                  {suggestedStores.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/10 appearance-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  {COMMON_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item</label>
                  <input required list="item-seeds" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" placeholder="e.g. Apples" value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} />
                  <datalist id="item-seeds">{suggestedItems.map(i => <option key={i} value={i} />)}</datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Variety</label>
                  <input list="variety-seeds" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold" placeholder="e.g. Gala" value={formData.variety} onChange={(e) => setFormData({...formData, variety: e.target.value})} />
                  <datalist id="variety-seeds">{suggestedVarieties.map(v => <option key={v} value={v} />)}</datalist>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-[32px] border border-indigo-50 flex items-center space-x-2">
              <div className="flex-1">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Price</label>
                <div className="relative mt-1">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-300">$</span>
                   <input required type="number" step="0.01" className="w-full bg-white border border-indigo-100 rounded-xl pl-6 pr-2 py-3 text-xs font-black text-indigo-700" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>
              <div className="w-20">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Qty</label>
                <input required type="number" step="0.01" className="w-full bg-white border border-indigo-100 rounded-xl px-2 py-3 mt-1 text-xs font-bold text-indigo-700" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Unit</label>
                <select className="w-full bg-white border border-indigo-100 rounded-xl px-2 py-3 mt-1 text-xs font-bold text-indigo-700 appearance-none" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-black text-base py-5 rounded-[24px] shadow-2xl shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest">
              Save Price History
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
