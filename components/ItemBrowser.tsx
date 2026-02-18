import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { lookupMarketDetails } from '../services/geminiService';

interface ItemBrowserProps {
  products: Product[];
  categoryOrder: string[];
  onAddToList: (name: string, qty: number, unit: string, productId?: string) => void;
}

const UNITS = ['pc', 'oz', 'lb', 'ml', 'lt', 'gal', 'count', 'pack', 'kg', 'g'];

const ItemBrowser: React.FC<ItemBrowserProps> = ({ products, categoryOrder, onAddToList }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(categoryOrder[0] || 'Produce');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [marketInfo, setMarketInfo] = useState<Record<string, { text: string; sources: any[]; loading: boolean }>>({});
  
  const [listQty, setListQty] = useState('1');
  const [listUnit, setListUnit] = useState('pc');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.itemName.toLowerCase().includes(search.toLowerCase()) || 
                           (p.variety && p.variety.toLowerCase().includes(search.toLowerCase())) ||
                           (p.subCategory && p.subCategory.toLowerCase().includes(search.toLowerCase())) ||
                           p.brand?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = search.length > 0 ? true : p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, activeCategory, search]);

  // Handle market lookup and store grounding sources for compliance
  const handleMarketLookup = async (product: Product) => {
    if (marketInfo[product.id]) return;
    setMarketInfo(prev => ({ ...prev, [product.id]: { text: '', sources: [], loading: true } }));
    const result = await lookupMarketDetails(product.itemName, product.variety);
    setMarketInfo(prev => ({ 
      ...prev, 
      [product.id]: { 
        text: result?.text || 'No market data found currently.', 
        sources: result?.sources || [],
        loading: false 
      } 
    }));
  };

  const getFullName = (p: Product) => `${p.itemName}${p.variety ? ` (${p.variety})` : ''}`;

  return (
    <div className="space-y-4">
      <div className="relative">
        <input 
          type="text"
          placeholder="Search items, brands, sub-categories..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {!search && (
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {categoryOrder.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filteredProducts.map(product => {
          const isExpanded = expandedProductId === product.id;
          const best = [...product.history].sort((a, b) => (a.price / a.quantity) - (b.price / b.quantity))[0];
          const genericImg = `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=120&h=120&grocery,${product.itemName}`;
          const uniqueStoresCount = new Set(product.history.map(h => h.store)).size;
          const marketData = marketInfo[product.id];

          return (
            <div key={product.id} className={`bg-white rounded-[24px] border transition-all duration-200 ${isExpanded ? 'border-indigo-200 shadow-xl' : 'border-slate-100 shadow-sm active:scale-[0.98]'}`}>
              <div 
                onClick={() => {
                  if (!isExpanded) {
                    setListUnit(best.unit === 'lb' ? 'pc' : best.unit);
                    setListQty('1');
                  }
                  setExpandedProductId(isExpanded ? null : product.id);
                }}
                className="p-3 flex items-center space-x-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-50">
                  <img src={best.image || genericImg} alt="" className="w-full h-full object-cover opacity-90" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-black text-slate-900 truncate leading-tight uppercase tracking-tight">{getFullName(product)}</h3>
                    {uniqueStoresCount > 1 && (
                      <span className="text-[8px] font-black text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase">
                        {uniqueStoresCount} Stores
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <p className="text-[10px] font-bold text-emerald-600 truncate">
                      ${best.price.toFixed(2)}/{best.quantity}{best.unit}
                    </p>
                    {product.subCategory && (
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">• {product.subCategory}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <svg className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-4 pt-1 space-y-4 animate-in slide-in-from-top-2">
                  <div className="bg-slate-50 p-4 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between px-1">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Add to Trip List</span>
                       <span className="text-[8px] font-bold text-slate-300 uppercase">Unit recorded: {best.unit}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-black text-center focus:ring-2 focus:ring-indigo-500/10" 
                        value={listQty} 
                        onChange={(e) => setListQty(e.target.value)} 
                      />
                      <select 
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold appearance-none text-indigo-600"
                        value={listUnit}
                        onChange={(e) => setListUnit(e.target.value)}
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button 
                        onClick={() => onAddToList(getFullName(product), parseFloat(listQty) || 1, listUnit, product.id)}
                        className="bg-indigo-600 text-white font-black text-[9px] uppercase px-4 py-2.5 rounded-xl tracking-widest active:scale-95 shadow-md shadow-indigo-100"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => handleMarketLookup(product)}
                      disabled={marketData?.loading}
                      className="bg-white text-indigo-400 border border-indigo-50 font-black text-[9px] uppercase py-2.5 rounded-xl tracking-widest active:scale-95 flex items-center justify-center space-x-2"
                    >
                      {marketData?.loading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                          <span>Searching...</span>
                        </>
                      ) : (
                        <span>Compare Web Prices</span>
                      )}
                    </button>

                    {/* Display grounded search results with sources as required */}
                    {marketData && !marketData.loading && (
                      <div className="bg-indigo-50 p-4 rounded-3xl space-y-3 animate-in fade-in">
                        <div className="flex items-center space-x-2 text-indigo-600">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-[10px] font-black uppercase tracking-widest">Market Analysis</span>
                        </div>
                        <p className="text-[11px] font-medium leading-relaxed text-slate-600">{marketData.text}</p>
                        
                        {marketData.sources.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-indigo-100">
                            <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest">Web Sources</p>
                            <div className="flex flex-wrap gap-1.5">
                              {marketData.sources.map((chunk, i) => (
                                chunk.web && (
                                  <a 
                                    key={i} 
                                    href={chunk.web.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-white border border-indigo-100 px-2 py-1 rounded-lg text-[8px] font-bold text-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors truncate max-w-[120px]"
                                  >
                                    {chunk.web.title || 'Source'}
                                  </a>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Log History</p>
                    {product.history.map(record => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[10px] font-black text-slate-700 truncate">{record.store}</p>
                          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{new Date(record.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900 leading-none">${record.price.toFixed(2)}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">{record.quantity}{record.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItemBrowser;
