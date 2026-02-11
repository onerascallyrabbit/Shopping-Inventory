
import React, { useState, useEffect } from 'react';
import { StoreLocation, Vehicle, StorageLocation, SubLocation, Profile, Family } from '../types';
import { supabase, createFamily, joinFamily, fetchGlobalStores, syncStore, deleteStore } from '../services/supabaseService';
import { searchStoreDetails } from '../services/geminiService';

interface SettingsViewProps {
  user?: any;
  profile: Profile;
  activeFamily: Family | null;
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
  user, profile, activeFamily, onProfileChange,
  stores, onStoresChange, vehicles, onVehiclesChange,
  storageLocations, onStorageLocationsChange,
  subLocations, onSubLocationsChange
}) => {
  const [newStore, setNewStore] = useState({ name: '', lat: '', lng: '', address: '', hours: '', phone: '', isPublic: false });
  const [newVehicle, setNewVehicle] = useState({ name: '', mpg: '' });
  
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [communityStores, setCommunityStores] = useState<StoreLocation[]>([]);
  const [mapResult, setMapResult] = useState<StoreLocation | null>(null);
  
  // Family State
  const [familyInviteCode, setFamilyInviteCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyLoading, setFamilyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Detect invite code in URL
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite && !profile.familyId) {
      setFamilyInviteCode(invite.toUpperCase());
    }
  }, [profile.familyId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        const results = await fetchGlobalStores(searchQuery);
        setCommunityStores(results.filter(cs => !stores.some(us => us.name.toLowerCase() === cs.name.toLowerCase())));
      } else {
        setCommunityStores([]);
        setMapResult(null);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, stores]);

  const handleCreateFamily = async () => {
    if (!familyName) return;
    setFamilyLoading(true);
    try {
      await createFamily(familyName);
      alert('Family Hub created!');
      window.location.reload();
    } catch (e: any) { alert(`Creation failed: ${e.message}`); }
    setFamilyLoading(false);
  };

  const handleJoinFamily = async () => {
    if (!familyInviteCode) return;
    setFamilyLoading(true);
    try {
      await joinFamily(familyInviteCode);
      alert('Successfully joined family!');
      window.location.reload();
    } catch (e: any) { alert(`Join failed: ${e.message}`); }
    setFamilyLoading(false);
  };

  const shareInviteLink = () => {
    if (!activeFamily) return;
    const url = `${window.location.origin}${window.location.pathname}?invite=${activeFamily.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStoreSearch = async () => {
    if (!searchQuery) return;
    setSearchLoading(true);
    setMapResult(null);
    const result = await searchStoreDetails(searchQuery, profile.zip || profile.locationLabel);
    if (result) {
      const text = result.text;
      const latLngMatch = text.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      
      const verifiedStore: StoreLocation = {
        id: 'map-result',
        name: searchQuery,
        lat: latLngMatch ? parseFloat(latLngMatch[1]) : undefined,
        lng: latLngMatch ? parseFloat(latLngMatch[2]) : undefined,
        phone: phoneMatch ? phoneMatch[0] : '',
        address: text.split('\n')[1] || '' // Heuristic for address
      };
      setMapResult(verifiedStore);
    }
    setSearchLoading(false);
  };

  const addStore = async (s: Omit<StoreLocation, 'id'>, isPublic: boolean = false) => {
    const storeObj = { ...s, id: crypto.randomUUID() };
    const updated = [...stores, storeObj];
    onStoresChange(updated);
    if (user) await syncStore(storeObj, isPublic);
    setSearchQuery('');
    setMapResult(null);
    setNewStore({ name: '', lat: '', lng: '', address: '', hours: '', phone: '', isPublic: false });
  };

  const removeStore = async (id: string) => {
    onStoresChange(stores.filter(s => s.id !== id));
    if (user) await deleteStore(id);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-900 px-1">Settings</h2>

      {/* Cloud Profile Sync */}
      {user && (
        <section className="bg-indigo-600 rounded-[32px] p-6 shadow-xl text-white">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Cloud Identity</p>
              <p className="font-bold text-sm truncate">{user.email}</p>
            </div>
          </div>
        </section>
      )}

      {/* Family Hub */}
      {user && (
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Family Hub</h3>
          </div>
          
          {activeFamily ? (
            <div className="p-5 bg-emerald-50 rounded-[28px] border border-emerald-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => { if(confirm('Are you sure?')) onProfileChange({ familyId: undefined }); }} className="text-[8px] font-black text-emerald-900 uppercase">Leave Hub</button>
               </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Group Active</p>
                  <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{activeFamily.name}</p>
                </div>
                
                <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-emerald-50 flex flex-col items-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Invite Code</p>
                   <span className="text-2xl font-black text-indigo-600 tracking-[0.3em] ml-2">{activeFamily.invite_code}</span>
                   <button 
                    onClick={shareInviteLink}
                    className={`mt-4 w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white active:scale-95'}`}
                   >
                     {copied ? (
                       <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        <span>Copied Link</span>
                       </>
                     ) : (
                       <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                        <span>Add Member (Link)</span>
                       </>
                     )}
                   </button>
                   <p className="mt-2 text-[8px] font-bold text-slate-400 uppercase">Share this link with your family to sync automatically</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">Join a Family Hub</p>
                <div className="flex space-x-2">
                  <input 
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-black uppercase tracking-[0.2em] placeholder:tracking-normal placeholder:font-bold" 
                    placeholder="INVITE CODE" 
                    value={familyInviteCode}
                    onChange={e => setFamilyInviteCode(e.target.value.toUpperCase())}
                  />
                  <button onClick={handleJoinFamily} disabled={familyLoading} className="px-6 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100">Join</button>
                </div>
              </div>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center"><span className="bg-white px-4 text-[8px] font-black text-slate-300 uppercase tracking-widest">OR</span></div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider">Create New Hub</p>
                <div className="flex space-x-2">
                  <input 
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-bold" 
                    placeholder="Family Name (e.g. Smith Household)" 
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

      {/* Stores Section */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Store Management</h3>
        <div className="mb-6 space-y-4">
          <div className="relative">
             <input 
               type="text" 
               className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-4 pr-12 py-3.5 text-xs font-bold" 
               placeholder="Search map or global community..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
             <button onClick={handleStoreSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-indigo-500">
               {searchLoading ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
             </button>
          </div>

          {/* Unified Search Results Area */}
          {(mapResult || communityStores.length > 0) && (
            <div className="bg-indigo-50/40 rounded-[28px] p-4 border border-indigo-100 space-y-3 animate-in slide-in-from-top-4">
              
              {/* Maps Result */}
              {mapResult && (
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] px-1">Verified via Google Maps</p>
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-100">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-black text-slate-800 truncate uppercase">{mapResult.name}</span>
                        <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{mapResult.address || 'Business Data Found'}</p>
                    </div>
                    <button onClick={() => addStore(mapResult, true)} className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 shadow-md shadow-indigo-200">Claim</button>
                  </div>
                </div>
              )}

              {/* Community Results */}
              {communityStores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] px-1">Community Discoveries</p>
                  {communityStores.map(cs => (
                    <div key={cs.id} className="flex items-center justify-between bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-emerald-50">
                      <div className="min-w-0 pr-2">
                        <p className="text-[11px] font-black text-slate-700 truncate uppercase">{cs.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 truncate">Shared by community member</p>
                      </div>
                      <button onClick={() => addStore(cs, false)} className="shrink-0 bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 shadow-sm">Add</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-[28px] border border-slate-100 space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Add Manual Location</p>
            <input className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" placeholder="Store Name" value={newStore.name} onChange={e => setNewStore({...newStore, name: e.target.value})} />
            <div className="flex items-center px-1">
              <input type="checkbox" id="shareStore" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={newStore.isPublic} onChange={e => setNewStore({...newStore, isPublic: e.target.checked})} />
              <label htmlFor="shareStore" className="ml-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide cursor-pointer">Contribute to Global Catalog</label>
            </div>
            <button onClick={() => { if (newStore.name) addStore({ name: newStore.name, lat: parseFloat(newStore.lat), lng: parseFloat(newStore.lng), zip: profile.zip, address: newStore.address, hours: newStore.hours, phone: newStore.phone }, newStore.isPublic); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Save Personal List</button>
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {stores.length > 0 ? stores.map(s => (
            <div key={s.id} className="p-3.5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100/50">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-black text-slate-800 truncate uppercase tracking-tight">{s.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                   {s.lat && s.lng && <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest flex items-center"><svg className="w-2 h-2 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>Mapped</span>}
                   {s.phone && <span className="text-[8px] font-bold text-slate-400"># {s.phone}</span>}
                </div>
              </div>
              <button onClick={() => removeStore(s.id)} className="text-slate-200 hover:text-red-500 p-1.5 active:scale-90 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          )) : (
            <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
               <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No stores added yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Fuel Settings */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Location & Fuel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Zip Code</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold" placeholder="78701" value={profile.zip} onChange={(e) => onProfileChange({ zip: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gas Price</label>
            <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold" value={profile.gasPrice} onChange={(e) => onProfileChange({ gasPrice: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </section>

      {/* Vehicles Section */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Vehicles</h3>
        <div className="space-y-3 mb-4">
          {vehicles.map(v => (
            <div key={v.id} onClick={() => onProfileChange({ activeVehicleId: v.id })} className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${profile.activeVehicleId === v.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center space-x-3">
                 <div className={`w-2.5 h-2.5 rounded-full ${profile.activeVehicleId === v.id ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : 'bg-slate-200'}`}></div>
                 <span className="text-xs font-bold text-slate-700">{v.name} ({v.mpg} MPG)</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onVehiclesChange(vehicles.filter(veh => veh.id !== v.id)); }} className="text-slate-200 hover:text-red-500 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold" placeholder="Model" value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} />
          <input className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold" placeholder="MPG" type="number" value={newVehicle.mpg} onChange={e => setNewVehicle({...newVehicle, mpg: e.target.value})} />
          <button onClick={() => { if(newVehicle.name && newVehicle.mpg) onVehiclesChange([...vehicles, { id: crypto.randomUUID(), name: newVehicle.name, mpg: parseFloat(newVehicle.mpg) }]); setNewVehicle({name:'', mpg:''}); }} className="col-span-2 py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Add Vehicle</button>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
