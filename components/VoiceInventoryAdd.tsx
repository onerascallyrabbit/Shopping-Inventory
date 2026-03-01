import { useState, useEffect, useRef } from 'react';
import { StorageLocation, SubLocation, InventoryItem } from '../types';
import { DEFAULT_CATEGORIES, UNITS, CONTAINER_TYPES } from '../constants';

interface VoiceInventoryAddProps {
  storageLocations: StorageLocation[];
  subLocations: SubLocation[];
  onItemParsed: (item: Omit<InventoryItem, 'id' | 'updatedAt' | 'userId'>) => void;
  autoStart?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceInventoryAdd({ 
  storageLocations, 
  subLocations, 
  onItemParsed,
  autoStart = false
}: VoiceInventoryAddProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  // Use Web Speech API for voice recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setInterimTranscript('');
      setParsedItems([]);
    };
    
    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += (final ? ' ' : '') + event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setTranscript(final);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Don't auto-process if we're in continuous mode, 
      // let the user stop it manually or handle it here.
      // But user said "it cuts off listening too soon", 
      // so continuous=true helps.
    };

    recognition.start();
  };

  const stopListening = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Combine final and interim if any
      const fullText = (transcript + ' ' + interimTranscript).trim();
      if (fullText) {
        await parseVoiceCommand(fullText);
      }
    }
  };

  const parseVoiceCommand = async (spokenText: string) => {
    setIsProcessing(true);
    
    try {
      // Call API route to parse with Gemini
      const response = await fetch('/api/parse-voice-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: spokenText,
          availableLocations: storageLocations.map(l => ({ id: l.id, name: l.name })),
          availableSubLocations: subLocations.map(s => ({ 
            parent: storageLocations.find(l => l.id === s.locationId)?.name,
            name: s.name 
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to parse voice command');
      const parsed = await response.json();
      setParsedItems(Array.isArray(parsed) ? parsed : [parsed]);
    } catch (error) {
      console.error('Parse error:', error);
      alert('Could not understand command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAndAdd = () => {
    if (parsedItems.length > 0) {
      parsedItems.forEach(item => onItemParsed(item));
      setParsedItems([]);
      setTranscript('');
    }
  };

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: any) => {
    setParsedItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Voice Input Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className={`w-full p-8 rounded-[32px] transition-all relative overflow-hidden group ${
          isListening 
            ? 'bg-red-500 shadow-xl shadow-red-100' 
            : isProcessing
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95'
        }`}
      >
        {isListening && (
          <div className="absolute inset-0 bg-red-400 animate-ping opacity-20" />
        )}
        
        {isListening ? (
          <div className="flex flex-col items-center space-y-3 text-white relative z-10">
            <div className="bg-white/20 p-4 rounded-full">
              <svg className="w-10 h-10 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em]">Tap to Stop</span>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col items-center space-y-3 text-white relative z-10">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">AI is Analyzing...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 text-white relative z-10">
            <div className="bg-white/10 p-4 rounded-full group-hover:bg-white/20 transition-colors">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <div className="text-center">
              <span className="block text-sm font-black uppercase tracking-[0.1em]">Tap to Speak</span>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest mt-1 block">Add multiple items at once</span>
            </div>
          </div>
        )}
      </button>

      {/* Show transcript */}
      {(transcript || interimTranscript) && (
        <div className="bg-slate-50 rounded-[24px] p-5 border border-slate-100 animate-in slide-in-from-top-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">You said:</p>
          <p className="text-sm text-slate-700 font-bold italic leading-relaxed">
            "{transcript}"
            {interimTranscript && <span className="opacity-40"> {interimTranscript}</span>}
          </p>
        </div>
      )}

      {/* Show parsed results for confirmation */}
      {parsedItems.length > 0 && (
        <div className="space-y-4 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Items ({parsedItems.length})</h4>
            <button 
              onClick={() => { setParsedItems([]); setTranscript(''); }}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {parsedItems.map((item, idx) => (
              <div key={idx} className="bg-white rounded-[28px] p-6 border-2 border-indigo-50 shadow-sm relative group space-y-4">
                <button 
                  onClick={() => removeItem(idx)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors z-10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all" 
                      value={item.itemName || ''} 
                      onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all" 
                        value={item.brand || ''} 
                        onChange={(e) => updateItem(idx, { brand: e.target.value })}
                        placeholder="None"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Variety</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all" 
                        value={item.variety || ''} 
                        onChange={(e) => updateItem(idx, { variety: e.target.value })}
                        placeholder="None"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all" 
                        value={item.quantity || 0} 
                        onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all appearance-none" 
                        value={item.unit || 'pc'} 
                        onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all appearance-none" 
                        value={item.category || 'Other'} 
                        onChange={(e) => updateItem(idx, { category: e.target.value })}
                      >
                        {DEFAULT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all appearance-none" 
                        value={item.locationId || ''} 
                        onChange={(e) => updateItem(idx, { locationId: e.target.value })}
                      >
                        <option value="">Select Location</option>
                        {storageLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Measure</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all" 
                        value={item.unitMeasure || ''} 
                        onChange={(e) => updateItem(idx, { unitMeasure: e.target.value })}
                        placeholder="e.g. 18-count"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Container</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all appearance-none" 
                        value={item.container || ''} 
                        onChange={(e) => updateItem(idx, { container: e.target.value })}
                      >
                        <option value="">None</option>
                        {CONTAINER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Shelf/Sub</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white transition-all" 
                        value={item.subLocation || ''} 
                        onChange={(e) => updateItem(idx, { subLocation: e.target.value })}
                        placeholder="None"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={confirmAndAdd}
              className="w-full py-5 bg-emerald-500 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
              <span>Confirm & Add All</span>
            </button>
          </div>
        </div>
      )}

      {/* Example commands */}
      {parsedItems.length === 0 && !isListening && !isProcessing && (
        <div className="bg-indigo-50/50 rounded-[28px] p-5 border border-indigo-100/50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.15em] mb-3 px-1">Try saying:</p>
          <div className="space-y-2">
            {[
              "Add 3 18-count eggs and 2 12-count eggs to the fridge",
              "Add 3 4oz and 8 12oz cans of tomato sauce to pantry",
              "Two pounds of chicken and one block of cheese in fridge",
              "Put 5 apples and 10 oranges in the fruit bowl",
              "Three eighteen count eggs in the fridge"
            ].map((ex, i) => (
              <div key={i} className="flex items-start space-x-2 text-[11px] font-bold text-slate-500 italic">
                <span className="text-indigo-300 mt-0.5">•</span>
                <span>"{ex}"</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
