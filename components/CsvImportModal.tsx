
import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, StorageLocation, SubLocation } from '../types';
import { UNITS, SUB_CATEGORIES } from '../constants';

interface CsvImportModalProps {
  onClose: () => void;
  onImport: (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => void;
  locations: StorageLocation[];
  subLocations: SubLocation[];
  activeLocationId: string;
  categoryOrder: string[];
}

type MappingField = keyof Omit<InventoryItem, 'id' | 'updatedAt' | 'productId'> | 'ignore';

const CsvImportModal: React.FC<CsvImportModalProps> = ({ onClose, onImport, locations, subLocations, activeLocationId, categoryOrder }) => {
  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<number, MappingField>>({});
  
  const [targetLocationId, setTargetLocationId] = useState(activeLocationId || (locations[0]?.id || ''));
  const [targetSubLocation, setTargetSubLocation] = useState('');
  
  const [reviewItems, setReviewItems] = useState<Omit<InventoryItem, 'id' | 'updatedAt'>[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableSubLocations = useMemo(() => {
    return subLocations.filter(sl => sl.locationId === targetLocationId);
  }, [subLocations, targetLocationId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return alert("CSV must have a header row and at least one data row.");
      
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
      const item: any = { productId: 'manual', subLocation: targetSubLocation };
      csvHeaders.forEach((_, idx) => {
        const field = mappings[idx];
        if (field && field !== 'ignore') {
          let val = row[idx];
          if (field === 'quantity') item[field] = parseFloat(val) || 0;
          else if (field === 'category') item[field] = categoryOrder.find(c => c.toLowerCase() === val.toLowerCase()) || "Other";
          else item[field] = val;
        }
      });
      if (!item.category) item.category = "Other";
      item.locationId = targetLocationId;
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-full max-h-[85vh]">
        <div className="p-6 shrink-0 border-b border-slate-50 flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-slate-900">Bulk Import</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Management</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'upload' && (
            <div className="h-64 flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50">
              <div className="bg-white p-6 rounded-full shadow-sm text-indigo-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Drop your inventory CSV</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Headers required: Item Name, Qty, Unit</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all">Select File</button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv" />
            </div>
          )}

          {step !== 'upload' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 p-4 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Destination</label>
                  <select 
                    className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-700 appearance-none focus:ring-2 focus:ring-indigo-500/20"
                    value={targetLocationId}
                    onChange={e => {
                      const newId = e.target.value;
                      setTargetLocationId(newId);
                      setTargetSubLocation('');
                      if (step === 'review') {
                        setReviewItems(prev => prev.map(item => ({ ...item, locationId: newId, subLocation: '' })));
                      }
                    }}
                  >
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Sub-Destination</label>
                  <select 
                    className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-700 appearance-none focus:ring-2 focus:ring-indigo-500/20"
                    value={targetSubLocation}
                    onChange={e => {
                      const newSub = e.target.value;
                      setTargetSubLocation(newSub);
                      if (step === 'review') {
                        setReviewItems(prev => prev.map(item => ({ ...item, subLocation: newSub })));
                      }
                    }}
                  >
                    <option value="">None / General</option>
                    {availableSubLocations.map(sl => <option key={sl.id} value={sl.name}>{sl.name}</option>)}
                  </select>
                </div>
              </div>

              {step === 'map' && (
                <div className="space-y-4 animate-in fade-in">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Configure Mapping</p>
                  <div className="space-y-2">
                    {csvHeaders.map((header, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-colors shadow-sm">
                        <span className="text-xs font-black text-slate-700 truncate max-w-[150px] uppercase tracking-tight">{header}</span>
                        <select 
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-indigo-600 appearance-none shadow-sm focus:ring-2 focus:ring-indigo-500/10" 
                          value={mappings[idx]} 
                          onChange={e => setMappings({...mappings, [idx]: e.target.value as MappingField})}
                        >
                          <option value="ignore">Skip Column</option>
                          <option value="itemName">Item Name</option>
                          <option value="variety">Variety</option>
                          <option value="quantity">Quantity</option>
                          <option value="unit">Unit</option>
                          <option value="category">Category</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-4 animate-in fade-in">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Verify Items ({reviewItems.length})</p>
                  <div className="space-y-4">
                    {reviewItems.map((item, idx) => (
                      <div key={idx} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4 relative group border-l-4 border-l-indigo-500">
                        <button onClick={() => removeReviewItem(idx)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase">Item Name</label>
                            <input className="w-full bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold" value={item.itemName} onChange={e => updateReviewItem(idx, { itemName: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Category</label>
                            <select className="w-full bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold appearance-none" value={item.category} onChange={e => updateReviewItem(idx, { category: e.target.value, subCategory: '' })}>
                              {categoryOrder.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Sub-Category</label>
                            <select className="w-full bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold appearance-none" value={item.subCategory} onChange={e => updateReviewItem(idx, { subCategory: e.target.value })}>
                              <option value="">General</option>
                              {(SUB_CATEGORIES[item.category] || []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Qty</label>
                            <input type="number" step="0.1" className="w-full bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold" value={item.quantity} onChange={e => updateReviewItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Unit</label>
                            <select className="w-full bg-slate-50 rounded-lg px-3 py-2 text-xs font-bold appearance-none" value={item.unit} onChange={e => updateReviewItem(idx, { unit: e.target.value })}>
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 shrink-0 border-t border-slate-50 bg-slate-50/50">
          {step === 'map' && (
            <button 
              onClick={generateReviewItems} 
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[11px] shadow-lg active:scale-[0.98] transition-all"
            >
              Verify Items
            </button>
          )}
          {step === 'review' && (
            <div className="flex space-x-3">
              <button 
                onClick={() => setStep('map')} 
                className="flex-1 bg-white border border-slate-200 text-slate-600 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]"
              >
                Back
              </button>
              <button 
                onClick={() => onImport(reviewItems)} 
                disabled={!targetLocationId || reviewItems.length === 0}
                className={`flex-[2] text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[11px] shadow-lg transition-all active:scale-[0.98] ${targetLocationId && reviewItems.length > 0 ? 'bg-emerald-600 shadow-emerald-100' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
              >
                Import {reviewItems.length} Items to {locations.find(l => l.id === targetLocationId)?.name || 'Stock'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvImportModal;
