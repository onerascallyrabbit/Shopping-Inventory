
import { useState, useEffect, useCallback } from 'react';
import { 
  Product, ShoppingItem, InventoryItem, StorageLocation, 
  SubLocation, StoreLocation, Vehicle, Profile, Family 
} from '../types';
import { 
  fetchUserData, syncInventoryItem, syncStorageLocation, 
  deleteStorageLocation, syncSubLocation, deleteSubLocation,
  syncProfile, syncVehicle, deleteVehicle, syncStore,
  syncProduct, syncPriceRecord, supabase, bulkSyncInventory, fetchFamily,
  deleteInventoryItem
} from '../services/supabaseService';
import { DEFAULT_CATEGORIES, DEFAULT_STORAGE } from '../constants';

export const useAppData = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(DEFAULT_STORAGE);
  const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [profile, setProfile] = useState<Profile>({ 
    id: '', locationLabel: '', zip: '', gasPrice: 3.50, 
    categoryOrder: DEFAULT_CATEGORIES, sharePrices: false 
  });

  const loadAllData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
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
        
        // Products
        setProducts(data.products || []);
        
        // Inventory
        if (data.inventory) {
          setInventory(data.inventory.map(i => ({
            id: i.id, productId: i.product_id, itemName: i.item_name, category: i.category,
            subCategory: i.sub_category,
            variety: i.variety, subLocation: i.sub_location, quantity: Number(i.quantity),
            unit: i.unit, locationId: i.location_id, updatedAt: i.updated_at, userId: i.user_id
          })));
        } else {
          setInventory([]);
        }

        // Locations
        if (data.storageLocations) setStorageLocations(data.storageLocations.map(s => ({ id: s.id, name: s.name })));
        if (data.subLocations) setSubLocations(data.subLocations.map(s => ({ id: s.id, locationId: s.location_id, name: s.name })));
        
        // Metadata
        if (data.stores) setStores(data.stores.map(s => ({ id: s.id, name: s.name, address: s.address, lat: Number(s.lat), lng: Number(s.lng), phone: s.phone, hours: s.hours, zip: s.zip })));
        if (data.vehicles) setVehicles(data.vehicles.map(v => ({ id: v.id, name: v.name, mpg: Number(v.mpg) })));
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime Subscription for Inventory Changes
  useEffect(() => {
    if (!supabase || !user) return;

    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        { event: '*', table: 'inventory', schema: 'public' },
        (payload) => {
          console.log('Realtime Inventory Update:', payload);
          // When any family member makes a change, just refresh the local state
          // This is the most robust way to handle multi-user conflicts
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const updateProfile = async (updates: Partial<Profile>) => {
    const isFamilyChange = updates.familyId !== undefined && updates.familyId !== profile.familyId;
    
    try {
      if (user) await syncProfile(updates);
      setProfile(prev => ({ ...prev, ...updates }));

      if (isFamilyChange) {
        await loadAllData();
      } else if (updates.familyId === undefined && profile.familyId) {
         setActiveFamily(null);
      }
    } catch (e) {
      console.error("Profile update failed:", e);
      throw e;
    }
  };

  const updateInventoryQty = async (id: string, delta: number) => {
    const target = inventory.find(i => i.id === id);
    if (!target) return;

    const newQty = Math.max(0, target.quantity + delta);
    const updatedAt = new Date().toISOString();

    if (user) {
        try {
            if (newQty === 0) {
                await deleteInventoryItem(id);
            } else {
                await syncInventoryItem({ ...target, quantity: newQty, updatedAt });
            }
            // Note: We don't update local state manually here. 
            // The Realtime listener will catch the DB change and update the UI.
        } catch (err) {
            console.error("Failed to sync inventory qty update:", err);
            loadAllData();
        }
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    const target = inventory.find(i => i.id === id);
    if (!target) return;

    if (user) {
        try {
            await syncInventoryItem({ ...target, ...updates, updatedAt: new Date().toISOString() });
        } catch (err) {
            console.error("Failed to sync inventory item update:", err);
            loadAllData();
        }
    }
  };

  const removeInventoryItem = async (id: string) => {
    if (user) {
        try {
            await deleteInventoryItem(id);
        } catch (err) {
            console.error("Failed to delete inventory item:", err);
            loadAllData();
        }
    }
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
      } catch (err) {
        console.error("Failed to add price record to cloud:", err);
      }
    }

    setProducts(prev => {
      if (existingProduct) {
        return prev.map(p => p.id === existingProduct.id ? { ...p, history: [newRecord, ...p.history], brand: brand || p.brand, barcode: barcode || p.barcode, category, subCategory: subCategory || p.subCategory } : p);
      }
      return [...prev, { id: productId || crypto.randomUUID(), category, subCategory, itemName, variety, brand, barcode, history: [newRecord] }];
    });
  };

  const addToList = (name: string, qty: number, unit: string, productId?: string) => {
    setShoppingList(prev => [...prev, { 
      id: crypto.randomUUID(), productId: productId || 'manual', name, 
      neededQuantity: qty, unit, isCompleted: false, userId: user?.id 
    }]);
  };

  const addToInventory = async (productId: string, itemName: string, category: string, variety: string, qty: number, unit: string, locationId: string, subLocation: string, subCategory?: string) => {
    if (user) {
        try {
            const newItem: InventoryItem = {
              id: crypto.randomUUID(), productId, itemName, category, subCategory, variety, subLocation, 
              quantity: qty, unit, locationId, updatedAt: new Date().toISOString(), userId: user.id
            };
            await syncInventoryItem(newItem);
        } catch (err) {
            console.error("Failed to add inventory to cloud:", err);
            loadAllData();
        }
    }
  };

  const importBulkInventory = async (items: Omit<InventoryItem, 'id' | 'updatedAt'>[]) => {
    if (user) {
        try {
            const timestamp = new Date().toISOString();
            const newItems = items.map(i => ({
              ...i, id: crypto.randomUUID(), updatedAt: timestamp, userId: user.id
            })) as InventoryItem[];
            await bulkSyncInventory(newItems);
        } catch (err) {
            console.error("Bulk sync failed:", err);
            loadAllData();
        }
    }
  };

  return {
    user, loading, products, shoppingList, setShoppingList, inventory, 
    storageLocations, setStorageLocations, subLocations, setSubLocations,
    stores, setStores, vehicles, setVehicles, profile, activeFamily,
    updateProfile, updateInventoryQty, updateInventoryItem, removeInventoryItem, addPriceRecord, addToList, addToInventory, 
    importBulkInventory, refresh: loadAllData
  };
};
