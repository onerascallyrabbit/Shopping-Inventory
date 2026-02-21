import React, { useState, useMemo } from 'react';
import { CellarItem, ConsumptionLog, Family } from '../types';

interface CellarViewProps {
  items: CellarItem[];
  logs: ConsumptionLog[];
  onUpdateQty: (id: string, delta: number) => void;
  onAddItem: (item: Omit<CellarItem, 'id' | 'updatedAt' | 'userId'>) => void;
  onUpdateItem: (id: string, updates: Partial<CellarItem>) => void;
  onRemoveItem: (id: string) => void;
  onLogConsumption: (itemId: string, quantity: number, occasion?: string, notes?: string) => void;
  onAddToList: (name: string, qty: number, unit: string, productId?: string, category?: string) => void;
  activeFamily: Family | null;
}

const CELLAR_CATEGORIES = ['Wine', 'Beer', 'Spirits'] as const;

const WINE_COLORS = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'] as const;

const WINE_VARIETALS: Record<string, string[]> = {
  'Red': ['Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah/Shiraz', 'Zinfandel', 'Malbec', 'Sangiovese', 'Tempranillo', 'Nebbiolo', 'Grenache', 'Red Blend'],
  'White': ['Chardonnay', 'Sauvignon Blanc', 'Pinot Grigio/Gris', 'Riesling', 'Moscato', 'Chenin Blanc', 'Viognier', 'Gewürztraminer', 'White Blend'],
  'Rosé': ['Provence Style', 'Grenache Rosé', 'Pinot Noir Rosé', 'Sangiovese Rosé'],
  'Sparkling': ['Champagne', 'Prosecco', 'Cava', 'Crémant', 'Sparkling Wine'],
  'Dessert': ['Sauternes', 'Ice Wine', 'Late Harvest'],
  'Fortified': ['Port', 'Sherry', 'Madeira', 'Vermouth']
};

const BEER_STYLES = ['IPA', 'Double IPA', 'Lager', 'Pilsner', 'Stout', 'Imperial Stout', 'Porter', 'Sour', 'Gose', 'Wheat', 'Pale Ale', 'Amber', 'Belgian Tripel/Quad', 'Cider', 'Other'];

const SPIRIT_CLASSES = ['Whiskey', 'Gin', 'Rum', 'Tequila/Mezcal', 'Brandy/Cognac', 'Vodka', 'Liqueur', 'Other'] as const;

const SPIRIT_STYLES: Record<string, string[]> = {
  'Whiskey': ['Bourbon', 'Rye', 'Scotch Single Malt', 'Scotch Blend', 'Irish Whiskey', 'Japanese Whiskey', 'Tennessee Whiskey', 'Canadian Whiskey'],
  'Gin': ['London Dry', 'Old Tom', 'Plymouth', 'Genever', 'Sloe Gin', 'New Western'],
  'Rum': ['White Rum', 'Gold Rum', 'Dark Rum', 'Spiced Rum', 'Rhum Agricole', 'Overproof'],
  'Tequila/Mezcal': ['Blanco', 'Reposado', 'Añejo', 'Extra Añejo', 'Mezcal Joven', 'Mezcal Reposado'],
  'Brandy/Cognac': ['Cognac VS/VSOP', 'Cognac XO', 'Armagnac', 'Pisco', 'Calvados', 'Grappa'],
  'Vodka': ['Plain', 'Flavored'],
  'Liqueur': ['Fruit', 'Herbal/Amaro', 'Cream', 'Nut/Coffee', 'Triple Sec/Orange'],
  'Other': ['Absinthe', 'Sake', 'Vermouth', 'Aperitif']
};

