
import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, StorageLocation } from '../../types';

interface CsvImportModalProps {
  onClose: () => void;
  onImport: (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => void;
  locations: StorageLocation[];
  activeLocationId: string;
  categoryOrder: string[];
}

type MappingField = keyof Omit<InventoryItem, 'id' | 'updatedAt' | 'productId'> | 'ignore';

const CsvImportModal: React.FC<CsvImportModalProps> = ({ onClose, onImport, locations, activeLocationId, categoryOrder }) => {
  const [step, setStep] = useState<'upload' | 'map' | 'review'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<number, MappingField>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const finalItems = useMemo(() => {
    if (step !== 'review') return [];
    return csvRows.map(row => {
      const item: any = { productId: 'manual', subLocation: '' };
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
      if (!item.locationId) item.locationId = activeLocationId || locations[0]?.id;
      if (!item.unit) item.unit = 'pc';
      return item as Omit<InventoryItem, 'id' | 'updatedAt'>;
    }).filter(item => item.itemName);
  }, [csvRows, mappings, step, locations, activeLocationId, categoryOrder, csvHeaders]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-900">Bulk Import Inventory</h3>
          <button onClick={onClose} className="text-slate-300"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        {step === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50">
            <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            <p className="text-sm font-bold text-slate-500">Select a CSV file to begin</p>
            <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Browse Files</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv" />
          </div>
        )}

        {step === 'map' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <p className="text-xs font-bold text-slate-400 uppercase px-1">Map your CSV columns</p>
            {csvHeaders.map((header, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-xs font-black text-slate-700 truncate max-w-[150px]">{header}</span>
                <select className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-bold text-indigo-600 appearance-none" value={mappings[idx]} onChange={e => setMappings({...mappings, [idx]: e.target.value as MappingField})}>
                  <option value="ignore">Ignore</option>
                  <option value="itemName">Item Name</option>
                  <option value="variety">Variety</option>
                  <option value="quantity">Quantity</option>
                  <option value="unit">Unit</option>
                  <option value="category">Category</option>
                </select>
              </div>
            ))}
            <button onClick={() => setStep('review')} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest mt-4">Preview Items</button>
          </div>
        )}

        {step === 'review' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
               {finalItems.map((item, idx) => (
                 <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-[10px]">
                   <span className="font-black text-slate-700">{item.itemName}</span>
                   <span className="font-bold text-slate-400">{item.quantity} {item.unit}</span>
                 </div>
               ))}
            </div>
            <button onClick={() => onImport(finalItems)} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest">Import {finalItems.length} Items</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvImportModal;
