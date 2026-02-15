
import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingItem, Product, StoreLocation, Vehicle, StorageLocation, SubLocation } from '../types';
import StockPurchasedModal from './StockPurchasedModal';

interface ShopPlanProps {
  items: ShoppingItem[];
  products: Product[];
  stores: StoreLocation[];
  vehicles: Vehicle[];
  activeVehicleId: string;
  gasPrice: number;
  storageLocations: StorageLocation[];
  subLocations: SubLocation[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOverrideStore: (id: string, store: string | undefined) => void;
  onAddToInventory: (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string, subCategory?: string) => void;
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const ShopPlan: React.FC<ShopPlanProps> = ({ items, products, stores, vehicles, activeVehicleId, gasPrice, storageLocations, subLocations, onToggle, onRemove, onOverrideStore, onAddToInventory }) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [stockingItem, setStockingItem] = useState<ShoppingItem | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.log('Geolocation error:', err);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const activeVehicle = useMemo(() => vehicles.find(v => v.id === activeVehicleId), [vehicles, activeVehicleId]);

  const activeItems = useMemo(() => items.filter(i => !i.isCompleted), [items]);
  const completedItems = useMemo(() => items.filter(i => i.isCompleted), [items]);

  const groupedByStore = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};

    activeItems.forEach(item => {
      let targetStore = 'Unknown / Any Store';

      if (item.manualStore) {
        targetStore = item.manualStore;
      } else {
        const product = products.find(p => p.id === item.productId) || 
                        products.find(p => p.itemName.toLowerCase() === item.name.toLowerCase());

        if (product && product.history.length > 0) {
          const best = [...product.history].sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity))[0];
          targetStore = best.store;
        }
      }

