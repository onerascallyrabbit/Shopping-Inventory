
import React, { useState, useMemo } from 'react';
import { StorageLocation, SubLocation, ShoppingItem, Product } from '../types';

interface StockPurchasedModalProps {
  item: ShoppingItem;
  products: Product[];
  storageLocations: StorageLocation[];
  subLocations: SubLocation[];
  onClose: () => void;
  onConfirm: (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string, subCategory?: string) => void;
}

const StockPurchasedModal: React.FC<StockPurchasedModalProps> = ({ item, products, storageLocations, subLocations, onClose, onConfirm }) => {
  const product = useMemo(() => {
    return products.find(p => p.id === item.productId) || 
           products.find(p => p.itemName.toLowerCase() === item.name.toLowerCase());
  }, [item, products]);

  const [formData, setFormData] = useState({
    locationId: storageLocations[0]?.id || '',
    subLocation: '',
    quantity: item.neededQuantity.toString(),
    unit: item.unit
  });

  const availableSubLocations = useMemo(() => {
    return subLocations.filter(sl => sl.locationId === formData.locationId);
  }, [subLocations, formData.locationId]);

  const handleConfirm = () => {
    onConfirm(
      item.productId,
      item.name,
      product?.category || 'Other',
      product?.variety || '',
      parseFloat(formData.quantity) || 0,
      formData.unit,
      formData.locationId,
      formData.subLocation,
      product?.subCategory
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">Stock Purchased Item</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium italic">"{item.name}"</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                <input 
                  type="number" step="0.1" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" 
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-700">
                  {formData.unit}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Destination Storage</label>
              <select 
                className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-3.5 text-xs font-bold appearance-none text-indigo-700"
                value={formData.locationId}
                onChange={e => setFormData({...formData, locationId: e.target.value, subLocation: ''})}
              >
                {storageLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Shelf / Sub-Location</label>
              <select 
                className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-3.5 text-xs font-bold appearance-none text-indigo-700"
                value={formData.subLocation}
                onChange={e => setFormData({...formData, subLocation: e.target.value})}
              >
                <option value="">Loose / General</option>
                {availableSubLocations.map(sl => <option key={sl.id} value={sl.name}>{sl.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button 
              onClick={handleConfirm}
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
            >
              Add to Stock
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 text-slate-300 font-black uppercase tracking-widest text-[9px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockPurchasedModal;
