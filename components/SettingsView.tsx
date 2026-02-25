
import React, { useState, useEffect } from 'react';
import { StoreLocation, Vehicle, StorageLocation, SubLocation, Profile, Family, CustomCategory, CustomSubCategory } from '../types';
import { createFamily, joinFamily, testDatabaseConnection, getEnv } from '../services/supabaseService';
import StorageLocationsModal from './StorageLocationsModal';
import TaxonomyModal from './TaxonomyModal';
import KrogerStorePicker from './KrogerStorePicker';

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
  storageLocations, onStorageLocationsChange,
  customCategories, customSubCategories,
  onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory,
  onReorderStorageLocations
}) => {
  const [familyInviteCode, setFamilyInviteCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [copied, setCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<'testing' | 'ok' | 'fail'>('testing');
  const [aiStatus, setAiStatus] = useState<'ok' | 'fail'>('fail');
  const [krogerStatus, setKrogerStatus] = useState<'ok' | 'fail'>('fail');

  // Modal Visibility States
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isTaxonomyModalOpen, setIsTaxonomyModalOpen] = useState(false);

  useEffect(() => {
    // Test Health
    testDatabaseConnection().then(res => setDbStatus(res.success ? 'ok' : 'fail'));
    
    // Fetch server health
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setAiStatus(data.gemini === 'ok' ? 'ok' : 'fail');
        setKrogerStatus(data.kroger === 'ok' ? 'ok' : 'fail');
      })
      .catch(() => {
        // Fallback to local check for Gemini if server health fails
        const apiKey = (typeof process !== 'undefined' ? process.env.API_KEY : '') || getEnv('API_KEY');
        setAiStatus(apiKey ? 'ok' : 'fail');
        setKrogerStatus('fail');
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite && !profile.familyId) setFamilyInviteCode(invite.toUpperCase());
  }, [profile.familyId]);

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

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <h2 className="text-2xl font-black text-slate-900 px-1">Settings</h2>

      {/* System Health Section */}
      <section className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">System Health</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-black uppercase text-slate-400">Database</span>
              <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : dbStatus === 'testing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></div>
            </div>
            <p className="text-[10px] font-bold">{dbStatus === 'ok' ? 'Connected' : dbStatus === 'testing' ? 'Syncing...' : 'Error'}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-black uppercase text-slate-400">Gemini AI</span>
              <div className={`w-1.5 h-1.5 rounded-full ${aiStatus === 'ok' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-red-500'}`}></div>
            </div>
            <p className="text-[10px] font-bold">{aiStatus === 'ok' ? 'Ready' : 'Missing'}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-black uppercase text-slate-400">Kroger</span>
              <div className={`w-1.5 h-1.5 rounded-full ${krogerStatus === 'ok' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-red-500'}`}></div>
            </div>
            <p className="text-[10px] font-bold">{krogerStatus === 'ok' ? 'Linked' : 'Missing'}</p>
          </div>
        </div>
        {!activeFamily && user && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-[10px] font-bold text-amber-400 leading-tight">⚠️ AI Meal Planning requires an active Family Hub. Join or create one below to enable storage for shared meal ideas.</p>
          </div>
        )}
      </section>

      {/* Hub Status */}
      {user && (
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Account & Hub</h3>
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

      {/* Main Settings Menu */}
      <section className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-1">
          {/* Storage Row */}
          <button 
            onClick={() => setIsStorageModalOpen(true)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors rounded-[28px]"
          >
            <div className="flex items-center space-x-4 text-left">
              <div className="bg-amber-100 p-2.5 rounded-2xl text-amber-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Stock Locations</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{storageLocations.length} Custom Aisles Defined</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
          </button>

          <div className="h-px bg-slate-50 mx-6"></div>

          {/* Taxonomy Row */}
          <button 
            onClick={() => setIsTaxonomyModalOpen(true)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors rounded-[28px]"
          >
            <div className="flex items-center space-x-4 text-left">
              <div className="bg-indigo-100 p-2.5 rounded-2xl text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Household Taxonomy</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{customCategories.length + customSubCategories.length} Custom Tags</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </section>

      {/* Fuel & Default View Settings */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Preferences</h3>
        <div className="space-y-4">
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
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Default Home Screen</label>
            <select 
              className="w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm font-bold appearance-none text-indigo-600"
              value={profile.defaultTab || 'dashboard'}
              onChange={(e) => onProfileChange({ defaultTab: e.target.value as any })}
            >
              <option value="dashboard">Track (Price History)</option>
              <option value="inventory">Stock (Inventory)</option>
              <option value="cellar">Cellar (Drinks)</option>
              <option value="meals">Meals (AI Planner)</option>
              <option value="list">List (Shopping List)</option>
              <option value="shop">Shop (Trip Plan)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Kroger Integration */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Kroger Integration</h3>
          <button 
            onClick={() => onProfileChange({ enableKroger: !profile.enableKroger })}
            className={`w-12 h-6 rounded-full transition-colors relative ${profile.enableKroger ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${profile.enableKroger ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        
        {profile.enableKroger && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Preferred Store</label>
              {profile.krogerStoreId ? (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-indigo-900">{profile.krogerStoreName}</p>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase">ID: {profile.krogerStoreId}</p>
                  </div>
                  <button 
                    onClick={() => onProfileChange({ krogerStoreId: '', krogerStoreName: '' })}
                    className="text-indigo-400 hover:text-indigo-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (
                <KrogerStorePicker zip={profile.zip} onSelect={(id, name) => onProfileChange({ krogerStoreId: id, krogerStoreName: name })} />
              )}
            </div>
          </div>
        )}
      </section>

      {/* Management Modals */}
      {isStorageModalOpen && (
        <StorageLocationsModal 
          user={user}
          storageLocations={storageLocations}
          onClose={() => setIsStorageModalOpen(false)}
          onStorageLocationsChange={onStorageLocationsChange}
          onReorderStorageLocations={onReorderStorageLocations}
        />
      )}

      {isTaxonomyModalOpen && (
        <TaxonomyModal 
          activeFamily={activeFamily}
          customCategories={customCategories}
          customSubCategories={customSubCategories}
          onClose={() => setIsTaxonomyModalOpen(false)}
          onAddCategory={onAddCategory}
          onRemoveCategory={onRemoveCategory}
          onAddSubCategory={onAddSubCategory}
          onRemoveSubCategory={onRemoveSubCategory}
        />
      )}
    </div>
  );
};

export default SettingsView;
