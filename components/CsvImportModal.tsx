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

type MappingField = keyof Omit<InventoryItem, 'id' | 'updatedAt' | 'productId'> | 'unit_size' | 'unit_measure' | 'container' | 'style' | 'ignore';

const CsvImportModal: React.FC<CsvImportModalProps> = ({ 
  onClose, onImport, locations, subLocations, activeLocationId, categoryOrder,
  customCategories, customSubCategories
}) => {
  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload');
  const [importMethod, setImportMethod] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
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

  const processTextData = (text: string) => {
    if (!text) return;
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return alert("Data must have a header row and content.");
    
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = lines.slice(1).map(l => l.split(delimiter).map(s => s.trim()));
    
    setCsvHeaders(headers);
    setCsvRows(rows);
    
    const initialMappings: Record<number, MappingField> = {};
    headers.forEach((header, index) => {
      const lower = header.toLowerCase();
      if (lower.includes('item') || lower.includes('name')) initialMappings[index] = 'itemName';
      else if (lower.includes('variety')) initialMappings[index] = 'variety';
      else if (lower.includes('style') || lower.includes('format') || lower.includes('cut')) { initialMappings[index] = 'style'; }
      else if (lower.includes('brand')) initialMappings[index] = 'brand';
      else if (lower.includes('qty') || lower.includes('quantity')) initialMappings[index] = 'quantity';
      else if (lower.includes('unit')) initialMappings[index] = 'unit';
      else if (lower.includes('size') || lower.includes('volume') || lower.includes('weight')) initialMappings[index] = 'unit_size';
      else if (lower.includes('measure') || lower.includes('oz') || lower.includes('grams')) initialMappings[index] = 'unit_measure';
      else if (lower.includes('container') || lower.includes('packaging')) initialMappings[index] = 'container';
      else if (lower.includes('category')) initialMappings[index] = 'category';
      else if (lower.includes('expiry') || lower.includes('expiration')) initialMappings[index] = 'expirationDate';
      else if (lower.includes('purchase')) initialMappings[index] = 'purchaseDate';
      else if (lower.includes('note')) initialMappings[index] = 'notes';
      else initialMappings[index] = 'ignore';
    });
    setMappings(initialMappings);
    setStep('map');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processTextData(text);
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
          const val = row[idx];
          if (field === 'quantity' || field === 'unit_size') {
            item[field] = parseFloat(val) || 0;
          } else if (field === 'category') {
            item[field] = allAvailableCategories.find(
              c => c.toLowerCase() === val.toLowerCase()
            ) || "Other";
          } else {
            item[field] = val;
          }
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
    try { 
      await onImport(reviewItems); 
    } catch (err) { 
      setIsSyncing(false); 
    }
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
            <div className="space-y-6">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button 
                  onClick={() => setImportMethod('file')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importMethod === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  CSV File
                </button>
                <button 
                  onClick={() => setImportMethod('paste')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importMethod === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  Paste Data
                </button>
              </div>

              {importMethod === 'file' ? (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] bg-white border-slate-200">
                  <div className="bg-indigo-50 p-4 rounded-full mb-4 text-indigo-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-transform">Select CSV File</button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border-2 border-slate-100 rounded-[32px] p-4 shadow-sm">
                    <textarea 
                      className="w-full h-64 bg-transparent border-none focus:ring-0 text-xs font-mono text-slate-600 placeholder:text-slate-300 resize-none"
                      placeholder="Paste your spreadsheet data here...&#10;Include the header row"
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => processTextData(pastedText)}
                    disabled={!pastedText.trim()}
                    className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                  >
                    Process Pasted Data
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-80">Bulk Destination</h4>
                <div className="grid grid-cols-2 gap-4">
                  <select 
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-bold text-white appearance-none"
                    value={targetLocationId}
                    onChange={e => setTargetLocationId(e.target.value)}
                  >
                    {locations.map(loc => <option key={loc.id} value={loc.id} className="text-slate-900">{loc.name}</option>)}
                  </select>
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

              <div className="space-y-2">
                {csvHeaders.map((header, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs font-black text-slate-700 truncate">{header}</span>
                    <select 
                      className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-black text-indigo-600 appearance-none min-w-[120px] text-center" 
                      value={mappings[idx]} 
                      onChange={e => setMappings({...mappings, [idx]: e.target.value as MappingField})}
                    >
                      <option value="ignore">Skip</option>
                      <option value="itemName">Item Name</option>
                      <option value="unit_size">Unit Size</option>
                      <option value="unit_measure">Unit Measure</option>
                      <option value="container">Container</option>
                      <option value="quantity">Quantity</option>
                      <option value="brand">Brand</option>
                      <option value="variety">Variety</option>
                      <option value="style">Style (e.g. Diced, Smoked)</option>
                      <option value="category">Category</option>
                      <option value="expirationDate">Expiry</option>
                      <option value="notes">Notes</option>
                    </select>
                  </div>
                ))}
              </div>
              <button 
                onClick={generateReviewItems} 
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-[0.2em] shadow-lg"
              >
                Generate {csvRows.length} Items for Review
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-3 pb-24">
{reviewItems.map((item, idx) => (
  <div key={idx} className="p-4 bg-white border border-slate-100 rounded-[28px] shadow-sm space-y-4 relative group">
    <button onClick={() => removeReviewItem(idx)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
    <div className="grid grid-cols-2 gap-3 pr-6">
      <div className="col-span-2">
        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Item Name</label>
        <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold" value={item.itemName} onChange={e => updateReviewItem(idx, { itemName: e.target.value })} />
      </div>
      
      {/* Brand / Variety / Style Row */}
      <div className="col-span-2 grid grid-cols-3 gap-2">
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Brand</label>
          <input placeholder="Brand" className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold" value={item.brand || ''} onChange={e => updateReviewItem(idx, { brand: e.target.value })} />
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Variety</label>
          <input placeholder="Variety" className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold" value={item.variety || ''} onChange={e => updateReviewItem(idx, { variety: e.target.value })} />
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Style</label>
          <input placeholder="Style" className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold" value={item.style || ''} onChange={e => updateReviewItem(idx, { style: e.target.value })} />
        </div>
      </div>

      {/* Size / Measure / Container Group */}
      <div className="col-span-2 grid grid-cols-3 gap-2 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
          <div>
            <label className="text-[7px] font-black text-indigo-400 uppercase ml-1">Size</label>
            <input type="number" className="w-full bg-white border-none rounded-lg px-2 py-1.5 text-xs font-bold" value={item.unit_size || ''} onChange={e => updateReviewItem(idx, { unit_size: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-[7px] font-black text-indigo-400 uppercase ml-1">Measure</label>
            <input placeholder="oz/g" className="w-full bg-white border-none rounded-lg px-2 py-1.5 text-xs font-bold" value={item.unit_measure || ''} onChange={e => updateReviewItem(idx, { unit_measure: e.target.value })} />
          </div>
          <div>
            <label className="text-[7px] font-black text-indigo-400 uppercase ml-1">Type</label>
            <input placeholder="Can/Bag" className="w-full bg-white border-none rounded-lg px-2 py-1.5 text-xs font-bold" value={item.container || ''} onChange={e => updateReviewItem(idx, { container: e.target.value })} />
          </div>
      </div>

      <div>
        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Quantity</label>
        <input type="number" className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold" value={item.quantity} onChange={e => updateReviewItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
      </div>
      <div>
        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Category</label>
        <select className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-indigo-600 appearance-none" value={item.category} onChange={e => updateReviewItem(idx, { category: e.target.value })}>
          {allAvailableCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  </div>
))}
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t flex justify-center z-[70]">
            <button 
              onClick={handleFinalImport} 
              disabled={isSyncing} 
              className="w-full max-w-lg bg-emerald-600 text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-[0.2em] shadow-xl"
            >
              {isSyncing ? "Processing..." : `Complete Import (${reviewItems.length} items)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvImportModal;
