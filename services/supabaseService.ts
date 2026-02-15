
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { InventoryItem, SubLocation, StorageLocation, Profile, Vehicle, StoreLocation, Product, PriceRecord, Family } from '../types';

// Environment variables
// @ts-ignore
export const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || '';
// @ts-ignore
export const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '') || '';
// @ts-ignore
export const API_KEY = (import.meta.env?.VITE_API_KEY) || (typeof process !== 'undefined' ? process.env.VITE_API_KEY : '') || '';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const getEnv = (key: string): string => {
  if (key === 'SUPABASE_URL') return SUPABASE_URL;
  if (key === 'SUPABASE_ANON_KEY') return SUPABASE_ANON_KEY;
  if (key === 'API_KEY') return API_KEY;
  return '';
};

/**
 * GLOBAL DISCOVERY
 */
export const fetchGlobalStores = async (query: string): Promise<StoreLocation[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
      .eq('is_public', true)
      .limit(10);
    
    if (error) return [];
    return data.map(s => ({
      id: s.id,
      name: s.name,
      address: s.address,
      lat: Number(s.lat),
      lng: Number(s.lng),
      phone: s.phone,
      hours: s.hours,
      zip: s.zip
    }));
  } catch (e) {
    return [];
  }
};

/**
 * FAMILY MANAGEMENT
 */
export const fetchFamily = async (familyId: string): Promise<Family | null> => {
  if (!supabase || !familyId) return null;
  try {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
};

/**
 * PRICE TRACKING SYNC
 */
export const syncPriceRecord = async (productId: string, record: PriceRecord, userId: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('price_history').insert({
    id: record.id,
    product_id: productId,
    user_id: userId,
    store: record.store,
    price: record.price,
    quantity: record.quantity,
    unit: record.unit,
    date: record.date,
    image_url: record.image,
    is_public: record.isPublic || false
  });
  if (error) {
    console.error("syncPriceRecord error:", error);
    throw error;
  }
};

export const syncProduct = async (product: Partial<Product>) => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('products').upsert({
    id: product.id || crypto.randomUUID(),
    category: product.category,
    sub_category: product.subCategory,
    item_name: product.itemName,
    variety: product.variety,
    brand: product.brand,
    barcode: product.barcode
  }).select().single();
  
  if (error) {
    console.error("syncProduct error:", error);
    throw error;
  }
  return data;
};

export const fetchPriceData = async (): Promise<Product[]> => {
  if (!supabase) return [];
  try {
    const { data: productsData, error: pError } = await supabase.from('products').select('*');
    const { data: historyData, error: hError } = await supabase.from('price_history').select('*').order('date', { ascending: false });

    if (pError || hError) return [];

    return (productsData || []).map(p => {
      const history = (historyData || [])
        .filter(h => h.product_id === p.id)
        .map(h => ({
          id: h.id,
          store: h.store,
          price: Number(h.price),
          quantity: Number(h.quantity),
          unit: h.unit,
          date: h.date,
          image: h.image_url,
          isPublic: h.is_public
        }));
      
      return {
        id: p.id,
        category: p.category,
        subCategory: p.sub_category,
        itemName: p.item_name,
        variety: p.variety,
        brand: p.brand,
        barcode: p.barcode,
        history
      };
    }).filter(p => p.history.length > 0);
  } catch (e) {
    return [];
  }
};

export const fetchUserData = async () => {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const [profile, products, inventoryRes, storageRes, subsRes, storesRes, vehiclesRes] = await Promise.all([
      fetchProfile().catch(() => null),
      fetchPriceData().catch(() => []),
      supabase.from('inventory').select('*'),
      supabase.from('storage_locations').select('*'),
      supabase.from('sub_locations').select('*'),
      supabase.from('stores').select('*'),
      supabase.from('vehicles').select('*')
    ]);

    if (inventoryRes.error) console.warn("fetchUserData: inventory error", inventoryRes.error);

    return {
      profile,
      products,
      inventory: inventoryRes.data || [],
      storageLocations: storageRes.data || [],
      subLocations: subsRes.data || [],
      stores: storesRes.data || [],
      vehicles: vehiclesRes.data || []
    };
  } catch (e) {
    console.error("Error fetching user data:", e);
    return null;
  }
};

export const fetchProfile = async (): Promise<Profile | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (error && error.code !== 'PGRST116') {
      console.warn("Profile fetch error:", error);
      return null;
    }
    
    if (!data) {
      const initial = { 
        id: user.id, 
        location_label: '', 
        zip: '', 
        gas_price: 3.50, 
        share_prices: false,
        category_order: ['Produce', 'Dairy', 'Meat', 'Seafood', 'Deli', 'Bakery', 'Frozen', 'Pantry', 'Beverages', 'Household', 'Personal Care', 'Baby', 'Pets', 'Other']
      };
      const { error: insError } = await supabase.from('profiles').insert(initial);
      if (insError) console.error("Could not create initial profile:", insError);
      
      return { 
        id: user.id, 
        locationLabel: '', 
        zip: '', 
        gasPrice: 3.50, 
        sharePrices: false, 
        categoryOrder: initial.category_order 
      };
    }

    return { 
      id: data.id, 
      locationLabel: data.location_label, 
      zip: data.zip, 
      gasPrice: Number(data.gas_price), 
      categoryOrder: data.category_order || [], 
      activeVehicleId: data.active_vehicle_id, 
      sharePrices: data.share_prices, 
      familyId: data.family_id 
    };
  } catch (e) {
    console.error("fetchProfile exception:", e);
    return null;
  }
};