const CellarView: React.FC<CellarViewProps> = ({
  items, logs, onUpdateQty, onAddItem, onUpdateItem, onRemoveItem, onLogConsumption, onAddToList, activeFamily
}) => {
  const [activeTab, setActiveTab] = useState<'Wine' | 'Beer' | 'Spirits'>('Wine');
  const [isAdding, setIsAdding] = useState<'Wine' | 'Beer' | 'Spirits' | null>(null);
  const [editingItem, setEditingItem] = useState<CellarItem | null>(null);
  const [consumingItem, setConsumingItem] = useState<CellarItem | null>(null);
  const [consumptionNotes, setConsumptionNotes] = useState('');
  const [consumptionOccasion, setConsumptionOccasion] = useState('');
  
  // Form state for dynamic varietals
  const [selectedCategory, setSelectedCategory] = useState<'Wine' | 'Beer' | 'Spirits'>('Wine');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('Red');
  const [formRating, setFormRating] = useState<number>(0);

  const stats = useMemo(() => {
    const wine = items.filter(i => i.category === 'Wine').reduce((acc, i) => acc + i.quantity, 0);
    const beer = items.filter(i => i.category === 'Beer').reduce((acc, i) => acc + i.quantity, 0);
    const spirits = items.filter(i => i.category === 'Spirits').reduce((acc, i) => acc + i.quantity, 0);
    return { wine, beer, spirits };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(i => i.category === activeTab);
  }, [items, activeTab]);

  const getStockColor = (item: CellarItem) => {
    if (item.quantity <= 0) return 'text-red-500 bg-red-50 border-red-100';
    if (item.quantity <= item.lowStockThreshold) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  };

  const handleConsume = () => {
    if (!consumingItem) return;
    onUpdateQty(consumingItem.id, -1);
    onLogConsumption(consumingItem.id, 1, consumptionOccasion, consumptionNotes);
    setConsumingItem(null);
    setConsumptionNotes('');
    setConsumptionOccasion('');
  };

  const openAddModal = (cat: 'Wine' | 'Beer' | 'Spirits') => {
    setSelectedCategory(cat);
    setSelectedSubCategory(cat === 'Wine' ? 'Red' : cat === 'Spirits' ? 'Whiskey' : '');
    setFormRating(0);
    setIsAdding(cat);
  };

  const openEditModal = (item: CellarItem) => {
    setSelectedCategory(item.category);
    setSelectedSubCategory(item.subCategory || (item.category === 'Wine' ? 'Red' : item.category === 'Spirits' ? 'Whiskey' : ''));
    setFormRating(item.rating || 0);
    setEditingItem(item);
  };

  const handleSave = () => {
    const cat = isAdding || editingItem?.category;
    if (!cat) return;

    const producer = (document.getElementById('cellar-producer') as HTMLInputElement)?.value;
    const name = (document.getElementById('cellar-name') as HTMLInputElement).value;
    const subCategory = (cat === 'Wine' || cat === 'Spirits') ? (document.getElementById('cellar-subcategory') as HTMLSelectElement)?.value : undefined;
    const type = (document.getElementById('cellar-type') as HTMLInputElement)?.value || (document.getElementById('cellar-type-select') as HTMLSelectElement)?.value;
    const vintage = (document.getElementById('cellar-vintage') as HTMLInputElement)?.value;
    const abv = (document.getElementById('cellar-abv') as HTMLInputElement)?.value;
    const quantity = Number((document.getElementById('cellar-qty') as HTMLInputElement).value);
    const threshold = Number((document.getElementById('cellar-threshold') as HTMLInputElement).value);
    const isOpened = (document.getElementById('cellar-opened') as HTMLInputElement).checked;
    const notes = (document.getElementById('cellar-notes') as HTMLTextAreaElement)?.value;

    if (editingItem) {
      onUpdateItem(editingItem.id, { producer, name, category: cat, subCategory, type, vintage, abv, quantity, lowStockThreshold: threshold, isOpened, rating: formRating, notes });
    } else {
      onAddItem({ 
        producer, 
        name, 
        category: cat, 
        subCategory, 
        type, 
        vintage, 
        abv, 
        quantity, 
        lowStockThreshold: threshold, 
        isOpened, 
        rating: formRating,
        notes,
        unit: cat === 'Beer' ? 'cans' : 'bottles', 
        familyId: activeFamily?.id 
      });
    }
    setIsAdding(null);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 px-1">
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Wine</p>
          <p className="text-xl font-black text-slate-900">{stats.wine}</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Beer</p>
          <p className="text-xl font-black text-slate-900">{stats.beer}</p>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Spirits</p>
          <p className="text-xl font-black text-slate-900">{stats.spirits}</p>
        </div>
      </div>

      <div className="px-1 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Cellar</h2>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button 
            onClick={() => openAddModal('Wine')}
            className="bg-indigo-600 text-white text-[9px] font-black uppercase py-3 rounded-2xl active:scale-95 shadow-lg flex flex-col items-center justify-center space-y-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            <span>+ Wine</span>
          </button>
          <button 
            onClick={() => openAddModal('Beer')}
            className="bg-amber-500 text-white text-[9px] font-black uppercase py-3 rounded-2xl active:scale-95 shadow-lg flex flex-col items-center justify-center space-y-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            <span>+ Beer</span>
          </button>
          <button 
            onClick={() => openAddModal('Spirits')}
            className="bg-slate-800 text-white text-[9px] font-black uppercase py-3 rounded-2xl active:scale-95 shadow-lg flex flex-col items-center justify-center space-y-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            <span>+ Spirits</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {CELLAR_CATEGORIES.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveTab(cat)} 
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${activeTab === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-[32px] p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <p className="text-slate-400 text-sm font-medium">No {activeTab.toLowerCase()} in your cellar yet.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm flex items-center justify-between group active:scale-[0.98] transition-transform">
              <div className="flex-1 min-w-0 pr-4" onClick={() => openEditModal(item)}>
                <div className="flex items-center space-x-2">
                  <h4 className="font-black text-slate-800 text-sm truncate uppercase leading-tight">{item.producer && <span className="text-slate-400 mr-1">{item.producer}</span>}{item.name}</h4>
                  {item.rating && item.rating > 0 && (
                    <span className="text-[10px] flex items-center">
                      <span className="text-amber-400 mr-0.5">★</span>
                      <span className="font-black text-slate-400">{item.rating}</span>
                    </span>
                  )}
                  {item.isOpened && (
                    <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Opened</span>
                  )}
                </div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">
                  {item.subCategory && `${item.subCategory} • `}{item.type} {item.vintage && `• ${item.vintage}`} {item.abv && `• ${item.abv}%`}
                </p>
                <div className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase mt-2 ${getStockColor(item)}`}>
                  <span>{item.quantity <= item.lowStockThreshold ? 'Low Stock' : 'In Stock'}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5">
                {item.quantity > 0 && (
                  <button 
                    onClick={() => setConsumingItem(item)}
                    className="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  </button>
                )}
                <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100">
                  <button onClick={() => onUpdateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 font-black text-sm active:scale-90">-</button>
                  <div className="px-1 text-[11px] font-black text-slate-900 min-w-[1.5rem] text-center">
                    {item.quantity}
                  </div>
                  <button onClick={() => onUpdateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-indigo-600 font-black text-sm active:scale-90">+</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Low Stock Alerts */}
      {items.some(i => i.quantity <= i.lowStockThreshold) && (
        <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">Running Low</h3>
          </div>
          <div className="space-y-2">
            {items.filter(i => i.quantity <= i.lowStockThreshold).map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-amber-800">{item.producer ? `${item.producer} ` : ''}{item.name} ({item.quantity} left)</p>
                <button 
                  onClick={() => onAddToList(item.name, item.lowStockThreshold * 2, item.unit, undefined, 'Cellar Restock')}
                  className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm"
                >
                  Add to List
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingItem) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase">
                {editingItem ? `Edit ${editingItem.category}` : `Add ${isAdding}`}
              </h3>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                (isAdding || editingItem?.category) === 'Wine' ? 'bg-indigo-100 text-indigo-600' :
                (isAdding || editingItem?.category) === 'Beer' ? 'bg-amber-100 text-amber-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {(isAdding || editingItem?.category) === 'Wine' ? '🍷' : (isAdding || editingItem?.category) === 'Beer' ? '🍺' : '🥃'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {(isAdding || editingItem?.category) === 'Wine' ? 'Winery' : 
                   (isAdding || editingItem?.category) === 'Beer' ? 'Brewery' : 'Distillery'}
                </label>
                <input 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Producer Name"
                  defaultValue={editingItem?.producer || ''} 
                  id="cellar-producer"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Label Name</label>
                <input 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. Reserve Selection"
                  defaultValue={editingItem?.name || ''} 
                  id="cellar-name"
                />
              </div>

              {(isAdding || editingItem?.category) === 'Wine' && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vintage</label>
                    <input 
                      className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="e.g. 2019"
                      defaultValue={editingItem?.vintage || ''} 
                      id="cellar-vintage"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color / Class</label>
                    <select 
                      className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedSubCategory}
                      onChange={e => setSelectedSubCategory(e.target.value)}
                      id="cellar-subcategory"
                    >
                      {WINE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Varietal / Style</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        defaultValue={editingItem?.type || ''}
                        id="cellar-type-select"
                        onChange={e => {
                          const input = document.getElementById('cellar-type') as HTMLInputElement;
                          if (input) input.value = e.target.value;
                        }}
                      >
                        <option value="">Select Varietal...</option>
                        {WINE_VARIETALS[selectedSubCategory]?.map(v => <option key={v} value={v}>{v}</option>)}
                        <option value="custom">Custom...</option>
                      </select>
                      <input 
                        className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500 mt-2" 
                        placeholder="Or type custom varietal..."
                        defaultValue={editingItem?.type || ''} 
                        id="cellar-type"
                      />
                    </div>
                  </div>
                </>
              )}

              {(isAdding || editingItem?.category) === 'Beer' && (
                <>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Style</label>
                    <select 
                      className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                      defaultValue={editingItem?.type || ''}
                      id="cellar-type"
                    >
                      {BEER_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vintage</label>
                    <input 
                      className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="e.g. 2023"
                      defaultValue={editingItem?.vintage || ''} 
                      id="cellar-vintage"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ABV %</label>
                    <input 
                      className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="e.g. 6.5"
                      defaultValue={editingItem?.abv || ''} 
                      id="cellar-abv"
                    />
                  </div>
                </>
              )}

              {(isAdding || editingItem?.category) === 'Spirits' && (
                <>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class</label>
                    <select 
                      className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedSubCategory}
                      onChange={e => setSelectedSubCategory(e.target.value)}
                      id="cellar-subcategory"
                    >
                      {SPIRIT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Style</label>
                    <select 
                      className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500"
                      defaultValue={editingItem?.type || ''}
                      id="cellar-type"
                    >
                      {SPIRIT_STYLES[selectedSubCategory]?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ABV %</label>
                    <input 
                      className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="e.g. 40"
                      defaultValue={editingItem?.abv || ''} 
                      id="cellar-abv"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  defaultValue={editingItem?.quantity || 1} 
                  id="cellar-qty"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alert</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  defaultValue={editingItem?.lowStockThreshold || 2} 
                  id="cellar-threshold"
                />
              </div>
              <div className="col-span-2 flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl">
                <input 
                  type="checkbox" 
                  id="cellar-opened" 
                  className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  defaultChecked={editingItem?.isOpened || false}
                />
                <label htmlFor="cellar-opened" className="text-xs font-bold text-slate-700">Mark as Opened / Partial</label>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      onClick={() => setFormRating(star)}
                      className={`text-2xl transition-all active:scale-125 ${star <= formRating ? 'grayscale-0' : 'grayscale opacity-20'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</label>
                <textarea 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none" 
                  placeholder="Personal notes, tasting info, etc."
                  defaultValue={editingItem?.notes || ''} 
                  id="cellar-notes"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button 
                onClick={() => { setIsAdding(null); setEditingItem(null); }} 
                className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200"
              >
                {editingItem ? 'Save Changes' : 'Add to Cellar'}
              </button>
            </div>
            
            {editingItem && (
              <button 
                onClick={() => { if(confirm('Delete this item?')) { onRemoveItem(editingItem.id); setEditingItem(null); } }}
                className="w-full text-red-500 font-black text-[9px] uppercase tracking-[0.2em] pt-2"
              >
                Delete Item
              </button>
            )}
          </div>
        </div>
      )}

      {/* Consume Modal */}
      {consumingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black uppercase">Consume Item</h3>
              <p className="text-slate-400 text-sm font-medium">Enjoying a <span className="text-slate-900 font-black">{consumingItem.name}</span>?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Occasion (Optional)</label>
                <input 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. Dinner with friends"
                  value={consumptionOccasion}
                  onChange={e => setConsumptionOccasion(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Notes / Review</label>
                <textarea 
                  className="w-full bg-slate-50 rounded-2xl px-5 py-4 font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none" 
                  placeholder="How was it?"
                  value={consumptionNotes}
                  onChange={e => setConsumptionNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setConsumingItem(null)} 
                className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleConsume}
                className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200"
              >
                Log & Consume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellarView;