      if (!groups[targetStore]) groups[targetStore] = [];
      groups[targetStore].push(item);
    });

    return groups;
  }, [activeItems, products]);

  const allKnownStores = useMemo(() => {
    const fromHistory = products.flatMap(p => p.history.map(h => h.store));
    const fromSaved = stores.map(s => s.name);
    return Array.from(new Set([...fromHistory, ...fromSaved])).sort();
  }, [products, stores]);

  const storeDistances = useMemo(() => {
    if (!userCoords) return {};
    const distances: Record<string, number> = {};
    stores.forEach(s => {
      if (s.lat && s.lng) {
        distances[s.name] = getDistance(userCoords.lat, userCoords.lng, s.lat, s.lng);
      }
    });
    return distances;
  }, [userCoords, stores]);

  const getFuelEstimate = (distance: number) => {
    if (!activeVehicle || !gasPrice) return null;
    return (distance / activeVehicle.mpg) * gasPrice;
  };

  const getItemCost = (item: ShoppingItem) => {
    const product = products.find(p => p.id === item.productId) || 
                    products.find(p => p.itemName.toLowerCase() === item.name.toLowerCase());
    if (!product || product.history.length === 0) return null;
    
    const currentStore = item.manualStore || Object.keys(groupedByStore).find(k => groupedByStore[k].some(i => i.id === item.id));
    
    const record = product.history.find(h => h.store === currentStore) || 
                   [...product.history].sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity))[0];
                 
    return (record.price / record.quantity) * item.neededQuantity;
  };

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
  };

  const handleDrop = (e: React.DragEvent, storeName: string) => {
    e.preventDefault();
    if (draggedItemId) {
      onOverrideStore(draggedItemId, storeName);
      setDraggedItemId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStockConfirm = (...args: Parameters<typeof onAddToInventory>) => {
    onAddToInventory(...args);
    if (stockingItem) onRemove(stockingItem.id);
  };

  const sortedStoreNames = Object.keys(groupedByStore).sort();

  if (activeItems.length === 0 && completedItems.length === 0) {
    return (
      <div className="text-center py-24 flex flex-col items-center">
        <div className="bg-emerald-50 w-20 h-20 rounded-[32px] flex items-center justify-center mb-6 text-emerald-300">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
           </svg>
        </div>
        <p className="text-slate-900 font-black text-lg">Nothing to shop for</p>
        <p className="text-xs text-slate-400 mt-2 max-w-[200px] font-medium leading-relaxed text-center">Your shopping list is empty. Add items to see your trip plan grouped by store value.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Trip Plan</h2>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">
            {sortedStoreNames.length} Stops
          </span>
          {activeVehicle && (
            <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Using {activeVehicle.name}</span>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {sortedStoreNames.map(storeName => {
          const distance = storeDistances[storeName];
          const fuel = distance ? getFuelEstimate(distance) : null;
          const displayDistance = distance ? distance.toFixed(1) : "2.4"; 
          const displayFuel = fuel !== null ? fuel.toFixed(2) : "0.45";

          return (
            <section 
              key={storeName} 
              className="space-y-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, storeName)}
            >
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-600 w-1.5 h-6 rounded-full shadow-sm"></div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">{storeName}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border ${distance !== undefined ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      <span className="text-[10px] font-black text-slate-600 tracking-tight">{displayDistance} <span className="text-slate-400 font-bold">mi</span></span>
                    </div>
                    <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border ${distance !== undefined ? 'bg-white border-indigo-50' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                      <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span className="text-[10px] font-black text-indigo-600 tracking-tight">${displayFuel} <span className="text-indigo-300 font-bold">gas</span></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`space-y-3 min-h-[40px] p-2 rounded-[36px] transition-all duration-300 ${draggedItemId ? 'bg-indigo-50/50 border-2 border-dashed border-indigo-200 ring-4 ring-indigo-50' : 'bg-transparent border-2 border-transparent'}`}>
                {groupedByStore[storeName].map(item => {
                  const cost = getItemCost(item);
                  return (
                    <div 
                      key={item.id} 
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      className={`bg-white border p-4 rounded-[28px] shadow-sm relative overflow-hidden transition-all active:scale-[0.98] cursor-grab active:cursor-grabbing hover:shadow-md ${item.manualStore ? 'border-amber-200' : 'border-slate-100'} ${draggedItemId === item.id ? 'opacity-40 grayscale scale-95' : 'opacity-100'}`}
                    >
                      <div className="flex items-center">
                        <button 
                          onClick={() => onToggle(item.id)}
                          className="w-8 h-8 rounded-full border-2 border-slate-100 mr-3 shrink-0 active:bg-indigo-50 flex items-center justify-center transition-colors hover:border-indigo-200 group"
                        >
                           <div className="w-4 h-4 rounded-full bg-slate-50 group-hover:bg-indigo-50 transition-colors"></div>
                        </button>
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight">{item.name}</h4>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{item.neededQuantity} {item.unit}</span>
                            {cost !== null && (
                              <div className="flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                <span className="text-[10px] font-black text-emerald-600">${cost.toFixed(2)}</span>
                              </div>
                            )}
                            <button 
                              onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                              className="text-[9px] font-black text-indigo-500 bg-indigo-50/50 px-2 py-0.5 rounded-full uppercase tracking-tighter hover:bg-indigo-100 transition-colors"
                            >
                              Move
                            </button>
                            <button 
                              onClick={() => setStockingItem(item)}
                              className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter hover:bg-emerald-100 transition-colors"
                            >
                              Stock
                            </button>
                          </div>
                        </div>
                      </div>

                      {editingItemId === item.id && (
                        <div className="mt-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Move to Store</p>
                          <div className="grid grid-cols-2 gap-2">
                            {allKnownStores.filter(s => s !== storeName).map(s => (
                              <button 
                                key={s}
                                onClick={() => {
                                  onOverrideStore(item.id, s);
                                  setEditingItemId(null);
                                }}
                                className={`text-left px-3 py-2 rounded-xl border text-[10px] font-bold truncate transition-all ${item.manualStore === s ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {completedItems.length > 0 && (
          <div className="pt-6 space-y-3 px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchased This Trip</h3>
            <div className="grid grid-cols-1 gap-2">
              {completedItems.map(item => (
                <div key={item.id} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between opacity-80">
                  <div className="flex items-center min-w-0">
                    <button onClick={() => onToggle(item.id)} className="w-5 h-5 rounded-full bg-emerald-500 mr-2 flex items-center justify-center">
                       <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <span className="text-xs font-bold text-slate-400 line-through truncate">{item.name}</span>
                  </div>
                  <button 
                    onClick={() => setStockingItem(item)}
                    className="bg-indigo-600 text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-lg active:scale-95"
                  >
                    Stock It
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {stockingItem && (
        <StockPurchasedModal 
          item={stockingItem}
          products={products}
          storageLocations={storageLocations}
          subLocations={subLocations}
          onClose={() => setStockingItem(null)}
          onConfirm={handleStockConfirm}
        />
      )}
    </div>
  );
};

export default ShopPlan;
