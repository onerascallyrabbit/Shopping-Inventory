
import React, { useState, useEffect } from 'react';
import { AppTab, Product, PriceRecord, ShoppingItem, StoreLocation, Vehicle, StorageLocation, InventoryItem, SubLocation, Profile } from './types';
import Dashboard from './components/Dashboard';
import ItemBrowser from './components/ItemBrowser';
import ShoppingList from './components/ShoppingList';
import ShopPlan from './components/ShopPlan';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import AddItemModal from './components/AddItemModal';
import SettingsView from './components/SettingsView';
import InventoryView from './components/InventoryView';
import { 
  syncInventoryItem, 
  bulkSyncInventory, 
  syncSubLocation, 
  deleteSubLocation, 
  syncStorageLocation,
  deleteStorageLocation,
  fetchUserData,
  testDatabaseConnection,
  supabase, 
  signInWithGoogle,
  getEnv,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  syncProfile,
  syncVehicle,
  deleteVehicle,
  syncStore
} from './services/supabaseService';

const DEFAULT_CATEGORIES = [
  "Produce", "Dairy", "Meat", "Seafood", "Deli", "Bakery", 
  "Frozen", "Pantry", "Beverages", "Household", "Personal Care", 
  "Baby", "Pets", "Other"
];

const DEFAULT_STORAGE: StorageLocation[] = [
  { id: '1', name: 'Pantry - Main' },
  { id: '2', name: 'Refrigerator #1' },
  { id: '3', name: 'Freezer #1' }
];

