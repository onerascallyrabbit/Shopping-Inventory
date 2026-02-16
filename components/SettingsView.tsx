
import React, { useState, useEffect, useMemo } from 'react';
import { StoreLocation, Vehicle, StorageLocation, SubLocation, Profile, Family, CustomCategory, CustomSubCategory } from '../types';
import { supabase, createFamily, joinFamily, fetchGlobalStores, syncStore, deleteStore, syncStorageLocation, deleteStorageLocation, syncSubLocation, deleteSubLocation } from '../services/supabaseService';
import { searchStoreDetails } from '../services/geminiService';
import { DEFAULT_CATEGORIES } from '../constants';

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
  customCategories: CustomCategory[];
  customSubCategories: CustomSubCategory[];
  onAddCategory: (name: string) => void;
  onRemoveCategory: (id: string) => void;
  onAddSubCategory: (catName: string, name: string) => void;
  onRemoveSubCategory: (id: string) => void;
  onReorderStorageLocations?: (locs: StorageLocation[]) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  user, profile, activeFamily, onProfileChange,
  stores, onStoresChange, vehicles, onVehiclesChange,
  storageLocations, onStorageLocationsChange,
  subLocations, onSubLocationsChange,
  customCategories, customSubCategories,
  onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory,
  onReorderStorageLocations
}) => {
  const [newStore, setNewStore] = useState({ name: '', lat: '', lng: '', address: '', hours: '', phone: '', isPublic: false });
  const [newVehicle, setNewVehicle] = useState({ name: '', mpg: '' });
  const [newStorageName, setNewStorageName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  
  const [newCatName, setNewCatName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [selectedTaxonomyCat, setSelectedTaxonomyCat] = useState('');

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapResult, setMapResult] = useState<StoreLocation | null>(null);
  
  const [familyInviteCode, setFamilyInviteCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite && !profile.familyId) setFamilyInviteCode(invite.toUpperCase());
  }, [profile.familyId]);

  useEffect(() => {
    if (storageLocations.length > 0 && !selectedParentId) setSelectedParentId(storageLocations[0].id);
    if (!selectedTaxonomyCat) setSelectedTaxonomyCat(DEFAULT_CATEGORIES[0]);
  }, [storageLocations, selectedTaxonomyCat]);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)])).sort();
  }, [customCategories]);

  const handleCreateFamily = async () => {
    if (!familyName) return;
    try { await createFamily(familyName); alert('Family Hub created!'); window.location.reload(); }
    catch (e: any) { alert(`Creation failed: ${e.message}`); }
  };

  const handleJoinFamily = async () => {
    if (!familyInviteCode) return;
    try { await joinFamily(familyInviteCode); alert('Successfully joined family!'); window.location.reload(); }
    catch (e: any) { alert(`Join failed: ${e.message}`); }
  };

  const shareInviteLink = () => {
    if (!activeFamily) return;
    const url = `${window.location.origin}${window.location.pathname}?invite=${activeFamily.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const moveLocation = (index: number, direction: 'up' | 'down') => {
    if (!onReorderStorageLocations) return;
    const newLocs = [...storageLocations];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLocs.length) return;
    
    [newLocs[index], newLocs[targetIndex]] = [newLocs[targetIndex], newLocs[index]];
    onReorderStorageLocations(newLocs);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-900 px-1">Settings</h2>

      {/* Family Hub */}
      {user && (
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Family Hub</h3>
          {activeFamily ? (
            <div className="p-5 bg-emerald-50 rounded-[28px] border border-emerald-100 flex flex-col items-center text-center space-y-4">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Active Hub</p>
                <p className="text-lg font-black text-slate-800">{activeFamily.name}</p>
              </div>
              <button onClick={shareInviteLink} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                {copied ? 'Copied Link' : 'Invite Family'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold" placeholder="Invite Code..." value={familyInviteCode} onChange={e => setFamilyInviteCode(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleJoinFamily} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-[10px]">Join Family</button>
                <button onClick={() => { const name = prompt('Family Name?'); if(name) { setFamilyName(name); handleCreateFamily(); } }} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-[10px]">Create Hub</button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Stock Locations Section */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Stock Locations</h3>
          <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full uppercase">Order for Family</span>
        </div>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold" placeholder="New Location (e.g. Garage)..." value={newStorageName} onChange={e => setNewStorageName(e.target.value)} />
            <button onClick={() => { if(newStorageName) { const loc={id:crypto.randomUUID(), name:newStorageName, sortOrder: storageLocations.length}; onStorageLocationsChange([...storageLocations, loc]); if(user) syncStorageLocation(loc); setNewStorageName(''); } }} className="px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-sm active:scale-95">Add</button>
          </div>
          
          <div className="space-y-2">
            {storageLocations.length > 0 ? storageLocations.map((loc, idx) => (
              <div key={loc.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-all">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col space-y-0.5 bg-slate-50 rounded-lg p-1">
                    <button 
                      onClick={() => moveLocation(idx, 'up')}
                      disabled={idx === 0}
                      className={`p-1.5 rounded-md hover:bg-white transition-all ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 active:scale-90'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 15l7-7 7 7"/></svg>
                    </button>
                    <button 
                      onClick={() => moveLocation(idx, 'down')}
                      disabled={idx === storageLocations.length - 1}
                      className={`p-1.5 rounded-md hover:bg-white transition-all ${idx === storageLocations.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 active:scale-90'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{loc.name}</span>
                    <span className="text-[8px] font-bold text-slate-300 uppercase">Position {idx + 1}</span>
                  </div>
                </div>
                <button onClick={async () => { if(confirm(`Delete ${loc.name}?`)) { onStorageLocationsChange(storageLocations.filter(l => l.id !== loc.id)); if (user) await deleteStorageLocation(loc.id); } }} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
            )) : (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No custom locations</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Household Taxonomy Section */}
      {activeFamily && (
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Household Taxonomy</h3>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Categories</p>
              <div className="flex space-x-2">
                <input className="flex-1 bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-bold" placeholder="New Category (e.g. Pantry Extra)" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                <button onClick={() => { if(newCatName) { onAddCategory(newCatName); setNewCatName(''); } }} className="px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Add</button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {customCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border">
                    <span className="text-xs font-bold text-slate-700 uppercase">{cat.name}</span>
                    <button onClick={() => onRemoveCategory(cat.id)} className="text-slate-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Sub-Categories</p>
              <div className="grid grid-cols-2 gap-2">
                <select className="bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-bold appearance-none" value={selectedTaxonomyCat} onChange={e => setSelectedTaxonomyCat(e.target.value)}>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className="bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-bold" placeholder="e.g. Poultry" value={newSubCatName} onChange={e => setNewSubCatName(e.target.value)} />
              </div>
              <button onClick={() => { if(newSubCatName) { onAddSubCategory(selectedTaxonomyCat, newSubCatName); setNewSubCatName(''); } }} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Add Sub-Category</button>
              
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {customSubCategories.filter(s => s.categoryId === selectedTaxonomyCat).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between bg-indigo-50/30 p-3 rounded-xl border border-indigo-100">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase">{sub.name}</span>
                    <button onClick={() => onRemoveSubCategory(sub.id)} className="text-indigo-200 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Fuel Settings */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Location & Fuel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Zip Code</label>
            <input type="text" className="w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm font-bold" value={profile.zip} onChange={(e) => onProfileChange({ zip: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Gas Price</label>
            <input type="number" step="0.01" className="w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm font-bold" value={profile.gasPrice} onChange={(e) => onProfileChange({ gasPrice: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
