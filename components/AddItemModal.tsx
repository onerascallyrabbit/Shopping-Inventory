
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PriceRecord, Product, StoreLocation, CustomCategory, CustomSubCategory, Profile } from '../types';
import { identifyProductFromImage } from '../services/geminiService';
import { lookupKrogerProduct, compareKrogerPrices } from '../services/krogerService';
import { SUB_CATEGORIES, UNITS, NATIONAL_STORES, DEFAULT_CATEGORIES, CONTAINER_TYPES } from '../constants';
import * as html5QrCodeNamespace from "html5-qrcode";

interface AddItemModalProps {
  onClose: () => void;
  onSubmit: (category: string, itemName: string, variety: string, record: Omit<PriceRecord, 'id' | 'date'>, brand?: string, barcode?: string, subCategory?: string, origin?: string, grade?: string, style?: string, notes?: string, unitSize?: number, unitMeasure?: string, container?: string) => void;
  onSaveToList: (name: string, qty: number, unit: string) => void;
  onProfileChange?: (updates: Partial<Profile>) => void;
  initialMode?: 'type' | 'barcode' | 'product' | 'tag';
  products: Product[];
  location?: string;
  savedStores: StoreLocation[];
  lastUsedStore?: string;
  customCategories: CustomCategory[];
  customSubCategories: CustomSubCategory[];
  profile: Profile;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ 
  onClose, onSubmit, products, initialMode = 'type', savedStores, lastUsedStore,
  customCategories, customSubCategories, profile, onProfileChange
}) => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'type' | 'barcode' | 'product' | 'tag'>('type');
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Produce', subCategory: '', itemName: '', variety: '', brand: '', barcode: '', store: lastUsedStore || '', price: '', quantity: '1', unit: 'pc', unitSize: '', unitMeasure: 'oz', container: '', origin: '', grade: '', style: '', notes: ''
  });
  const [comparisonResults, setComparisonResults] = useState<any[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<html5QrCodeNamespace.Html5Qrcode | null>(null);

  // Default to manual entry
  useEffect(() => {
    if (initialMode && initialMode !== 'tag') {
      setInputMode(initialMode);
    } else {
      setInputMode('type');
    }
  }, [initialMode]);

  // Scanner Lifecycle
  useEffect(() => {
    if (inputMode === 'barcode' && !isScannerActive) {
      startScanner();
    } else if (inputMode !== 'barcode' && isScannerActive) {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [inputMode]);

  const startScanner = async () => {
  try {
    // Update the constructor call to use the namespace
    const html5QrCodeInstance = new html5QrCodeNamespace.Html5Qrcode("barcode-scanner-viewport");
    scannerRef.current = html5QrCodeInstance;
    setIsScannerActive(true);

    const config = { fps: 10, qrbox: { width: 250, height: 150 } };
    
    await html5QrCodeInstance.start(
      { facingMode: "environment" },
      config,
      async (decodedText) => {
        console.log("Barcode detected:", decodedText);
        // Important: Stop first, then handle data to prevent race conditions
        await stopScanner(); 
        handleBarcodeDetected(decodedText);
      },
      () => { /* ignore frame errors */ }
    );
  } catch (err) {
    console.error("Failed to start scanner", err);
    setIsScannerActive(false);
  }
};


  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsScannerActive(false);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    setFormData(prev => ({ ...prev, barcode }));
    setLoading(true);
    
    try {
      // 1. Try Kroger Lookup first
      const krogerProduct = await lookupKrogerProduct(barcode, profile.krogerStoreId);
      
      if (krogerProduct) {
        console.log("Kroger product found:", krogerProduct);
        const price = krogerProduct.items?.[0]?.price?.regular || 0;
        
        setFormData(prev => ({
          ...prev,
          itemName: krogerProduct.description || prev.itemName,
          brand: krogerProduct.brand || prev.brand,
          price: price > 0 ? price.toString() : prev.price,
          barcode: barcode,
          store: profile.krogerStoreName || prev.store || 'Kroger',
        }));

        if (krogerProduct.images?.[0]?.sizes?.find((s: any) => s.size === 'medium')?.url) {
          setImage(krogerProduct.images[0].sizes.find((s: any) => s.size === 'medium').url);
        }

        // 2. If we have a zip, fetch comparison
        if (profile.zip) {
          const comparison = await compareKrogerPrices(barcode, profile.zip);
          if (comparison && comparison.length > 0) {
            setComparisonResults(comparison);
            setShowComparison(true);
          }
        }
      } else {
        // 2. Fallback to Gemini if Kroger fails
        console.log("Kroger lookup failed, falling back to Gemini...");
        // Since we don't have an image here (it was a real-time scan), 
        // we might want to prompt the user to take a photo or just use the barcode string if Gemini supports it.
        // For now, we'll just keep the barcode and let the user fill the rest or take a photo.
      }
    } catch (err) {
      console.error("Barcode processing error", err);
    } finally {
      setLoading(false);
    }
  };

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
      { 
        store: formData.store, 
        price: parseFloat(formData.price), 
        quantity: parseFloat(formData.quantity), 
        unit: formData.unit, 
        unitSize: parseFloat(formData.unitSize) || undefined,
        unitMeasure: formData.unitMeasure,
        container: formData.container,
        image: image || undefined 
      }, 
      formData.brand, formData.barcode, formData.subCategory, formData.origin, formData.grade, formData.style, formData.notes,
      parseFloat(formData.unitSize) || undefined,
      formData.unitMeasure,
      formData.container
    );
  };

  const currentVal = parseFloat(formData.price) / (parseFloat(formData.quantity) || 1);

  const selectComparisonStore = (res: any) => {
    setFormData(prev => ({
      ...prev,
      store: res.storeName,
      price: res.price.toString()
    }));
    
    // Save to profile as preferred Kroger store
    if (onProfileChange) {
      onProfileChange({
        krogerStoreId: res.storeId,
        krogerStoreName: res.storeName
      });
    }
    
    setShowComparison(false);
  };

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
          {showComparison && comparisonResults.length > 0 && (
            <div className="bg-indigo-600 rounded-[32px] p-6 text-white space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest">Nearby Store Prices</h4>
                <button onClick={() => setShowComparison(false)} className="text-[10px] font-bold uppercase opacity-60">Skip</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {comparisonResults.map((res, idx) => (
                  <button 
                    key={idx}
                    onClick={() => selectComparisonStore(res)}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-3 flex items-center justify-between transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black truncate uppercase">{res.storeName}</p>
                      <p className="text-[9px] font-bold opacity-60 uppercase">{res.distance.toFixed(1)} miles • {res.city}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-black">${res.price.toFixed(2)}</p>
                      {res.onSale && <span className="text-[8px] font-black bg-white text-indigo-600 px-1.5 py-0.5 rounded-full uppercase">Sale</span>}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[9px] font-bold opacity-60 text-center uppercase">Select a store to update your entry</p>
            </div>
          )}

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
              className={`h-64 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer relative group transition-all ${image || isScannerActive ? 'bg-slate-900 border-none overflow-hidden' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-indigo-200'}`}
            >
              {inputMode === 'barcode' && !image ? (
                <div id="barcode-scanner-viewport" className="w-full h-full">
                  {!isScannerActive && (
                    <div onClick={startScanner} className="w-full h-full flex flex-col items-center justify-center space-y-2">
                       <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                      </div>
                      <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Tap to start scanner</p>
                    </div>
                  )}
                </div>
              ) : image ? (
                <div className="relative w-full h-full">
                  <img src={image} className="w-full h-full object-contain" alt="Preview" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setImage(null); if(inputMode === 'barcode') startScanner(); }}
                    className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="text-center space-y-2">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand</label>
                   <input className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-4 text-sm font-bold focus:bg-white transition-all" placeholder="e.g. Tillamook" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Variety</label>
                   <input className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-4 text-sm font-bold focus:bg-white transition-all" placeholder="e.g. Sharp" value={formData.variety} onChange={(e) => setFormData({...formData, variety: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Origin</label>
                   <input className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-4 text-sm font-bold focus:bg-white transition-all" placeholder="e.g. Local" value={formData.origin} onChange={(e) => setFormData({...formData, origin: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade / Style</label>
                   <input className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-4 text-sm font-bold focus:bg-white transition-all" placeholder="e.g. USDA Prime" value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value, style: e.target.value})} />
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
                  <div className="flex-1 space-y-1">
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
                    <label className="text-[8px] font-black text-indigo-300 uppercase ml-1">Unit Size</label>
                    <div className="flex space-x-1">
                      <input type="number" step="0.1" className="w-1/2 bg-white border-none rounded-xl px-1 py-3 text-[10px] font-bold text-center" placeholder="12" value={formData.unitSize} onChange={(e) => setFormData({...formData, unitSize: e.target.value})} />
                      <select className="w-1/2 bg-white border-none rounded-xl px-1 py-3 text-[10px] font-black text-indigo-600 appearance-none text-center" value={formData.unitMeasure} onChange={(e) => setFormData({...formData, unitMeasure: e.target.value})}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-black text-indigo-300 uppercase ml-1">Container</label>
                    <input list="track-container-types" className="w-full bg-white border-none rounded-xl px-2 py-3 text-[10px] font-bold text-center" placeholder="cans" value={formData.container} onChange={(e) => setFormData({...formData, container: e.target.value})} />
                    <datalist id="track-container-types">
                      {CONTAINER_TYPES.map(type => <option key={type} value={type} />)}
                    </datalist>
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
