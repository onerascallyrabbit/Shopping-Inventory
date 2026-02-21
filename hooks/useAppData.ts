
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Product, ShoppingItem, InventoryItem, StorageLocation, 
  SubLocation, StoreLocation, Vehicle, Profile, Family, CustomCategory, CustomSubCategory, MealIdea, CellarItem, ConsumptionLog
} from '../types';
import { 
  fetchUserData, syncInventoryItem, syncStorageLocation, 
  deleteStorageLocation, syncSubLocation, deleteSubLocation,
  syncProfile, syncVehicle, deleteVehicle, syncStore,
  syncProduct, syncPriceRecord, supabase, bulkSyncInventory, fetchFamily,
  deleteInventoryItem, syncShoppingItem, deleteShoppingItem,
  syncCustomCategory, deleteCustomCategory, syncCustomSubCategory, deleteCustomSubCategory,
  bulkSyncStorageLocations, bulkSyncMealIdeas, updateMealStats, saveMealRating,
  syncCellarItem, deleteCellarItem, syncConsumptionLog
} from '../services/supabaseService';
import { generateMealIdeas } from '../services/geminiService';
import { DEFAULT_CATEGORIES, DEFAULT_STORAGE } from '../constants';

export const useAppData = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [cellarItems, setCellarItems] = useState<CellarItem[]>([]);
  const [consumptionLogs, setConsumptionLogs] = useState<ConsumptionLog[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(DEFAULT_STORAGE.map((s, i) => ({ ...s, sortOrder: i })));
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [customSubCategories, setCustomSubCategories] = useState<CustomSubCategory[]>([]);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [profile, setProfile] = useState<Profile>({ 
    id: '', locationLabel: '', zip: '', gasPrice: 3.50, 
    categoryOrder: DEFAULT_CATEGORIES, sharePrices: false 
  });

  const isSyncingReorder = useRef(false);

  const loadAllData = useCallback(async (silent = false) => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    if (silent && isSyncingReorder.current) {
      return;
    }

    if (!silent) setLoading(true);
    try {
      const data = await fetchUserData();
      if (data) {
        if (data.profile) {
          setProfile(data.profile);
          if (data.profile.familyId) {
            const familyDetails = await fetchFamily(data.profile.familyId);
            setActiveFamily(familyDetails);
          } else {
            setActiveFamily(null);
          }
        }
        
        setProducts(data.products || []);
        setShoppingList(data.shoppingList || []);
        setCustomCategories(data.customCategories || []);
        setCustomSubCategories(data.customSubCategories || []);
        setMealIdeas(data.mealIdeas || []);
        setCellarItems(data.cellarItems || []);
        setConsumptionLogs(data.consumptionLogs || []);
        
        if (data.inventory) {
          setInventory(data.inventory.map(i => ({
            id: i.id, productId: i.product_id, itemName: i.item_name, category: i.category,
            subCategory: i.sub_category,
            variety: i.variety, subLocation: i.sub_location, quantity: Number(i.quantity),
            unit: i.unit, locationId: i.location_id, updatedAt: i.updated_at, userId: i.user_id
          })));
        }

        if (data.storageLocations) {
            setStorageLocations(data.storageLocations.map(s => ({ 
                id: s.id, 
                name: s.name, 
                sortOrder: s.sort_order ?? 0 
            })));
        }
        if (data.subLocations) setSubLocations(data.subLocations.map(s => ({ id: s.id, locationId: s.location_id, name: s.name })));
        if (data.stores) setStores(data.stores.map(s => ({ id: s.id, name: s.name, address: s.address, lat: Number(s.lat), lng: Number(s.lng), phone: s.phone, hours: s.hours, zip: s.zip })));
        if (data.vehicles) setVehicles(data.vehicles.map(v => ({ id: v.id, name: v.name, mpg: Number(v.mpg) })));
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;

    const channel = supabase
      .channel('family-changes')
      .on('postgres_changes', { event: '*', table: 'inventory', schema: 'public' }, () => loadAllData(true))
      .on('postgres_changes', { event: '*', table: 'shopping_list', schema: 'public' }, () => loadAllData(true))
      .on('postgres_changes', { event: '*', table: 'custom_categories', schema: 'public' }, () => loadAllData(true))
      .on('postgres_changes', { event: '*', table: 'custom_sub_categories', schema: 'public' }, () => loadAllData(true))
      .on('postgres_changes', { event: '*', table: 'meal_ideas', schema: 'public' }, () => loadAllData(true))
      .on('postgres_changes', { event: '*', table: 'storage_locations', schema: 'public' }, () => loadAllData(true))
      .on('postgres_changes', { event: '*', table: 'cellar_items', schema: 'public' }, () => loadAllData(true))
      .on('postgres_changes', { event: '*', table: 'consumption_logs', schema: 'public' }, () => loadAllData(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, user, loadAllData]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadAllData();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadAllData();
      else setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, [loadAllData]);

  const refreshMeals = async () => {
    if (!activeFamily) {
      alert("No active Family Hub. Please join or create a Hub in Settings to enable shared meal planning.");
      return;
    }
    if (inventory.length === 0) {
      alert("Your stock is empty! Add items to your inventory so the AI can suggest recipes.");
      return;
    }

    setLoading(true);
    try {
      const newMeals = await generateMealIdeas(inventory);
      if (newMeals && newMeals.length > 0) {
        await bulkSyncMealIdeas(activeFamily.id, newMeals);
        await loadAllData(true);
      } else {
        alert("The AI was unable to suggest meals. Check your inventory items or API limits.");
      }
    } catch (err: any) {
      console.error("Meal Generation Failure:", err);
      alert(`AI Error: ${err.message || 'Failed to generate meals. Try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const cookMeal = async (mealId: string) => {
    const meal = mealIdeas.find(m => m.id === mealId);
    if (!meal) return;
    const updates = { 
      cook_count: (meal.cookCount || 0) + 1, 
      last_cooked: new Date().toISOString() 
    };
    await updateMealStats(mealId, updates);
    loadAllData(true);
  };

  const rateMeal = async (mealId: string, rating: number) => {
    await saveMealRating(mealId, rating);
    loadAllData(true);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (user) await syncProfile(updates);
      setProfile(prev => ({ ...prev, ...updates }));
      if (updates.familyId !== undefined) await loadAllData();
    } catch (e) {
      console.error("Profile update failed:", e);
    }
  };

  const updateInventoryQty = async (id: string, delta: number) => {
    const target = inventory.find(i => i.id === id);
    if (!target) return;
    const newQty = Math.max(0, target.quantity + delta);
    const updatedItem = { ...target, quantity: newQty, updatedAt: new Date().toISOString() };
    setInventory(prev => newQty === 0 ? prev.filter(i => i.id !== id) : prev.map(i => i.id === id ? updatedItem : i));
    if (user) {
        try {
            if (newQty === 0) await deleteInventoryItem(id);
            else await syncInventoryItem(updatedItem);
        } catch (err) { loadAllData(); }
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    const target = inventory.find(i => i.id === id);
    if (!target) return;
    const updated = { ...target, ...updates, updatedAt: new Date().toISOString() };
    setInventory(prev => prev.map(item => item.id === id ? updated : item));
    if (user) try { await syncInventoryItem(updated); } catch (err) { loadAllData(); }
  };

  const removeInventoryItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    if (user) try { await deleteInventoryItem(id); } catch (err) { loadAllData(); }
  };

  const addPriceRecord = async (category: string, itemName: string, variety: string, record: any, brand?: string, barcode?: string, subCategory?: string) => {
    const newRecord = { ...record, id: crypto.randomUUID(), date: new Date().toISOString(), isPublic: profile.sharePrices };
    const existingProduct = products.find(p => (barcode && p.barcode === barcode) || (p.itemName.toLowerCase() === itemName.toLowerCase() && (p.variety || '').toLowerCase() === (variety || '').toLowerCase() && (p.brand || '').toLowerCase() === (brand || '').toLowerCase()));
    let productId = existingProduct?.id;
    if (user) {
      try {
        const syncedProduct = await syncProduct({ id: productId, category, itemName, variety, brand, barcode, subCategory });
        productId = syncedProduct.id;
        await syncPriceRecord(productId, newRecord, user.id);
      } catch (err) { console.error(err); }
    }
    setProducts(prev => {
      if (existingProduct) return prev.map(p => p.id === existingProduct.id ? { ...p, history: [newRecord, ...p.history] } : p);
      return [...prev, { id: productId || crypto.randomUUID(), category, subCategory, itemName, variety, brand, barcode, history: [newRecord] }];
    });
  };

  const addToList = async (name: string, qty: number, unit: string, productId?: string, category?: string) => {
    const newItem: ShoppingItem = { id: crypto.randomUUID(), productId: productId || 'manual', name, neededQuantity: qty, unit, isCompleted: false, userId: user?.id, category };
    setShoppingList(prev => [newItem, ...prev]);
    if (user) try { await syncShoppingItem(newItem); } catch (e) { console.error(e); }
  };

  const toggleListItem = async (id: string) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    const updated = { ...item, isCompleted: !item.isCompleted };
    setShoppingList(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncShoppingItem(updated); } catch (e) { console.error(e); }
  };

  const removeListItem = async (id: string) => {
    setShoppingList(prev => prev.filter(i => i.id !== id));
    if (user) try { await deleteShoppingItem(id); } catch (e) { console.error(e); }
  };

  const overrideStoreForListItem = async (id: string, store: string | undefined) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    const updated = { ...item, manualStore: store };
    setShoppingList(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncShoppingItem(updated); } catch (e) { console.error(e); }
  };

  const addToInventory = async (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string, subCategory?: string) => {
    const newItem: InventoryItem = { id: crypto.randomUUID(), productId, itemName, category, subCategory, variety, subLocation, quantity: qty, unit, locationId, updatedAt: new Date().toISOString(), userId: user?.id || '' };
    setInventory(prev => [...prev, newItem]);
    if (user) try { await syncInventoryItem(newItem); } catch (err) { loadAllData(); }
  };

  const importBulkInventory = async (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => {
    const timestamp = new Date().toISOString();
    const newItems = items.map(i => ({ ...i, id: crypto.randomUUID(), updatedAt: timestamp, userId: user?.id || '' })) as InventoryItem[];
    setInventory(prev => [...prev, ...newItems]);
    if (user) try { await bulkSyncInventory(newItems); } catch (err) { loadAllData(); throw err; }
  };

  const updateCellarQty = async (id: string, delta: number) => {
    const target = cellarItems.find(i => i.id === id);
    if (!target) return;
    const newQty = Math.max(0, target.quantity + delta);
    const updated = { ...target, quantity: newQty, updatedAt: new Date().toISOString() };
    setCellarItems(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncCellarItem(updated); } catch (err) { loadAllData(); }
  };

  const addCellarItem = async (item: Omit<CellarItem, 'id' | 'updatedAt' | 'userId'>) => {
    const newItem: CellarItem = { 
      ...item, 
      id: crypto.randomUUID(), 
      userId: user?.id || '', 
      updatedAt: new Date().toISOString() 
    };
    setCellarItems(prev => [...prev, newItem]);
    if (user) try { await syncCellarItem(newItem); } catch (err) { loadAllData(); }
  };

  const updateCellarItem = async (id: string, updates: Partial<CellarItem>) => {
    const target = cellarItems.find(i => i.id === id);
    if (!target) return;
    const updated = { ...target, ...updates, updatedAt: new Date().toISOString() };
    setCellarItems(prev => prev.map(i => i.id === id ? updated : i));
    if (user) try { await syncCellarItem(updated); } catch (err) { loadAllData(); }
  };

  const removeCellarItem = async (id: string) => {
    setCellarItems(prev => prev.filter(i => i.id !== id));
    if (user) try { await deleteCellarItem(id); } catch (err) { loadAllData(); }
  };

  const logConsumption = async (itemId: string, quantity: number, occasion?: string, notes?: string) => {
    const newLog: ConsumptionLog = {
      id: crypto.randomUUID(),
      itemId,
      quantity,
      date: new Date().toISOString(),
      occasion,
      notes
    };
    setConsumptionLogs(prev => [newLog, ...prev]);
    if (user) try { await syncConsumptionLog(newLog); } catch (err) { loadAllData(); }
  };

  const reorderStorageLocations = async (newOrder: StorageLocation[]) => {
    const ordered = newOrder.map((l, i) => ({ ...l, sortOrder: i }));
    setStorageLocations(ordered);
    if (user) {
        isSyncingReorder.current = true;
        try {
            await bulkSyncStorageLocations(ordered);
            setTimeout(() => { isSyncingReorder.current = false; }, 1500);
        } catch (e) {
            console.error("Reorder sync failed:", e);
            isSyncingReorder.current = false;
            loadAllData(true);
        }
    }
  };

  const addCategory = async (name: string) => {
    if (!activeFamily) return;
    await syncCustomCategory({ familyId: activeFamily.id, name });
    loadAllData(true);
  };

  const removeCategory = async (id: string) => {
    const cat = customCategories.find(c => c.id === id);
    if (!cat) return;
    const inUse = inventory.some(i => i.category === cat.name) || products.some(p => p.category === cat.name);
    if (inUse) {
        alert("Cannot delete category: It is currently assigned to items in your stock or price history.");
        return;
    }
    await deleteCustomCategory(id);
    loadAllData(true);
  };

  const addSubCategory = async (categoryName: string, name: string) => {
    if (!activeFamily) return;
    await syncCustomSubCategory({ familyId: activeFamily.id, categoryId: categoryName, name });
    loadAllData(true);
  };

  const removeSubCategory = async (id: string) => {
    const sub = customSubCategories.find(s => s.id === id);
    if (!sub) return;
    const inUse = inventory.some(i => i.subCategory === sub.name) || products.some(p => p.subCategory === sub.name);
    if (inUse) {
        alert("Cannot delete sub-category: It is currently assigned to items in your stock or price history.");
        return;
    }
    await deleteCustomSubCategory(id);
    loadAllData(true);
  };

  return {
    user, loading, products, shoppingList, inventory, mealIdeas, cellarItems, consumptionLogs,
    storageLocations, setStorageLocations, subLocations, setSubLocations,
    stores, setStores, vehicles, setVehicles, profile, activeFamily,
    customCategories, customSubCategories,
    addCategory, removeCategory, addSubCategory, removeSubCategory,
    updateProfile, updateInventoryQty, updateInventoryItem, removeInventoryItem, 
    addPriceRecord, addToList, toggleListItem, removeListItem, overrideStoreForListItem, 
    addToInventory, importBulkInventory, reorderStorageLocations, refresh: loadAllData,
    refreshMeals, cookMeal, rateMeal,
    updateCellarQty, addCellarItem, updateCellarItem, removeCellarItem, logConsumption
  };
};
