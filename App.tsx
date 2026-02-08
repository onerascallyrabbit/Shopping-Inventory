import React, { useState, useEffect } from 'react';
import { AppTab, Product, PriceRecord, ShoppingItem, StoreLocation, Vehicle, StorageLocation, InventoryItem, SubLocation } from './types';
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
  signInWithGoogle 
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

const DiagnosticBanner: React.FC<{ user?: any, onShowAuth: () => void }> = ({ user, onShowAuth }) => {
  const hasEnv = typeof process !== 'undefined' && process.env;
  const hasApiKey = !!(hasEnv && process.env.API_KEY);
  const hasSupabase = !!supabase;
  const [show, setShow] = useState(true);
  const [dbStatus, setDbStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [dbError, setDbError] = useState<string>('');

  const checkConnection = async () => {
    setDbStatus('checking');
    const result = await testDatabaseConnection();
    if (result.success) {
      setDbStatus('success');
    } else {
      setDbStatus('error');
      setDbError(result.error || 'Unknown connection error');
    }
  };

  const isHealthy = hasApiKey && hasSupabase && user && dbStatus === 'success';
  if (isHealthy && !show) return null;

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-3 flex flex-col items-center space-y-3 text-center z-50 animate-in slide-in-from-top duration-300">
      <div className="flex items-center space-x-2">
        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${dbStatus === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Diagnostic Console</span>
      </div>
      
      <div className="flex flex-wrap justify-center gap-1.5">
        {!hasApiKey && <span className="bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-red-400 uppercase tracking-wider">AI Service Offline</span>}
        {!hasSupabase && (
          <button onClick={onShowAuth} className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-amber-400 uppercase tracking-wider hover:bg-amber-500/20 transition-colors">
            Cloud Unlinked (Click to Fix)
          </button>
        )}
        {hasSupabase && !user && (
          <button onClick={onShowAuth} className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[8px] font-bold text-indigo-400 uppercase tracking-wider">
            Sign-in Required
          </button>
        )}
        {hasSupabase && user && (
          <button 
            onClick={checkConnection}
            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-colors border ${
              dbStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              dbStatus === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {dbStatus === 'checking' ? 'Testing Link...' : dbStatus === 'success' ? 'Link Verified' : 'Verify Link'}
          </button>
        )}
      </div>

      {dbStatus === 'error' && (
        <div className="max-w-xs bg-red-500/5 border border-red-500/10 rounded-lg p-2 mt-1">
          <p className="text-[9px] font-medium text-red-400/80 leading-relaxed italic">DB Error: {dbError}</p>
        </div>
      )}

      <button onClick={() => setShow(false)} className="text-[9px] font-black text-slate-600 uppercase hover:text-white transition-colors tracking-widest">Hide Console</button>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(DEFAULT_STORAGE);
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(DEFAULT_CATEGORIES);
  const [userLocation, setUserLocation] = useState<string>('');
  const [userZip, setUserZip] = useState<string>('');
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string>('');
  const [gasPrice, setGasPrice] = useState<number>(3.50);
  const [lastUsedStore, setLastUsedStore] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<'type' | 'barcode' | 'product' | 'tag'>('tag');

  // Auth & Cloud Load
  useEffect(() => {
    if (!supabase) return;
    
    const loadCloudData = async () => {
      const data = await fetchUserData();
      if (data) {
        if (data.inventory.length) {
          const mapped = data.inventory.map(i => ({
            id: i.id,
            productId: i.product_id,
            itemName: i.item_name,
            category: i.category,
            variety: i.variety,
            subLocation: i.sub_location,
            quantity: Number(i.quantity),
            unit: i.unit,
            locationId: i.location_id,
            updatedAt: i.updated_at,
            userId: i.user_id
          }));
          setInventory(mapped);
        }
        
        if (data.storageLocations.length) {
          setStorageLocations(data.storageLocations.map(s => ({ id: s.id, name: s.name })));
        }

        if (data.subLocations.length) {
          setSubLocations(data.subLocations.map(s => ({ id: s.id, locationId: s.location_id, name: s.name })));
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadCloudData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadCloudData();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleOpenModal = (e: any) => {
      setInitialMode(e.detail.mode || 'tag');
      setIsAddModalOpen(true);
    };
    document.addEventListener('openAddModal', handleOpenModal);
    return () => document.removeEventListener('openAddModal', handleOpenModal);
  }, []);

  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem('pricewise_products');
      const savedList = localStorage.getItem('pricewise_list');
      const savedInventory = localStorage.getItem('pricewise_inventory');
      const savedStorage = localStorage.getItem('pricewise_storage');
      const savedSubLocations = localStorage.getItem('pricewise_sub_locations');
      const savedCategories = localStorage.getItem('pricewise_categories');
      const savedLocation = localStorage.getItem('pricewise_location');
      const savedZip = localStorage.getItem('pricewise_zip');
      const savedStores = localStorage.getItem('pricewise_stores');
      const savedVehicles = localStorage.getItem('pricewise_vehicles');
      const savedActiveVehicle = localStorage.getItem('pricewise_active_vehicle');
      const savedLastStore = localStorage.getItem('pricewise_last_store');
      const savedGas = localStorage.getItem('pricewise_gas_price');
      
      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedList) setShoppingList(JSON.parse(savedList));
      if (!user && savedInventory) setInventory(JSON.parse(savedInventory));
      if (!user && savedStorage) setStorageLocations(JSON.parse(savedStorage));
      if (!user && savedSubLocations) setSubLocations(JSON.parse(savedSubLocations));
      if (savedLocation) setUserLocation(savedLocation);
      if (savedZip) setUserZip(savedZip);
      if (savedStores) setStores(JSON.parse(savedStores));
      if (savedVehicles) setVehicles(JSON.parse(savedVehicles));
      if (savedActiveVehicle) setActiveVehicleId(savedActiveVehicle);
      if (savedLastStore) setLastUsedStore(savedLastStore);
      if (savedGas) setGasPrice(parseFloat(savedGas));
      if (savedCategories) {
        const parsed = JSON.parse(savedCategories);
        const merged = Array.from(new Set([...parsed, ...DEFAULT_CATEGORIES]));
        setCategoryOrder(merged);
      }
    } catch (e) {
      console.error("LocalStorage load error:", e);
    }
  }, [user]);

  useEffect(() => { localStorage.setItem('pricewise_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('pricewise_list', JSON.stringify(shoppingList)); }, [shoppingList]);
  useEffect(() => { localStorage.setItem('pricewise_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('pricewise_storage', JSON.stringify(storageLocations)); }, [storageLocations]);
  useEffect(() => { localStorage.setItem('pricewise_sub_locations', JSON.stringify(subLocations)); }, [subLocations]);
  useEffect(() => { localStorage.setItem('pricewise_categories', JSON.stringify(categoryOrder)); }, [categoryOrder]);
  useEffect(() => { localStorage.setItem('pricewise_location', userLocation); }, [userLocation]);
  useEffect(() => { localStorage.setItem('pricewise_zip', userZip); }, [userZip]);
  useEffect(() => { localStorage.setItem('pricewise_stores', JSON.stringify(stores)); }, [stores]);
  useEffect(() => { localStorage.setItem('pricewise_vehicles', JSON.stringify(vehicles)); }, [vehicles]);
  useEffect(() => { localStorage.setItem('pricewise_active_vehicle', activeVehicleId); }, [activeVehicleId]);
  useEffect(() => { localStorage.setItem('pricewise_last_store', lastUsedStore); }, [lastUsedStore]);
  useEffect(() => { localStorage.setItem('pricewise_gas_price', gasPrice.toString()); }, [gasPrice]);

  const handleUpdateInventory = (id: string, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        const updated = { ...item, quantity: newQty, updatedAt: new Date().toISOString(), userId: user?.id };
        syncInventoryItem(updated);
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
        const updated = [...prev];
        updatedItem = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
          updatedAt: new Date().toISOString(),
          userId: user?.id
        };
        updated[existingIndex] = updatedItem;
        syncInventoryItem(updatedItem);
        return updated;
      }
      updatedItem = {
        id: crypto.randomUUID(),
        productId,
        itemName,
        category,
        variety,
        subLocation,
        quantity: qty,
        unit,
        locationId,
        updatedAt: new Date().toISOString(),
        userId: user?.id
      };
      syncInventoryItem(updatedItem);
      return [...prev, updatedItem];
    });
  };

  const handleBulkAddToInventory = (newItems: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => {
    const itemsWithMeta: InventoryItem[] = newItems.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      userId: user?.id
    }));
    setInventory(prev => {
      const merged = [...prev];
      itemsWithMeta.forEach(item => {
        const idx = merged.findIndex(m => m.itemName === item.itemName && m.variety === item.variety && m.locationId === item.locationId && m.subLocation === item.subLocation);
        if (idx > -1) {
          merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + item.quantity, updatedAt: item.updatedAt };
        } else {
          merged.push(item);
        }
      });
      return merged;
    });
    bulkSyncInventory(itemsWithMeta);
  };

  const handleUpdateStorageLocations = (newLocs: StorageLocation[]) => {
    const currentIds = storageLocations.map(s => s.id);
    const newIds = newLocs.map(s => s.id);
    setStorageLocations(newLocs);
    newLocs.forEach(loc => syncStorageLocation(loc));
    currentIds.forEach(id => {
      if (!newIds.includes(id)) deleteStorageLocation(id);
    });
  };

  const handleUpdateSubLocations = (newSubs: SubLocation[]) => {
    const currentIds = subLocations.map(s => s.id);
    const newIds = newSubs.map(s => s.id);
    setSubLocations(newSubs);
    newSubs.forEach(s => syncSubLocation(s));
    currentIds.forEach(id => {
      if (!newIds.includes(id)) deleteSubLocation(id);
    });
  };

  const handleAddToList = (name: string, qty: number, unit: string, productId?: string) => {
    setShoppingList(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: productId || 'manual',
        name,
        neededQuantity: qty,
        unit,
        isCompleted: false
      }
    ]);
  };

  const handleToggleListItem = (id: string) => {
    setShoppingList(prev => prev.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
  };

  const handleRemoveListItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateListItem = (id: string, updates: Partial<ShoppingItem>) => {
    setShoppingList(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleAddPriceRecord = (category: string, itemName: string, variety: string, record: Omit<PriceRecord, 'id' | 'date'>, brand?: string, barcode?: string) => {
    const newRecord: PriceRecord = { ...record, id: crypto.randomUUID(), date: new Date().toISOString() };
    setProducts(prev => {
      const existingIdx = prev.findIndex(p => (barcode && p.barcode === barcode) || (p.itemName.toLowerCase() === itemName.toLowerCase() && p.variety?.toLowerCase() === (variety || '').toLowerCase()));
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], history: [newRecord, ...updated[existingIdx].history], brand: brand || updated[existingIdx].brand, barcode: barcode || updated[existingIdx].barcode, category: category };
        return updated;
      }
      const newProduct: Product = { id: crypto.randomUUID(), category, itemName, variety, brand, barcode, history: [newRecord] };
      return [...prev, newProduct];
    });
    setLastUsedStore(record.store);
    setIsAddModalOpen(false);
  };

  // AUTH GATE: Show if no user and not explicitly in offline mode
  if (!user && !isOfflineMode) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="bg-indigo-600 p-6 rounded-[40px] shadow-2xl shadow-indigo-200 mb-8 transform hover:scale-105 transition-transform cursor-pointer">
          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Aisle Be Back</h1>
        <p className="text-slate-400 font-medium mb-12 max-w-[280px] leading-relaxed">Securely track and compare prices. Sign in to sync your data across all your devices.</p>
        
        <div className="w-full max-w-xs space-y-4">
          <button 
            disabled={!supabase}
            onClick={signInWithGoogle}
            className={`w-full flex items-center justify-center space-x-3 text-white font-black py-5 rounded-[24px] shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs ${supabase ? 'bg-slate-900 hover:bg-black' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.152-1.928 4.176-1.248 1.248-3.216 2.592-6.528 2.592-5.32 0-9.28-4.32-9.28-9.64s3.96-9.64 9.28-9.64c2.88 0 5.112 1.136 6.64 2.56l2.312-2.312C18.84 1.288 15.864 0 12 0 5.48 0 0 5.48 0 12s5.48 12 12 12c3.544 0 6.232-1.176 8.336-3.32 2.16-2.16 2.848-5.216 2.848-7.68 0-.744-.064-1.44-.192-2.08h-10.512z"/>
            </svg>
            <span>{supabase ? 'Sign In with Google' : 'Cloud Setup Required'}</span>
          </button>

          {!supabase && (
             <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-relaxed">
                   Link not found: Add SUPABASE_URL and SUPABASE_ANON_KEY to Vercel environment variables and redeploy.
                </p>
             </div>
          )}

          <button 
            onClick={() => setIsOfflineMode(true)}
            className="w-full text-slate-400 font-black py-4 uppercase tracking-[0.2em] text-[10px] hover:text-indigo-600 transition-colors"
          >
            Continue Locally
          </button>
        </div>
        
        <p className="mt-12 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Build 2.0.4 • {supabase ? 'Sync Enabled' : 'Standalone Mode'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DiagnosticBanner user={user} onShowAuth={() => setIsOfflineMode(false)} />
      <Header user={user} onSettingsClick={() => setActiveTab('settings')} />
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-6">
        {activeTab === 'dashboard' && <Dashboard products={products} onAddToList={handleAddToList} />}
        {activeTab === 'items' && <ItemBrowser products={products} categoryOrder={categoryOrder} onAddToList={handleAddToList} />}
        {activeTab === 'inventory' && (
          <InventoryView 
            inventory={inventory} 
            locations={storageLocations} 
            subLocations={subLocations}
            products={products}
            categoryOrder={categoryOrder}
            onUpdateQty={handleUpdateInventory} 
            onAddToInventory={handleAddToInventory}
            onBulkAdd={handleBulkAddToInventory}
          />
        )}
        {activeTab === 'list' && <ShoppingList items={shoppingList} products={products} onToggle={handleToggleListItem} onRemove={handleRemoveListItem} onAdd={handleAddToList} />}
        {activeTab === 'shop' && <ShopPlan items={shoppingList} products={products} stores={stores} vehicles={vehicles} activeVehicleId={activeVehicleId} gasPrice={gasPrice} onToggle={handleToggleListItem} onOverrideStore={(id, store) => handleUpdateListItem(id, { manualStore: store })} />}
        {activeTab === 'settings' && (
          <SettingsView 
            user={user}
            location={userLocation}
            onLocationChange={setUserLocation}
            zip={userZip}
            onZipChange={setUserZip}
            categoryOrder={categoryOrder}
            onCategoryOrderChange={setCategoryOrder}
            stores={stores}
            onStoresChange={setStores}
            vehicles={vehicles}
            onVehiclesChange={setVehicles}
            activeVehicleId={activeVehicleId}
            onActiveVehicleChange={setActiveVehicleId}
            gasPrice={gasPrice}
            onGasPriceChange={setGasPrice}
            storageLocations={storageLocations}
            onStorageLocationsChange={handleUpdateStorageLocations}
            subLocations={subLocations}
            onSubLocationsChange={handleUpdateSubLocations}
          />
        )}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onAddClick={() => { setInitialMode('tag'); setIsAddModalOpen(true); }} />
      {isAddModalOpen && <AddItemModal onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddPriceRecord} onSaveToList={handleAddToList} initialMode={initialMode} products={products} location={userLocation} savedStores={stores} lastUsedStore={lastUsedStore} />}
    </div>
  );
};

export default App;
