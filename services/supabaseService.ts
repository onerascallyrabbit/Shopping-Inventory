import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { InventoryItem, SubLocation, StorageLocation } from '../types';

/**
 * Robust environment variable access for Vercel/Supabase integrations.
 */
const getEnv = (key: string): string => {
  const prefixes = ['', 'NEXT_PUBLIC_', 'SUPABASE_PUBLISHABLE_', 'REACT_APP_'];
  try {
    if (typeof process !== 'undefined' && process.env) {
      for (const prefix of prefixes) {
        const val = process.env[prefix + key];
        if (val) return val;
      }
    }
  } catch (e) {}
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('ANON_KEY');

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("Supabase Service: Initialisation failed. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.");
}

/**
 * HEALTH CHECK
 * Explicitly tests if we can read from the tables.
 */
export const testDatabaseConnection = async () => {
  if (!supabase) return { success: false, error: 'Supabase client not initialized' };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No user session' };

    // Try to read a single row from storage_locations
    const { error } = await supabase.from('storage_locations').select('id').limit(1);
    
    if (error) {
      return { success: false, error: `${error.code}: ${error.message}` };
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * AUTH FUNCTIONS
 */
export const signInWithGoogle = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

/**
 * FETCH FUNCTIONS
 */
export const fetchUserData = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [inventory, storage, subs] = await Promise.all([
    supabase.from('inventory').select('*').eq('user_id', user.id),
    supabase.from('storage_locations').select('*').eq('user_id', user.id),
    supabase.from('sub_locations').select('*').eq('user_id', user.id)
  ]);

  return {
    inventory: inventory.data || [],
    storageLocations: storage.data || [],
    subLocations: subs.data || []
  };
};

/**
 * DATA FUNCTIONS - INVENTORY
 */
export const syncInventoryItem = async (item: InventoryItem) => {
  if (!supabase || !item.userId) return;
  try {
    const { error } = await supabase
      .from('inventory')
      .upsert({
        id: item.id,
        product_id: item.productId,
        item_name: item.itemName,
        category: item.category,
        variety: item.variety,
        sub_location: item.subLocation,
        quantity: item.quantity,
        unit: item.unit,
        location_id: item.locationId,
        updated_at: item.updatedAt,
        user_id: item.userId 
      });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Inventory Sync Error:', err);
  }
};

export const bulkSyncInventory = async (items: InventoryItem[]) => {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = items.map(item => ({
      id: item.id,
      product_id: item.productId,
      item_name: item.itemName,
      category: item.category,
      variety: item.variety,
      sub_location: item.subLocation,
      quantity: item.quantity,
      unit: item.unit,
      location_id: item.locationId,
      updated_at: item.updatedAt,
      user_id: user.id
    }));
    const { error } = await supabase.from('inventory').upsert(payload);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Bulk Inventory Sync Error:', err);
  }
};

/**
 * DATA FUNCTIONS - STORAGE LOCATIONS
 */
export const syncStorageLocation = async (loc: StorageLocation) => {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('storage_locations')
      .upsert({
        id: loc.id,
        name: loc.name,
        user_id: user.id
      });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Storage Location Sync Error:', err);
  }
};

export const deleteStorageLocation = async (id: string) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('storage_locations').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Storage Location Delete Error:', err);
  }
};

/**
 * DATA FUNCTIONS - SUB LOCATIONS
 */
export const syncSubLocation = async (sub: SubLocation) => {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('sub_locations')
      .upsert({
        id: sub.id,
        location_id: sub.locationId,
        name: sub.name,
        user_id: user.id
      });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Sub-location Sync Error:', err);
  }
};

export const deleteSubLocation = async (id: string) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('sub_locations').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Sub-location Delete Error:', err);
  }
};
