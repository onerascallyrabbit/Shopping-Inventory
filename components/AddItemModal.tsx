
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PriceRecord, Product, StoreLocation, CustomCategory, CustomSubCategory } from '../types';
import { identifyProductFromImage } from '../services/geminiService';
import { SUB_CATEGORIES, UNITS, NATIONAL_STORES, DEFAULT_CATEGORIES } from '../constants';

interface AddItemModalProps {
  onClose: () => void;
  onSubmit: (category: string, itemName: string, variety: string, record: Omit<PriceRecord, 'id' | 'date'>, brand?: string, barcode?: string, subCategory?: string) => void;
  onSaveToList: (name: string, qty: number, unit: string) => void;
  initialMode?: 'type' | 'barcode' | 'product' | 'tag';
  products: Product[];
  location?: string;
  savedStores: StoreLocation[];
  lastUsedStore?: string;
  customCategories: CustomCategory[];
  customSubCategories: CustomSubCategory[];
}

const AddItemModal: React.FC<AddItemModalProps> = ({ 
  onClose, onSubmit, products, initialMode = 'type', location = '', savedStores, lastUsedStore,
  customCategories, customSubCategories
}) => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'type' | 'barcode' | 'product' | 'tag'>('type');
  const [formData, setFormData] = useState({
    category: 'Produce', subCategory: '', itemName: '', variety: '', brand: '', barcode: '', store: lastUsedStore || '', price: '', quantity: '1', unit: 'pc'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default to manual entry
  useEffect(() => {
    if (initialMode && initialMode !== 'tag') {
      setInputMode(initialMode);
    } else {
      setInputMode('type');
    }
  }, [initialMode]);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)])).sort();
  }, [customCategories]);

  const subCatsForSelected = useMemo(() => {
    const globals = SUB_CATEGORIES[formData.category] || [];
    const customs = customSubCategories.filter(sc => sc.categoryId === formData.category).map(sc => sc.name);
    return Array.from(new Set([...globals, ...customs])).sort();
  }, [formData.category, customSubCategories]);

  // Real-time Best Price Lookup
  const priceMemory = useMemo(() => {
    if (!formData.itemName || formData.itemName.length < 2) return null;
    
    const term = formData.itemName.toLowerCase();
    const matches = products.filter(p => p.itemName.toLowerCase().includes(term));
    
    if (matches.length === 0) return null;

    const allHistory = matches.flatMap(p => p.history.map(h => ({ ...h, itemName: p.itemName })));
    const sorted = allHistory.sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity));
    
    const best = sorted[0];
    const currentUnitPrice = parseFloat(formData.price) / (parseFloat(formData.quantity) || 1);
    const bestUnitPrice = best.price / best.quantity;

    return {
      best,
      isBetter: currentUnitPrice < bestUnitPrice,
      diff: ((currentUnitPrice / bestUnitPrice) - 1) * 100
    };
  }, [formData.itemName, formData.price, formData.quantity, products]);

  const storeSuggestions = useMemo(() => {
    const historical = products.flatMap(p => p.history.map(h => h.store));
    const saved = savedStores.map(s => s.name);
    const combined = Array.from(new Set([...historical, ...saved, ...NATIONAL_STORES])).filter(Boolean).sort();
    return combined;
  }, [products, savedStores]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        setLoading(true);
        try {
          const analyzed = await identifyProductFromImage(base64, inputMode === 'type' ? 'tag' : inputMode);
          if (analyzed) {
            setFormData(prev => ({
              ...prev,
              category: allCategories.find(c => c.toLowerCase() === (analyzed.category || '').toLowerCase()) || prev.category,
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
        } catch (err) {
          console.error("AI Analysis failed", err);
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      formData.category, formData.itemName, formData.variety, 
      { store: formData.store, price: parseFloat(formData.price), quantity: parseFloat(formData.quantity), unit: formData.unit, image: image || undefined }, 
      formData.brand, formData.barcode, formData.subCategory
    );
  };

  const currentVal = parseFloat(formData.price) / (parseFloat(formData.quantity) || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg h-[95vh] sm:h-auto sm:max-h-[90vh] sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10">
        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b">
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
              {(['type', 'product', 'barcode'] as const).map(mode => (
                <button 
                  key={mode} 
                  type="button"
                  onClick={() => setInputMode(mode)} 
                  className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${inputMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {mode === 'type' ? 'Manual' : mode === 'product' ? 'Photo' : 'UPC'}
                </button>
              ))}
          </div>
          <div className="w-8"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {priceMemory && (
            <div className={`p-4 rounded-[28px] border animate-in slide-in-from-top-4 ${priceMemory.isBetter ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Market Insight</span>
                {formData.price && !isNaN(currentVal) && (
                   <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${priceMemory.isBetter ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                     {priceMemory.isBetter ? 'Beat the record!' : `${Math.abs(priceMemory.diff).toFixed(0)}% more expensive`}
                   </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Best price recorded:</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{priceMemory.best.store} • {new Date(priceMemory.best.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-indigo-600 leading-none">${priceMemory.best.price.toFixed(2)}</p>
                  <p className="text-[9px] font-black text-indigo-300 uppercase mt-1">/{priceMemory.best.quantity}{priceMemory.best.unit}</p>
                </div>
              </div>
            </div>
          )}

          {inputMode !== 'type' && (
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className={`h-48 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer relative group transition-all ${image ? 'bg-slate-900 border-none overflow-hidden' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-indigo-200'}`}
            >
              {image ? (
                <img src={image} className="w-full h-full object-contain" alt="Preview" />
              ) : (
                <div className="text-center space-y-2">
                  <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-500 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                  </div>
                  <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Snap {inputMode === 'barcode' ? 'Barcode' : 'Product'}</p>
                </div>
              )}
              {loading && (
                <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center backdrop-blur-md">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase text-indigo-600 mt-3 animate-pulse">AI is analyzing...</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" capture="environment" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Store</label>
                <input 
                  required 
                  list="store-suggestions-datalist"
                  className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-4 text-sm font-bold placeholder:font-normal focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all" 
                  placeholder="Where are you shopping?" 
                  value={formData.store} 
                  onChange={(e) => setFormData({...formData, store: e.target.value})} 
                />
                <datalist id="store-suggestions-datalist">
                  {storeSuggestions.map((s, idx) => <option key={`${s}-${idx}`} value={s} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                 <input required className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-4 text-sm font-bold focus:bg-white transition-all" placeholder="e.g. Avocado" value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                   <select className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-4 text-sm font-bold appearance-none focus:bg-white transition-all" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value, subCategory: ''})}>
                     {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub-Category</label>
                   <select className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-4 text-sm font-bold appearance-none focus:bg-white transition-all" value={formData.subCategory} onChange={(e) => setFormData({...formData, subCategory: e.target.value})}>
                     <option value="">General</option>
                     {subCatsForSelected.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                   </select>
                </div>
              </div>

              <div className="bg-indigo-50/40 p-5 rounded-[32px] border border-indigo-100/50 space-y-4">
                <div className="flex items-center justify-between px-1">
                   <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Price & Value</span>
                   {formData.price && !isNaN(currentVal) && (
                     <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">
                       ${currentVal.toFixed(3)} / {formData.unit}
                     </span>
                   )}
                </div>
                <div className="flex space-x-2">
                  <div className="flex-[2] space-y-1">
                    <label className="text-[8px] font-black text-indigo-300 uppercase ml-1">Total Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-xs font-black text-indigo-300">$</span>
                      <input required type="number" step="0.01" className="w-full bg-white border-none rounded-xl pl-7 pr-3 py-3 text-xs font-black" placeholder="0.00" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-black text-indigo-300 uppercase ml-1">Qty</label>
                    <input required type="number" step="0.01" className="w-full bg-white border-none rounded-xl px-2 py-3 text-xs font-bold text-center" placeholder="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-black text-indigo-300 uppercase ml-1">Unit</label>
                    <select className="w-full bg-white border-none rounded-xl px-2 py-3 text-[10px] font-black text-indigo-600 appearance-none text-center uppercase" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-100 active:scale-95 hover:bg-indigo-700 transition-all mt-4"
            >
              Log Price Entry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