export const syncProfile = async (profile: Partial<Profile>) => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const payload: any = {};
  if (profile.locationLabel !== undefined) payload.location_label = profile.locationLabel;
  if (profile.zip !== undefined) payload.zip = profile.zip;
  if (profile.gasPrice !== undefined) payload.gas_price = profile.gasPrice;
  if (profile.categoryOrder !== undefined) payload.category_order = profile.categoryOrder;
  if (profile.activeVehicleId !== undefined) payload.active_vehicle_id = profile.activeVehicleId;
  if (profile.sharePrices !== undefined) payload.share_prices = profile.sharePrices;
  if (profile.familyId !== undefined) payload.family_id = profile.familyId;
  
  const { data, error } = await supabase.from('profiles').upsert({ id: user.id, ...payload }).select().single();
  if (error) {
    console.error("syncProfile error:", error);
    throw error;
  }
  return data;
};

export const createFamily = async (name: string) => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase.from('families').insert({ name, invite_code: inviteCode, created_by: user.id }).select().single();
  if (error) throw error;
  await syncProfile({ familyId: data.id });
  return data;
};

export const joinFamily = async (inviteCode: string) => {
  if (!supabase) return null;
  const normalizedCode = inviteCode.trim().toUpperCase();
  const { data: familyData, error: familyError } = await supabase
    .from('families')
    .select('id')
    .eq('invite_code', normalizedCode)
    .single();
    
  if (familyError) {
    if (familyError.code === 'PGRST116') throw new Error('Family not found. Please double-check the invite code.');
    throw new Error('Connection error. Could not verify invite code.');
  }
  
  try {
    await syncProfile({ familyId: familyData.id });
  } catch (e: any) {
    throw new Error(`Failed to link your account to the family hub: ${e.message}`);
  }
  
  return familyData;
};

export const syncVehicle = async (v: Vehicle) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('vehicles').upsert({ id: v.id, user_id: user.id, name: v.name, mpg: v.mpg });
  if (error) throw error;
};

export const deleteVehicle = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
};

export const syncStore = async (s: StoreLocation, isPublic: boolean = false) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('stores').upsert({ 
    id: s.id, 
    user_id: user.id, 
    name: s.name, 
    address: s.address, 
    lat: s.lat, 
    lng: s.lng, 
    phone: s.phone, 
    hours: s.hours, 
    zip: s.zip,
    is_public: isPublic
  });
  if (error) throw error;
};

export const deleteStore = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) throw error;
};

export const syncInventoryItem = async (item: InventoryItem) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('inventory').upsert({ 
    id: item.id, 
    product_id: item.productId, 
    item_name: item.itemName, 
    category: item.category, 
    sub_category: item.subCategory,
    variety: item.variety, 
    sub_location: item.subLocation, 
    quantity: item.quantity, 
    unit: item.unit, 
    location_id: item.locationId, 
    updated_at: item.updatedAt, 
    user_id: item.userId || user.id 
  });

  if (error) {
    console.error("syncInventoryItem error:", error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw error;
};

export const bulkSyncInventory = async (items: InventoryItem[]) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const payload = items.map(item => ({ 
    id: item.id, 
    product_id: item.productId, 
    item_name: item.itemName, 
    category: item.category, 
    sub_category: item.subCategory,
    variety: item.variety, 
    sub_location: item.subLocation, 
    quantity: item.quantity, 
    unit: item.unit, 
    location_id: item.locationId, 
    updated_at: item.updatedAt, 
    user_id: item.userId || user.id 
  }));

  const { error } = await supabase.from('inventory').upsert(payload);
  if (error) {
    console.error("bulkSyncInventory error details:", error);
    throw error;
  }
};

export const syncStorageLocation = async (loc: StorageLocation) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('storage_locations').upsert({ id: loc.id, name: loc.name, user_id: user.id });
  if (error) throw error;
};

export const deleteStorageLocation = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('storage_locations').delete().eq('id', id);
  if (error) throw error;
};

export const syncSubLocation = async (sub: SubLocation) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('sub_locations').upsert({ id: sub.id, location_id: sub.locationId, name: sub.name, user_id: user.id });
  if (error) throw error;
};

export const deleteSubLocation = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('sub_locations').delete().eq('id', id);
  if (error) throw error;
};

export const testDatabaseConnection = async () => {
  if (!supabase) return { success: false, error: 'No Supabase client' };
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

export const signInWithGoogle = async () => {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};
