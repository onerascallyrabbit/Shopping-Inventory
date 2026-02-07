
import React, { useState } from 'react';
import { StoreLocation, Vehicle, StorageLocation, SubLocation } from '../types';
import { searchStoreDetails } from '../services/geminiService';

interface SettingsViewProps {
  location: string;
  onLocationChange: (loc: string) => void;
  zip: string;
  onZipChange: (zip: string) => void;
  categoryOrder: string[];
  onCategoryOrderChange: (order: string[]) => void;
  stores: StoreLocation[];
  onStoresChange: (stores: StoreLocation[]) => void;
  vehicles: Vehicle[];
  onVehiclesChange: (v: Vehicle[]) => void;
  activeVehicleId: string;
  onActiveVehicleChange: (id: string) => void;
  gasPrice: number;
  onGasPriceChange: (price: number) => void;
  storageLocations: StorageLocation[];
  onStorageLocationsChange: (locs: StorageLocation[]) => void;
  subLocations: SubLocation[];
  onSubLocationsChange: (subs: SubLocation[]) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  location, onLocationChange, zip, onZipChange, categoryOrder, onCategoryOrderChange,
  stores, onStoresChange, vehicles, onVehiclesChange, activeVehicleId, onActiveVehicleChange,
  gasPrice, onGasPriceChange, storageLocations, onStorageLocationsChange,
  subLocations, onSubLocationsChange
}) => {
  const [newStore, setNewStore] = useState({ name: '', lat: '', lng: '', address: '', hours: '', phone: '' });
  const [newVehicle, setNewVehicle] = useState({ name: '', mpg: '' });
  const [newStorage, setNewStorage] = useState('');
  const [newSubMap, setNewSubMap] = useState<Record<string, string>>({});
  const [expandedLocId, setExpandedLocId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleStoreSearch = async () => {
    if (!searchQuery) return;
    setSearchLoading(true);
    const result = await searchStoreDetails(searchQuery, zip || location);
    if (result) {
      const text = result.text;
      const lines = text.split('\n');
      const latLngMatch = text.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      const addressLine = lines.find(l => l.toLowerCase().includes('address'))?.split(':')?.[1]?.trim() || lines[0];
      const hoursLine = lines.find(l => l.toLowerCase().includes('hours'))?.split(':')?.[1]?.trim() || 'Check online';
      setNewStore({
        name: searchQuery,
        lat: latLngMatch ? latLngMatch[1] : '',
        lng: latLngMatch ? latLngMatch[2] : '',
        address: addressLine,
        phone: phoneMatch ? phoneMatch[0] : '',
        hours: hoursLine
      });
    }
    setSearchLoading(false);
  };

  const addStorage = () => {
    if (newStorage.trim()) {
      onStorageLocationsChange([...storageLocations, { id: crypto.randomUUID(), name: newStorage }]);
      setNewStorage('');
    }
  };

  const addSubLocation = (locId: string) => {
    const name = newSubMap[locId];
    if (name?.trim()) {
      onSubLocationsChange([...subLocations, { id: crypto.randomUUID(), locationId: locId, name: name.trim() }]);
      setNewSubMap({ ...newSubMap, [locId]: '' });
    }
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...categoryOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      onCategoryOrderChange(newOrder);
    }
  };

  const addStore = () => {
    if (newStore.name) {
      onStoresChange([...stores, { 
        id: crypto.randomUUID(), 
        name: newStore.name, 
        lat: parseFloat(newStore.lat) || undefined, 
        lng: parseFloat(newStore.lng) || undefined,
        address: newStore.address,
        phone: newStore.phone,
        hours: newStore.hours,
        zip: zip
      }]);
      setNewStore({ name: '', lat: '', lng: '', address: '', hours: '', phone: '' });
      setSearchQuery('');
    }
  };

  const addVehicle = () => {
    if (newVehicle.name && newVehicle.mpg) {
      onVehiclesChange([...vehicles, {
        id: crypto.randomUUID(),
        name: newVehicle.name,
        mpg: parseFloat(newVehicle.mpg)
      }]);
      setNewVehicle({ name: '', mpg: '' });
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-900 px-1">Settings</h2>

      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Location & Fuel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City/Region</label>
            <input 
              type="text"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold"
              placeholder="e.g. Austin, TX"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zip Code</label>
            <input 
              type="text"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold"
              placeholder="e.g. 78701"
              value={zip}
              onChange={(e) => onZipChange(e.target.value)}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Gas Price ($/gal)</label>
            <input 
              type="number"
              step="0.01"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold"
              value={gasPrice}
              onChange={(e) => onGasPriceChange(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Storage & Sub-locations</h3>
        <div className="space-y-4 mb-6">
          {storageLocations.map(loc => (
            <div key={loc.id} className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div 
                   onClick={() => setExpandedLocId(expandedLocId === loc.id ? null : loc.id)}
                   className="flex-1 flex items-center space-x-2 cursor-pointer"
                >
                  <span className="text-xs font-black text-slate-700 uppercase">{loc.name}</span>
                  <span className="text-[8px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                    {subLocations.filter(s => s.locationId === loc.id).length} Shelves
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                   <button onClick={() => setExpandedLocId(expandedLocId === loc.id ? null : loc.id)} className="text-slate-300 p-2">
                     <svg className={`w-4 h-4 transition-transform ${expandedLocId === loc.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                   </button>
                   <button onClick={() => onStorageLocationsChange(storageLocations.filter(l => l.id !== loc.id))} className="text-red-200 p-2 hover:text-red-500">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                   </button>
                </div>
              </div>

              {expandedLocId === loc.id && (
                <div className="ml-4 pl-4 border-l-2 border-indigo-50 space-y-3 animate-in slide-in-from-left-2">
                  {subLocations.filter(s => s.locationId === loc.id).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl">
                       <span className="text-[10px] font-bold text-slate-500">{sub.name}</span>
                       <button onClick={() => onSubLocationsChange(subLocations.filter(s => s.id !== sub.id))} className="text-slate-200 hover:text-red-400">
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                       </button>
                    </div>
                  ))}
                  <div className="flex space-x-2">
                    <input 
                       className="flex-1 bg-white border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold" 
                       placeholder="Add Shelf, Bin, or Drawer..." 
                       value={newSubMap[loc.id] || ''} 
                       onChange={e => setNewSubMap({ ...newSubMap, [loc.id]: e.target.value })} 
                    />
                    <button onClick={() => addSubLocation(loc.id)} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Add</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex space-x-2 pt-4 border-t border-slate-50">
          <input className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" placeholder="New Storage Area (e.g. Basement)" value={newStorage} onChange={e => setNewStorage(e.target.value)} />
          <button onClick={addStorage} className="px-6 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-lg shadow-indigo-100">Create</button>
        </div>
      </section>

      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">My Stores</h3>
        <div className="mb-6 space-y-3">
          <div className="relative">
             <input 
               type="text" 
               className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-4 pr-12 py-3 text-xs font-bold" 
               placeholder="Search map for store..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleStoreSearch()}
             />
             <button onClick={handleStoreSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500">
               {searchLoading ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
             </button>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2">
            <input className="col-span-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Store Name" value={newStore.name} onChange={e => setNewStore({...newStore, name: e.target.value})} />
            <input className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Lat" value={newStore.lat} onChange={e => setNewStore({...newStore, lat: e.target.value})} />
            <input className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Lng" value={newStore.lng} onChange={e => setNewStore({...newStore, lng: e.target.value})} />
            <input className="col-span-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Address" value={newStore.address} onChange={e => setNewStore({...newStore, address: e.target.value})} />
            <button onClick={addStore} className="col-span-2 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Save Store</button>
          </div>
        </div>
        <div className="space-y-3">
          {stores.map(s => (
            <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between">
              <div>
                <p className="text-xs font-black text-slate-700 uppercase">{s.name}</p>
                <p className="text-[9px] font-medium text-slate-400 mt-1">{s.address}</p>
              </div>
              <button onClick={() => onStoresChange(stores.filter(store => store.id !== s.id))} className="text-slate-300 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Vehicles & MPG</h3>
        <div className="space-y-3 mb-6">
          {vehicles.map(v => (
            <div 
              key={v.id} 
              onClick={() => onActiveVehicleChange(v.id)}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${activeVehicleId === v.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-slate-50'}`}
            >
              <div className="flex items-center space-x-3">
                 <div className={`w-2 h-2 rounded-full ${activeVehicleId === v.id ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></div>
                 <div>
                   <p className="text-xs font-black text-slate-700 uppercase">{v.name}</p>
                   <p className="text-[8px] font-bold text-slate-400 mt-0.5">{v.mpg} MPG</p>
                 </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onVehiclesChange(vehicles.filter(veh => veh.id !== v.id)); }} className="text-slate-300 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Model Name" value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} />
          <input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold" placeholder="MPG" type="number" value={newVehicle.mpg} onChange={e => setNewVehicle({...newVehicle, mpg: e.target.value})} />
          <button onClick={addVehicle} className="col-span-2 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">+ Add Vehicle</button>
        </div>
      </section>

      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Category Priority</h3>
        <div className="space-y-2 mt-4">
          {categoryOrder.map((cat, idx) => (
            <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-700">{cat}</span>
              <div className="flex space-x-1">
                <button disabled={idx === 0} onClick={() => moveCategory(idx, 'up')} className="p-2 text-slate-400 disabled:opacity-20"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg></button>
                <button disabled={idx === categoryOrder.length - 1} onClick={() => moveCategory(idx, 'down')} className="p-2 text-slate-400 disabled:opacity-20"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center text-center">
         <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
         </div>
         <button onClick={() => { if(confirm('Delete everything?')) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Wipe Local Database</button>
       </section>
    </div>
  );
};

export default SettingsView;
