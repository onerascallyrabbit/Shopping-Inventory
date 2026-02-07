
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
import { syncInventoryItem, bulkSyncInventory, syncSubLocation, deleteSubLocation } from './services/supabaseService';

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

const App: React.FC = () => {
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

  useEffect(() => {
    const handleOpenModal = (e: any) => {
      setInitialMode(e.detail.mode || 'tag');
      setIsAddModalOpen(true);
    };
    document.addEventListener('openAddModal', handleOpenModal);
    return () => document.removeEventListener('openAddModal', handleOpenModal);
  }, []);

  useEffect(() => {
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
    if (savedInventory) setInventory(JSON.parse(savedInventory));
    if (savedStorage) setStorageLocations(JSON.parse(savedStorage));
    if (savedSubLocations) setSubLocations(JSON.parse(savedSubLocations));
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
  }, []);

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
        const updated = { ...item, quantity: newQty, updatedAt: new Date().toISOString() };
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
          updatedAt: new Date().toISOString()
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
        updatedAt: new Date().toISOString()
      };
      syncInventoryItem(updatedItem);
      return [...prev, updatedItem];
    });
  };

  const handleBulkAddToInventory = (newItems: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => {
    const itemsWithMeta: InventoryItem[] = newItems.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString()
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

  const handleUpdateSubLocations = (newSubs: SubLocation[]) => {
    setSubLocations(newSubs);
    // Find missing items to delete from DB
    const currentIds = subLocations.map(s => s.id);
    const newIds = newSubs.map(s => s.id);
    currentIds.forEach(id => {
      if (!newIds.includes(id)) deleteSubLocation(id);
    });
    // Upsert all others
    newSubs.forEach(s => syncSubLocation(s));
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
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const handleRemoveListItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateListItem = (id: string, updates: Partial<ShoppingItem>) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleAddPriceRecord = (category: string, itemName: string, variety: string, record: Omit<PriceRecord, 'id' | 'date'>, brand?: string, barcode?: string) => {
    const newRecord: PriceRecord = {
      ...record,
      id: crypto.randomUUID(),
      date: new Date().toISOString()
    };
    setProducts(prev => {
      const existingIdx = prev.findIndex(p => 
        (barcode && p.barcode === barcode) || 
        (p.itemName.toLowerCase() === itemName.toLowerCase() && p.variety?.toLowerCase() === (variety || '').toLowerCase())
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          history: [newRecord, ...updated[existingIdx].history],
          brand: brand || updated[existingIdx].brand,
          barcode: barcode || updated[existingIdx].barcode,
          category: category
        };
        return updated;
      }
      const newProduct: Product = {
        id: crypto.randomUUID(),
        category,
        itemName,
        variety,
        brand,
        barcode,
        history: [newRecord]
      };
      return [...prev, newProduct];
    });
    setLastUsedStore(record.store);
    setIsAddModalOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <Header onSettingsClick={() => setActiveTab('settings')} />
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
            onStorageLocationsChange={setStorageLocations}
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
