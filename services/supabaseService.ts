
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { InventoryItem, SubLocation, StorageLocation, Profile, Vehicle, StoreLocation, Product, PriceRecord, Family, ShoppingItem, CustomCategory, CustomSubCategory, MealIdea } from '../types';

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
 * MEAL PLANNING SYNC
 */
export const fetchMealIdeas = async (familyId: string): Promise<MealIdea[]> => {
  if (!supabase || !familyId) return [];
  const { data, error } = await supabase.from('meal_ideas').select('*').eq('family_id', familyId).order('generated_at', { ascending: false });
  if (error) return [];
  return data.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    difficulty: m.difficulty as any,
    cookTime: m.cook_time,
    matchPercentage: m.match_percentage,
    ingredients: m.ingredients,
    instructions: m.instructions,
    generatedAt: m.generated_at,
    cookCount: m.cook_count,
    lastCooked: m.last_cooked,
    rating: m.rating
  }));
};

export const bulkSyncMealIdeas = async (familyId: string, meals: MealIdea[]) => {
  if (!supabase) return;
  // Clear old ones first to prevent cluttering or just append? 
  // Requirement says "Store the AI-generated meal ideas in the database for future browsing"
  const payload = meals.map(m => ({
    family_id: familyId,
    title: m.title,
    description: m.description,
    difficulty: m.difficulty,
    cook_time: m.cookTime,
    match_percentage: m.matchPercentage,
    ingredients: m.ingredients,
    instructions: m.instructions,
    generated_at: m.generatedAt,
    cook_count: 0
  }));
  await supabase.from('meal_ideas').insert(payload);
};

export const updateMealStats = async (mealId: string, updates: { cook_count?: number, last_cooked?: string, rating?: number }) => {
  if (!supabase) return;
  await supabase.from('meal_ideas').update(updates).eq('id', mealId);
};

export const saveMealRating = async (mealId: string, rating: number) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('meal_ratings').upsert({ meal_id: mealId, user_id: user.id, rating });
  
  // Calculate average rating
  const { data } = await supabase.from('meal_ratings').select('rating').eq('meal_id', mealId);
  if (data && data.length > 0) {
    const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
    await updateMealStats(mealId, { rating: avg });
  }
};

/**
 * TAXONOMY SYNC
 */
export const fetchCustomCategories = async (familyId: string): Promise<CustomCategory[]> => {
  if (!supabase || !familyId) return [];
  const { data, error } = await supabase.from('custom_categories').select('*').eq('family_id', familyId);
  if (error) return [];
  return data.map(c => ({ id: c.id, name: c.name, familyId: c.family_id }));
};

export const fetchCustomSubCategories = async (familyId: string): Promise<CustomSubCategory[]> => {
  if (!supabase || !familyId) return [];
  const { data, error } = await supabase.from('custom_sub_categories').select('*').eq('family_id', familyId);
  if (error) return [];
  return data.map(sc => ({ id: sc.id, categoryId: sc.category_name, name: sc.name, familyId: sc.family_id }));
};

export const syncCustomCategory = async (cat: Omit<CustomCategory, 'id'>) => {
  if (!supabase) return;
  await supabase.from('custom_categories').insert({ family_id: cat.familyId, name: cat.name });
};

export const deleteCustomCategory = async (id: string) => {
  if (!supabase) return;
  await supabase.from('custom_categories').delete().eq('id', id);
};

export const syncCustomSubCategory = async (sub: Omit<CustomSubCategory, 'id'>) => {
  if (!supabase) return;
  await supabase.from('custom_sub_categories').insert({ family_id: sub.familyId, category_name: sub.categoryId, name: sub.name });
};

export const deleteCustomSubCategory = async (id: string) => {
  if (!supabase) return;
  await supabase.from('custom_sub_categories').delete().eq('id', id);
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
 * SHOPPING LIST SYNC
 */
export const fetchShoppingList = async (): Promise<ShoppingItem[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('shopping_list').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data.map(item => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    neededQuantity: Number(item.needed_quantity),
    unit: item.unit,
    isCompleted: item.is_completed,
    manual_store: item.manual_store,
    userId: item.user_id
  }));
};

export const syncShoppingItem = async (item: ShoppingItem) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const payload = {
    id: item.id,
    product_id: item.productId,
    name: item.name,
    needed_quantity: item.neededQuantity,
    unit: item.unit,
    is_completed: item.isCompleted,
    manual_store: item.manualStore,
    user_id: item.userId || user.id
  };
  
  await supabase.from('shopping_list').upsert(payload);
};

