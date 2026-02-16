
import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, StorageLocation, SubLocation, CustomCategory, CustomSubCategory } from '../types';
import { UNITS, SUB_CATEGORIES, DEFAULT_CATEGORIES } from '../constants';

interface CsvImportModalProps {
  onClose: () => void;
  onImport: (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => Promise<void>;
  locations: StorageLocation[];
  subLocations: SubLocation[];
  activeLocationId: string;
  categoryOrder: string[];
  customCategories: CustomCategory[];
  customSubCategories: CustomSubCategory[];
}

type MappingField = keyof Omit<InventoryItem, 'id' | 'updatedAt' | 'productId'> | 'ignore';

const CsvImportModal: React.FC<CsvImportModalProps> = ({ 
  onClose, onImport, locations, subLocations, activeLocationId, categoryOrder,
  customCategories, customSubCategories
}) => {
  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<number, MappingField>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [targetLocationId, setTargetLocationId] = useState(activeLocationId || (locations[0]?.id || ''));
  const [targetSubLocation, setTargetSubLocation] = useState('');
  const [reviewItems, setReviewItems] = useState<Omit<InventoryItem, 'id' | 'updatedAt'>[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allAvailableCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)])).sort();
  }, [customCategories]);

  const availableSubLocations = useMemo(() => {
    return subLocations.filter(sl => sl.locationId === targetLocationId);
  }, [subLocations, targetLocationId]);

  const getSubCategoriesFor = (catName: string) => {
    const globals = SUB_CATEGORIES[catName] || [];
    const customs = customSubCategories.filter(sc => sc.categoryId === catName).map(sc => sc.name);
    return Array.from(new Set([...globals, ...customs])).sort();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return alert("CSV must have a header row and data.");
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(l => l.split(',').map(s => s.trim()));
      setCsvHeaders(headers);
      setCsvRows(rows);
      
      const initialMappings: Record<number, MappingField> = {};
      headers.forEach((header, index) => {
        const lower = header.toLowerCase();
        if (lower.includes('item') || lower.includes('name')) initialMappings[index] = 'itemName';
        else if (lower.includes('variety')) initialMappings[index] = 'variety';
        else if (lower.includes('qty') || lower.includes('quantity')) initialMappings[index] = 'quantity';
        else if (lower.includes('unit')) initialMappings[index] = 'unit';
        else if (lower.includes('category')) initialMappings[index] = 'category';
        else initialMappings[index] = 'ignore';
      });
      setMappings(initialMappings);
      setStep('map');
    };
    reader.readAsText(file);
  };

  const generateReviewItems = () => {
    const items = csvRows.map(row => {
      const item: any = { 
        productId: 'manual', 
        locationId: targetLocationId,
        subLocation: targetSubLocation 
      };
      csvHeaders.forEach((_, idx) => {
        const field = mappings[idx];
        if (field && field !== 'ignore') {
          let val = row[idx];
          if (field === 'quantity') item[field] = parseFloat(val) || 0;
          else if (field === 'category') item[field] = allAvailableCategories.find(c => c.toLowerCase() === val.toLowerCase()) || "Other";
          else item[field] = val;
        }
      });
      if (!item.category) item.category = "Other";
      if (!item.unit) item.unit = 'pc';
      return item as Omit<InventoryItem, 'id' | 'updatedAt'>;
    }).filter(item => item.itemName);
    setReviewItems(items);
    setStep('review');
  };

  const updateReviewItem = (index: number, updates: Partial<Omit<InventoryItem, 'id' | 'updatedAt'>>) => {
    setReviewItems(prev => prev.map((item, idx) => idx === index ? { ...item, ...updates } : item));
  };

  const removeReviewItem = (index: number) => {
    setReviewItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleFinalImport = async () => {
    if (!targetLocationId || reviewItems.length === 0 || isSyncing) return;
    setIsSyncing(true);
    try { await onImport(reviewItems); } catch (err) { setIsSyncing(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900">Bulk Import</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Step {step === 'upload' ? '1: Select File' : step === 'map' ? '2: Configure' : '3: Review'}
            </p>
          </div>
          <button onClick={onClose} disabled={isSyncing} className="p-2 text-slate-300 hover:text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {step === 'upload' && (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] bg-white border-slate-200">
              <div className="bg-indigo-50 p-4 rounded-full mb-4 text-indigo-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-transform">Select CSV File</button>
              <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase">CSV must have a header row</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv" />
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Target Destination Section */}
              <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-80">Bulk Destination</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase ml-1 opacity-70">Main Location</label>
                    <select 
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-bold text-white appearance-none"
                      value={targetLocationId}
                      onChange={e => {
                        setTargetLocationId(e.target.value);
                        setTargetSubLocation('');
                      }}
                    >
                      {locations.map(loc => <option key={loc.id} value={loc.id} className="text-slate-900">{loc.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase ml-1 opacity-70">Shelf / Sub-Location</label>
                    <select 
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-bold text-white appearance-none"
                      value={targetSubLocation}
                      onChange={e => setTargetSubLocation(e.target.value)}
                    >
                      <option value="" className="text-slate-900">General / Loose</option>
                      {availableSubLocations.map(sl => <option key={sl.id} value={sl.name} className="text-slate-900">{sl.name}</option>)}
                    </select>
                  </div>
                </div>
                <p className="mt-4 text-[9px] font-bold italic opacity-60">* All items in this CSV will be placed here initially.</p>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Configure Data Mapping</p>
                <div className="space-y-2">
                  {csvHeaders.map((header, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center space-x-3 truncate">
                        <div className="w-2 h-2 rounded-full bg-indigo-200"></div>
                        <span className="text-xs font-black text-slate-700 truncate">{header}</span>
                      </div>
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-black text-indigo-600 appearance-none min-w-[100px] text-center" 
                        value={mappings[idx]} 
                        onChange={e => setMappings({...mappings, [idx]: e.target.value as MappingField})}
                      >
                        <option value="ignore">Skip</option>
                        <option value="itemName">Item Name</option>
                        <option value="variety">Variety</option>
                        <option value="quantity">Quantity</option>
                        <option value="unit">Unit</option>
                        <option value="category">Category</option>
                      </select>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={generateReviewItems} 
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all mt-4"
                >
                  Generate {csvRows.length} Items for Review
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Review ({reviewItems.length} items)</p>
                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full uppercase">
                  Target: {locations.find(l => l.id === targetLocationId)?.name}
                </span>
              </div>
              
              <div className="space-y-3 pb-24">
                {reviewItems.map((item, idx) => (
                  <div key={idx} className="p-4 bg-white border border-slate-100 rounded-[28px] shadow-sm space-y-4 relative group animate-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                    <button 
                      onClick={() => removeReviewItem(idx)} 
                      className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3 pr-6">
                      <div className="col-span-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Item Name</label>
                        <input 
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10" 
                          value={item.itemName} 
                          onChange={e => updateReviewItem(idx, { itemName: e.target.value })} 
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Category</label>
                        <select 
                          className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-indigo-600 appearance-none" 
                          value={item.category} 
                          onChange={e => updateReviewItem(idx, { category: e.target.value, subCategory: '' })}
                        >
                          {allAvailableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Sub-Category</label>
                        <select 
                          className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-indigo-600 appearance-none" 
                          value={item.subCategory} 
                          onChange={e => updateReviewItem(idx, { subCategory: e.target.value })}
                        >
                          <option value="">None</option>
                          {getSubCategoriesFor(item.category).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Quantity</label>
                        <input 
                          type="number" step="0.1" 
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold" 
                          value={item.quantity} 
                          onChange={e => updateReviewItem(idx, { quantity: parseFloat(e.target.value) || 0 })} 
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Unit</label>
                        <select 
                          className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-indigo-600 appearance-none" 
                          value={item.unit} 
                          onChange={e => updateReviewItem(idx, { unit: e.target.value })}
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-lg border-t border-slate-100 flex justify-center z-[70]">
                <button 
                  onClick={handleFinalImport} 
                  disabled={isSyncing} 
                  className="w-full max-w-lg bg-emerald-600 text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-100 flex items-center justify-center space-x-3 active:scale-95 transition-all"
                >
                  {isSyncing ? (
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      <span>Complete Import ({reviewItems.length} items)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvImportModal;
