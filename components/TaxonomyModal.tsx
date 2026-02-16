
import React, { useState, useMemo } from 'react';
import { Family, CustomCategory, CustomSubCategory } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

interface TaxonomyModalProps {
  activeFamily: Family | null;
  customCategories: CustomCategory[];
  customSubCategories: CustomSubCategory[];
  onClose: () => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (id: string) => void;
  onAddSubCategory: (catName: string, name: string) => void;
  onRemoveSubCategory: (id: string) => void;
}

const TaxonomyModal: React.FC<TaxonomyModalProps> = ({
  activeFamily, customCategories, customSubCategories, onClose,
  onAddCategory, onRemoveCategory, onAddSubCategory, onRemoveSubCategory
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>('categories');
  const [newCatName, setNewCatName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [selectedParentCat, setSelectedParentCat] = useState(DEFAULT_CATEGORIES[0]);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)])).sort();
  }, [customCategories]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
        <div className="p-6 border-b bg-white shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Product Taxonomy</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Organize your family inventory</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('categories')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'categories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Categories
            </button>
            <button 
              onClick={() => setActiveTab('subcategories')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'subcategories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Sub-Categories
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'categories' ? (
            <div className="space-y-6">
              <div className="flex space-x-2">
                <input 
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold placeholder:text-slate-300" 
                  placeholder="New Category (e.g. Garden)..." 
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)} 
                />
                <button 
                  onClick={() => { if(newCatName) { onAddCategory(newCatName); setNewCatName(''); } }}
                  className="px-6 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-transform"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Custom Categories</p>
                {customCategories.length > 0 ? customCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{cat.name}</span>
                    <button onClick={() => onRemoveCategory(cat.id)} className="text-slate-200 hover:text-red-500 p-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                )) : (
                  <div className="py-8 text-center bg-slate-50 rounded-[32px] border border-dashed">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No custom categories</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3 bg-slate-50 p-5 rounded-[32px] border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Parent Category</label>
                  <select 
                    className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-bold appearance-none text-indigo-600"
                    value={selectedParentCat}
                    onChange={e => setSelectedParentCat(e.target.value)}
                  >
                    {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">New Sub-Category</label>
                  <div className="flex space-x-2">
                    <input 
                      className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-bold" 
                      placeholder="e.g. Sharp Cheddar" 
                      value={newSubCatName} 
                      onChange={e => setNewSubCatName(e.target.value)} 
                    />
                    <button 
                      onClick={() => { if(newSubCatName) { onAddSubCategory(selectedParentCat, newSubCatName); setNewSubCatName(''); } }}
                      className="bg-indigo-600 text-white px-4 rounded-xl text-[10px] font-black uppercase shadow-sm active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tags for {selectedParentCat}</p>
                {customSubCategories.filter(s => s.categoryId === selectedParentCat).length > 0 ? (
                  customSubCategories.filter(s => s.categoryId === selectedParentCat).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between bg-indigo-50/30 p-4 rounded-[24px] border border-indigo-100">
                      <span className="text-sm font-black text-indigo-700 uppercase tracking-tight">{sub.name}</span>
                      <button onClick={() => onRemoveSubCategory(sub.id)} className="text-indigo-200 hover:text-red-500 p-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center bg-slate-50 rounded-[32px] border border-dashed">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No custom tags for this category</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t shrink-0">
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-[20px] uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all"
          >
            Finished Management
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaxonomyModal;
