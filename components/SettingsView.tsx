
import React, { useState } from 'react';
import { StoreLocation, Vehicle, StorageLocation, SubLocation, Profile } from '../types';
import { supabase, createFamily, joinFamily } from '../services/supabaseService';
import { searchStoreDetails } from '../services/geminiService';

interface SettingsViewProps {
  user?: any;
  profile: Profile;
  onProfileChange: (updates: Partial<Profile>) => void;
  stores: StoreLocation[];
  onStoresChange: (stores: StoreLocation[]) => void;
  vehicles: Vehicle[];
  onVehiclesChange: (v: Vehicle[]) => void;
  storageLocations: StorageLocation[];
  onStorageLocationsChange: (locs: StorageLocation[]) => void;
  subLocations: SubLocation[];
  onSubLocationsChange: (subs: SubLocation[]) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  user, profile, onProfileChange,
  stores, onStoresChange, vehicles, onVehiclesChange,
  storageLocations, onStorageLocationsChange,
  subLocations, onSubLocationsChange
}) => {
  const [newStore, setNewStore] = useState({ name: '', lat: '', lng: '', address: '', hours: '', phone: '' });
  const [newVehicle, setNewVehicle] = useState({ name: '', mpg: '' });
  const [newStorage, setNewStorage] = useState('');
  const [newSubMap, setNewSubMap] = useState<Record<string, string>>({});
  const [expandedLocId, setExpandedLocId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Family State
  const [familyInviteCode, setFamilyInviteCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyLoading, setFamilyLoading] = useState(false);

  const handleCreateFamily = async () => {
    if (!familyName) return;
    setFamilyLoading(true);
    try {
      await createFamily(familyName);
      alert('Family created! Share your code with others.');
      window.location.reload();
    } catch (e: any) { alert(e.message); }
    setFamilyLoading(false);
  };

  const handleJoinFamily = async () => {
    if (!familyInviteCode) return;
    setFamilyLoading(true);
    try {
      await joinFamily(familyInviteCode);
      alert('Successfully joined family!');
      window.location.reload();
    } catch (e: any) { alert(e.message); }
    setFamilyLoading(false);
  };

  const handleStoreSearch = async () => {
    if (!searchQuery) return;
    setSearchLoading(true);
    const result = await searchStoreDetails(searchQuery, profile.zip || profile.locationLabel);
    if (result) {
      const text = result.text;
      const latLngMatch = text.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      setNewStore(prev => ({
        ...prev,
        name: searchQuery,
        lat: latLngMatch ? latLngMatch[1] : '',
        lng: latLngMatch ? latLngMatch[2] : '',
        phone: phoneMatch ? phoneMatch[0] : ''
      }));
    }
    setSearchLoading(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-900 px-1">Settings</h2>

      {/* Profile Sync Banner */}
      {user && (
        <section className="bg-indigo-600 rounded-[32px] p-6 shadow-xl text-white">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Cloud Profile</p>
              <p className="font-bold text-sm truncate max-w-[200px]">{user.email}</p>
            </div>
          </div>
        </section>
      )}

      {/* Community & Global Sharing */}
      <section className="bg-emerald-50 border border-emerald-100 p-6 rounded-[32px]">
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest leading-none">Global Insights</h3>
            <p className="text-[10px] text-emerald-700 font-medium mt-1">Contribute price data anonymously to help other shoppers in your region find deals.</p>
          </div>
          <button 
            onClick={() => onProfileChange({ sharePrices: !profile.sharePrices })}
            className={`w-12 h-6 rounded-full transition-colors relative ${profile.sharePrices ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profile.sharePrices ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>
      </section>

      {/* Family Hub */}
      {user && (
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Family Hub</h3>
            <div className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-indigo-50 text-indigo-600">Sync Active</div>
          </div>
          
          {profile.familyId ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Linked Family</p>
                <p className="text-lg font-black text-slate-800">Family Group Active</p>
              </div>
              <button className="w-full py-3 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-2xl">Leave Family</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 px-1">Join existing group:</p>
                <div className="flex space-x-2">
                  <input 
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest" 
                    placeholder="Enter Code" 
                    value={familyInviteCode}
                    onChange={e => setFamilyInviteCode(e.target.value.toUpperCase())}
                  />
                  <button onClick={handleJoinFamily} disabled={familyLoading} className="px-6 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Join</button>
                </div>
              </div>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center"><span className="bg-white px-4 text-[8px] font-black text-slate-300 uppercase">OR</span></div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 px-1">Create new family:</p>
                <div className="flex space-x-2">
                  <input 
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" 
                    placeholder="Family Name" 
                    value={familyName}
                    onChange={e => setFamilyName(e.target.value)}
                  />
                  <button onClick={handleCreateFamily} disabled={familyLoading} className="px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Start</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Location & Fuel */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-4">Location & Fuel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City/Region</label>
            <input 
              type="text"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold"
              placeholder="e.g. Austin, TX"
              value={profile.locationLabel}
              onChange={(e) => onProfileChange({ locationLabel: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zip Code</label>
            <input 
              type="text"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold"
              placeholder="e.g. 78701"
              value={profile.zip}
              onChange={(e) => onProfileChange({ zip: e.target.value })}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Gas Price ($/gal)</label>
            <input 
              type="number"
              step="0.01"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold"
              value={profile.gasPrice}
              onChange={(e) => onProfileChange({ gasPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </section>

      {/* Stores Section */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Personal Store List</h3>
        <div className="mb-6 space-y-3">
          <div className="relative">
             <input 
               type="text" 
               className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-4 pr-12 py-3 text-xs font-bold" 
               placeholder="Search map for store..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
             <button onClick={handleStoreSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500">
               {searchLoading ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
             </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="col-span-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Store Name" value={newStore.name} onChange={e => setNewStore({...newStore, name: e.target.value})} />
            <button onClick={() => {
              if (newStore.name) {
                onStoresChange([...stores, { id: crypto.randomUUID(), name: newStore.name, lat: parseFloat(newStore.lat), lng: parseFloat(newStore.lng), zip: profile.zip }]);
                setNewStore({ name: '', lat: '', lng: '', address: '', hours: '', phone: '' });
              }
            }} className="col-span-2 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Add Store</button>
          </div>
        </div>
        <div className="space-y-2">
          {stores.map(s => (
            <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{s.name}</span>
              <button onClick={() => onStoresChange(stores.filter(st => st.id !== s.id))} className="text-slate-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
          ))}
        </div>
      </section>

      {/* Vehicles Section */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Vehicles</h3>
        <div className="space-y-3 mb-4">
          {vehicles.map(v => (
            <div key={v.id} onClick={() => onProfileChange({ activeVehicleId: v.id })} className={`flex items-center justify-between p-3 rounded-2xl border ${profile.activeVehicleId === v.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
              <span className="text-xs font-bold">{v.name} ({v.mpg} MPG)</span>
              <button onClick={(e) => { e.stopPropagation(); onVehiclesChange(vehicles.filter(veh => veh.id !== v.id)); }} className="text-slate-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Model" value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} />
          <input className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold" placeholder="MPG" type="number" value={newVehicle.mpg} onChange={e => setNewVehicle({...newVehicle, mpg: e.target.value})} />
          <button onClick={() => { if(newVehicle.name && newVehicle.mpg) onVehiclesChange([...vehicles, { id: crypto.randomUUID(), name: newVehicle.name, mpg: parseFloat(newVehicle.mpg) }]); setNewVehicle({name:'', mpg:''}); }} className="col-span-2 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Add Vehicle</button>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
