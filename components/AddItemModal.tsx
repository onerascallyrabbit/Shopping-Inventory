
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
  onClose, onSubmit, products, initialMode = 'tag', location = '', savedStores, lastUsedStore,
  customCategories, customSubCategories
}) => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'type' | 'barcode' | 'product' | 'tag'>(initialMode);
  const [formData, setFormData] = useState({
    category: 'Produce', subCategory: '', itemName: '', variety: '', brand: '', barcode: '', store: lastUsedStore || '', price: '', quantity: '1', unit: 'lb'
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)])).sort();
  }, [customCategories]);

  const subCatsForSelected = useMemo(() => {
    const globals = SUB_CATEGORIES[formData.category] || [];
    const customs = customSubCategories.filter(sc => sc.categoryId === formData.category).map(sc => sc.name);
    return Array.from(new Set([...globals, ...customs])).sort();
  }, [formData.category, customSubCategories]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg h-[95vh] sm:h-auto sm:max-h-[90vh] sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b">
          <button onClick={onClose} className="p-2 text-slate-300"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
          <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['type', 'product', 'barcode'] as const).map(mode => (
                <button key={mode} onClick={() => setInputMode(mode)} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg ${inputMode === mode ? 'bg-white text-indigo-600' : 'text-slate-400'}`}>{mode === 'type' ? 'Type' : mode === 'product' ? 'Photo' : 'UPC'}</button>
              ))}
          </div>
          <div className="w-8"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {inputMode !== 'type' && (
            <div onClick={() => fileInputRef.current?.click()} className={`h-48 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer ${image ? 'bg-slate-900 overflow-hidden' : 'bg-slate-50'}`}>
              {image ? <img src={image} className="w-full h-full object-contain" /> : <p className="text-[11px] font-black uppercase text-slate-400">Snap {inputMode}</p>}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" capture="environment" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <input required className="w-full bg-slate-50 rounded-2xl px-4 py-4 text-sm font-bold" placeholder="Store Name" value={formData.store} onChange={(e) => setFormData({...formData, store: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full bg-slate-50 rounded-2xl px-4 py-4 text-sm font-bold" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value, subCategory: ''})}>
                  {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select className="w-full bg-slate-50 rounded-2xl px-4 py-4 text-sm font-bold" value={formData.subCategory} onChange={(e) => setFormData({...formData, subCategory: e.target.value})}>
                  <option value="">General</option>
                  {subCatsForSelected.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                </select>
              </div>
              <input required className="w-full bg-slate-50 rounded-2xl px-4 py-4 text-sm font-bold" placeholder="Item Name" value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} />
              <div className="bg-indigo-50/50 p-4 rounded-3xl flex space-x-2">
                <input required type="number" step="0.01" className="flex-1 bg-white rounded-xl px-4 py-3 text-xs font-black" placeholder="Price" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                <input required type="number" step="0.01" className="w-20 bg-white rounded-xl px-2 py-3 text-xs font-bold" placeholder="Qty" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                <select className="flex-1 bg-white rounded-xl px-2 py-3 text-xs font-bold" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] uppercase tracking-widest shadow-lg">Save Price History</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