export const deleteShoppingItem = async (id: string) => {
  if (!supabase) return;
  await supabase.from('shopping_list').delete().eq('id', id);
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
  if (error) console.error("syncPriceRecord error:", error);
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

    const [profile, products, inventoryRes, storageRes, subsRes, storesRes, vehiclesRes, listRes] = await Promise.all([
      fetchProfile().catch(() => null),
      fetchPriceData().catch(() => []),
      supabase.from('inventory').select('*'),
      supabase.from('storage_locations').select('*').order('sort_order', { ascending: true }),
      supabase.from('sub_locations').select('*'),
      supabase.from('stores').select('*'),
      supabase.from('vehicles').select('*'),
      fetchShoppingList().catch(() => [])
    ]);

    let customCats: CustomCategory[] = [];
    let customSubs: CustomSubCategory[] = [];
    let mealIdeas: MealIdea[] = [];
    if (profile?.familyId) {
      [customCats, customSubs, mealIdeas] = await Promise.all([
        fetchCustomCategories(profile.familyId),
        fetchCustomSubCategories(profile.familyId),
        fetchMealIdeas(profile.familyId)
      ]);
    }

    return {
      profile,
      products,
      inventory: inventoryRes.data || [],
      storageLocations: storageRes.data || [],
      subLocations: subsRes.data || [],
      stores: storesRes.data || [],
      vehicles: vehiclesRes.data || [],
      shoppingList: listRes || [],
      customCategories: customCats,
      customSubCategories: customSubs,
      mealIdeas
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
    
    if (error && error.code !== 'PGRST116') return null;
    
    if (!data) {
      const initial = { 
        id: user.id, 
        location_label: '', 
        zip: '', 
        gas_price: 3.50, 
        share_prices: false,
        category_order: ['Produce', 'Dairy', 'Meat', 'Seafood', 'Deli', 'Bakery', 'Frozen', 'Pantry', 'Beverages', 'Household', 'Personal Care', 'Baby', 'Pets', 'Other']
      };
      await supabase.from('profiles').insert(initial);
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
  if (error) throw error;
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
  const { data: familyData, error: familyError } = await supabase
    .from('families')
    .select('id')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();
    
  if (familyError) throw new Error('Family not found.');
  await syncProfile({ familyId: familyData.id });
  return familyData;
};

export const syncVehicle = async (v: Vehicle) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('vehicles').upsert({ id: v.id, user_id: user.id, name: v.name, mpg: v.mpg });
};

export const deleteVehicle = async (id: string) => {
  if (!supabase) return;
  await supabase.from('vehicles').delete().eq('id', id);
};

export const syncStore = async (s: StoreLocation, isPublic: boolean = false) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('stores').upsert({ 
    id: s.id, user_id: user.id, name: s.name, address: s.address, 
    lat: s.lat, lng: s.lng, phone: s.phone, hours: s.hours, 
    zip: s.zip, is_public: isPublic
  });
};

export const deleteStore = async (id: string) => {
  if (!supabase) return;
  await supabase.from('stores').delete().eq('id', id);
};

export const syncInventoryItem = async (item: InventoryItem) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const payload: any = {
    id: item.id,
    product_id: item.productId,
    item_name: item.itemName,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    location_id: item.locationId,
    updated_at: item.updatedAt,
    user_id: item.userId || user.id
  };

  if (item.subCategory) payload.sub_category = item.subCategory;
  if (item.variety) payload.variety = item.variety;
  if (item.subLocation) payload.sub_location = item.subLocation;

  const { error } = await supabase.from('inventory').upsert(payload);

  if (error) {
    console.error("syncInventoryItem FAILED:", error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string) => {
  if (!supabase) return;
  await supabase.from('inventory').delete().eq('id', id);
};

export const bulkSyncInventory = async (items: InventoryItem[]) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const payload = items.map(item => {
    const row: any = { 
      id: item.id, product_id: item.productId, item_name: item.itemName, 
      category: item.category, quantity: item.quantity, unit: item.unit, 
      location_id: item.locationId, updated_at: item.updatedAt, user_id: item.userId || user.id 
    };
    if (item.subCategory) row.sub_category = item.subCategory;
    if (item.variety) row.variety = item.variety;
    if (item.subLocation) row.sub_location = item.subLocation;
    return row;
  });

  const { error } = await supabase.from('inventory').upsert(payload);
  if (error) console.error("bulkSyncInventory error:", error);
};

export const syncStorageLocation = async (loc: StorageLocation) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('storage_locations').upsert({ id: loc.id, name: loc.name, user_id: user.id, sort_order: loc.sortOrder });
};

export const bulkSyncStorageLocations = async (locs: StorageLocation[]) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const payload = locs.map(l => ({ id: l.id, name: l.name, user_id: user.id, sort_order: l.sortOrder }));
  await supabase.from('storage_locations').upsert(payload);
};

export const deleteStorageLocation = async (id: string) => {
  if (!supabase) return;
  await supabase.from('storage_locations').delete().eq('id', id);
};

export const syncSubLocation = async (sub: SubLocation) => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('sub_locations').upsert({ id: sub.id, location_id: sub.locationId, name: sub.name, user_id: user.id });
};

export const deleteSubLocation = async (id: string) => {
  if (!supabase) return;
  await supabase.from('sub_locations').delete().eq('id', id);
};

export const testDatabaseConnection = async () => {
  if (!supabase) return { success: false, error: 'No client' };
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