const DiagnosticBanner: React.FC<{ user?: any, isGuest: boolean, onExitGuest: () => void }> = ({ user, isGuest, onExitGuest }) => {
  const hasApiKey = !!getEnv('API_KEY');
  const [dbStatus, setDbStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [dbError, setDbError] = useState<string>('');

  const checkConnection = async () => {
    setDbStatus('checking');
    const result = await testDatabaseConnection();
    if (result.success) setDbStatus('success');
    else { setDbStatus('error'); setDbError(result.error || 'Unknown error'); }
  };

  if (!isGuest && user && dbStatus === 'success') return null;

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-3 flex flex-col items-center space-y-3 text-center z-50 animate-in slide-in-from-top duration-300">
      <div className="flex items-center space-x-2">
        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isGuest ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Diagnostic Console</span>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {!hasApiKey && <span className="bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-red-400 uppercase tracking-wider">AI Offline</span>}
        {isGuest ? (
          <button onClick={onExitGuest} className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-amber-400 tracking-wider">Guest Mode (Link Cloud)</button>
        ) : (
          <button onClick={checkConnection} className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${dbStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            {dbStatus === 'checking' ? 'Linking...' : dbStatus === 'success' ? 'Cloud Linked' : 'Verify Cloud'}
          </button>
        )}
      </div>
      {dbStatus === 'error' && <p className="text-[9px] font-medium text-red-400/80 italic">DB Error: {dbError}</p>}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('pricewise_is_guest') === 'true');
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  
  // App State
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(DEFAULT_STORAGE);
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  // Profile / Settings State
  const [profile, setProfile] = useState<Profile>({
    id: '', locationLabel: '', zip: '', gasPrice: 3.50, categoryOrder: DEFAULT_CATEGORIES, sharePrices: false
  });

  const [lastUsedStore, setLastUsedStore] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<'type' | 'barcode' | 'product' | 'tag'>('tag');

  // Fix: Moved loadCloudData to component scope and corrected Inventory mapping property names
  const loadCloudData = async () => {
    if (!supabase) return;
    const data = await fetchUserData();
    if (data) {
      if (data.profile) setProfile(data.profile);
      if (data.inventory.length) {
        setInventory(data.inventory.map(i => ({
          id: i.id, productId: i.product_id, itemName: i.item_name, category: i.category,
          variety: i.variety, subLocation: i.sub_location, quantity: Number(i.quantity),
          unit: i.unit, locationId: i.location_id, updatedAt: i.updated_at, userId: i.user_id
        })));
      }
      if (data.storageLocations.length) setStorageLocations(data.storageLocations.map(s => ({ id: s.id, name: s.name })));
      if (data.subLocations.length) setSubLocations(data.subLocations.map(s => ({ id: s.id, locationId: s.location_id, name: s.name })));
      if (data.stores.length) setStores(data.stores.map(s => ({ id: s.id, name: s.name, address: s.address, lat: Number(s.lat), lng: Number(s.lng), phone: s.phone, hours: s.hours, zip: s.zip })));
      if (data.vehicles.length) setVehicles(data.vehicles.map(v => ({ id: v.id, name: v.name, mpg: Number(v.mpg) })));
    }
  };

  // Load Data
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { setIsGuest(false); loadCloudData(); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { setIsGuest(false); loadCloudData(); }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync Profile Changes
  const handleUpdateProfile = (updates: Partial<Profile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    if (user) syncProfile(updates);
  };

  // Sync Inventory
  const handleUpdateInventory = (id: string, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        const updated = { ...item, quantity: newQty, updatedAt: new Date().toISOString(), userId: user?.id };
        if (user) syncInventoryItem(updated);
        return updated;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleAddToInventory = (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string) => {
    setInventory(prev => {
      const existingIndex = prev.findIndex(i => i.productId === productId && i.locationId === locationId && i.subLocation === subLocation);
      let updatedItem: InventoryItem;
      if (existingIndex > -1) {
        updatedItem = { ...prev[existingIndex], quantity: prev[existingIndex].quantity + qty, updatedAt: new Date().toISOString(), userId: user?.id };
        if (user) syncInventoryItem(updatedItem);
        const next = [...prev]; next[existingIndex] = updatedItem; return next;
      }
      updatedItem = { id: crypto.randomUUID(), productId, itemName, category, variety, subLocation, quantity: qty, unit, locationId, updatedAt: new Date().toISOString(), userId: user?.id };
      if (user) syncInventoryItem(updatedItem);
      return [...prev, updatedItem];
    });
  };

  const handleUpdateStores = (newStores: StoreLocation[]) => {
    setStores(newStores);
    if (user) newStores.forEach(s => syncStore(s));
  };

  const handleUpdateVehicles = (newVehicles: Vehicle[]) => {
    const deleted = vehicles.filter(v => !newVehicles.find(nv => nv.id === v.id));
    setVehicles(newVehicles);
    if (user) {
      newVehicles.forEach(v => syncVehicle(v));
      deleted.forEach(v => deleteVehicle(v.id));
    }
  };

  const handleUpdateStorageLocations = (newLocs: StorageLocation[]) => {
    const currentIds = storageLocations.map(s => s.id);
    const newIds = newLocs.map(s => s.id);
    setStorageLocations(newLocs);
    if (user) {
      newLocs.forEach(loc => syncStorageLocation(loc));
      currentIds.forEach(id => { if (!newIds.includes(id)) deleteStorageLocation(id); });
    }
  };

  const handleUpdateSubLocations = (newSubs: SubLocation[]) => {
    const currentIds = subLocations.map(s => s.id);
    const newIds = newSubs.map(s => s.id);
    setSubLocations(newSubs);
    if (user) {
      newSubs.forEach(s => syncSubLocation(s));
      currentIds.forEach(id => { if (!newIds.includes(id)) deleteSubLocation(id); });
    }
  };

  const handleAddPriceRecord = (category: string, itemName: string, variety: string, record: Omit<PriceRecord, 'id' | 'date'>, brand?: string, barcode?: string) => {
    const newRecord: PriceRecord = { ...record, id: crypto.randomUUID(), date: new Date().toISOString(), isPublic: profile.sharePrices };
    setProducts(prev => {
      const existingIdx = prev.findIndex(p => (barcode && p.barcode === barcode) || (p.itemName.toLowerCase() === itemName.toLowerCase() && p.variety?.toLowerCase() === (variety || '').toLowerCase()));
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], history: [newRecord, ...updated[existingIdx].history], brand: brand || updated[existingIdx].brand, barcode: barcode || updated[existingIdx].barcode, category: category };
        return updated;
      }
      return [...prev, { id: crypto.randomUUID(), category, itemName, variety, brand, barcode, history: [newRecord] }];
    });
    setLastUsedStore(record.store);
    setIsAddModalOpen(false);
  };

  if (!user && !isGuest) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center p-8 text-center overflow-y-auto">
        <div className="bg-indigo-600 p-6 rounded-[40px] shadow-2xl shadow-indigo-200 mb-8 transform hover:scale-105 transition-transform">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Aisle Be Back</h1>
        <p className="text-slate-400 font-medium mb-12 max-w-[280px] leading-relaxed text-sm">Sign in to sync your prices, pantry stock, and share lists with family.</p>
        <div className="w-full max-w-xs space-y-4">
          <button disabled={!supabase} onClick={signInWithGoogle} className={`w-full flex items-center justify-center space-x-3 text-white font-black py-5 rounded-[24px] shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs ${supabase ? 'bg-slate-900 hover:bg-black' : 'bg-slate-300'}`}>
            <span>{supabase ? 'Connect Cloud Identity' : 'Cloud Setup Required'}</span>
          </button>
          {!supabase && (
             <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 text-left space-y-3">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Setup Instructions:</p>
                <p className="text-[9px] font-medium text-amber-800 italic leading-relaxed">Ensure Vercel integration is using <code>VITE_</code> prefix for <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</p>
                <button onClick={() => window.location.reload()} className="w-full mt-2 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Re-Check Connection</button>
             </div>
          )}
          <button onClick={() => setIsGuest(true)} className="w-full text-slate-400 font-black py-4 uppercase tracking-[0.2em] text-[10px] hover:text-indigo-600 transition-colors">Continue as Guest (Local Only)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DiagnosticBanner user={user} isGuest={isGuest} onExitGuest={() => setIsGuest(false)} />
      <Header user={user} onSettingsClick={() => setActiveTab('settings')} />
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-6">
        {activeTab === 'dashboard' && <Dashboard products={products} onAddToList={(name, qty, unit, pid) => setShoppingList(prev => [...prev, { id: crypto.randomUUID(), productId: pid || 'manual', name, neededQuantity: qty, unit, isCompleted: false, userId: user?.id }])} />}
        {activeTab === 'items' && <ItemBrowser products={products} categoryOrder={profile.categoryOrder} onAddToList={(name, qty, unit, pid) => setShoppingList(prev => [...prev, { id: crypto.randomUUID(), productId: pid || 'manual', name, neededQuantity: qty, unit, isCompleted: false, userId: user?.id }])} />}
        {activeTab === 'inventory' && <InventoryView inventory={inventory} locations={storageLocations} subLocations={subLocations} products={products} categoryOrder={profile.categoryOrder} onUpdateQty={handleUpdateInventory} onAddToInventory={handleAddToInventory} onBulkAdd={(items) => { bulkSyncInventory(items.map(i => ({...i, id: crypto.randomUUID(), updatedAt: new Date().toISOString(), userId: user?.id}))); loadCloudData(); }} />}
        {activeTab === 'list' && <ShoppingList items={shoppingList} products={products} onToggle={(id) => setShoppingList(prev => prev.map(i => i.id === id ? {...i, isCompleted: !i.isCompleted} : i))} onRemove={(id) => setShoppingList(prev => prev.filter(i => i.id !== id))} onAdd={(n, q, u) => setShoppingList(prev => [...prev, { id: crypto.randomUUID(), productId: 'manual', name: n, neededQuantity: q, unit: u, isCompleted: false, userId: user?.id }])} />}
        {activeTab === 'shop' && <ShopPlan items={shoppingList} products={products} stores={stores} vehicles={vehicles} activeVehicleId={profile.activeVehicleId || ''} gasPrice={profile.gasPrice} onToggle={(id) => setShoppingList(prev => prev.map(i => i.id === id ? {...i, isCompleted: !i.isCompleted} : i))} onOverrideStore={(id, s) => setShoppingList(prev => prev.map(i => i.id === id ? {...i, manualStore: s} : i))} />}
        {activeTab === 'settings' && (
          <SettingsView 
            user={user} profile={profile} onProfileChange={handleUpdateProfile}
            stores={stores} onStoresChange={handleUpdateStores}
            vehicles={vehicles} onVehiclesChange={handleUpdateVehicles}
            storageLocations={storageLocations} onStorageLocationsChange={handleUpdateStorageLocations}
            subLocations={subLocations} onSubLocationsChange={handleUpdateSubLocations}
          />
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onAddClick={() => { setInitialMode('tag'); setIsAddModalOpen(true); }} />
      {isAddModalOpen && <AddItemModal onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddPriceRecord} onSaveToList={(n, q, u) => setShoppingList(prev => [...prev, { id: crypto.randomUUID(), productId: 'manual', name: n, neededQuantity: q, unit: u, isCompleted: false, userId: user?.id }])} initialMode={initialMode} products={products} location={profile.locationLabel} savedStores={stores} lastUsedStore={lastUsedStore} />}
    </div>
  );
};

export default App;
