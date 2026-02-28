import { useState } from 'react';
import { StorageLocation, SubLocation, InventoryItem } from '../types';

interface VoiceInventoryAddProps {
  storageLocations: StorageLocation[];
  subLocations: SubLocation[];
  onItemParsed: (item: Omit<InventoryItem, 'id' | 'updatedAt' | 'userId'>) => void;
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
  onItemParsed 
}: VoiceInventoryAddProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItem, setParsedItem] = useState<any>(null);

  // Use Web Speech API for voice recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setParsedItem(null);
    };
    
    recognition.onresult = async (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      setIsListening(false);
      await parseVoiceCommand(spokenText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
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
      setParsedItem(parsed);
    } catch (error) {
      console.error('Parse error:', error);
      alert('Could not understand command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAndAdd = () => {
    if (parsedItem) {
      onItemParsed(parsedItem);
      setParsedItem(null);
      setTranscript('');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Voice Input Button */}
      <button
        onClick={startListening}
        disabled={isListening || isProcessing}
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
            <span className="text-xs font-black uppercase tracking-[0.2em]">Listening...</span>
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
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest mt-1 block">Add to stock naturally</span>
            </div>
          </div>
        )}
      </button>

      {/* Show transcript */}
      {transcript && (
        <div className="bg-slate-50 rounded-[24px] p-5 border border-slate-100 animate-in slide-in-from-top-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">You said:</p>
          <p className="text-sm text-slate-700 font-bold italic leading-relaxed">"{transcript}"</p>
        </div>
      )}

      {/* Show parsed result for confirmation */}
      {parsedItem && (
        <div className="bg-white rounded-[32px] p-6 border-2 border-indigo-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-black text-slate-900 truncate uppercase tracking-tight">{parsedItem.itemName}</h4>
              {parsedItem.brand && (
                <p className="text-[11px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">{parsedItem.brand}</p>
              )}
            </div>
            <div className="text-right ml-4">
              <p className="text-2xl font-black text-indigo-600 leading-none">
                {parsedItem.quantity}
              </p>
              <p className="text-[10px] font-black text-indigo-300 uppercase mt-1">{parsedItem.unit}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
              <p className="text-[11px] text-slate-900 font-black uppercase">{parsedItem.category}</p>
            </div>
            {parsedItem.variety && (
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Variety</p>
                <p className="text-[11px] text-slate-900 font-black uppercase">{parsedItem.variety}</p>
              </div>
            )}
            <div className="bg-slate-50 p-3 rounded-2xl">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
              <p className="text-[11px] text-slate-900 font-black uppercase">
                {storageLocations.find(l => l.id === parsedItem.locationId)?.name || 'Unknown'}
              </p>
            </div>
            {parsedItem.subLocation && (
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Shelf</p>
                <p className="text-[11px] text-slate-900 font-black uppercase">{parsedItem.subLocation}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setParsedItem(null);
                setTranscript('');
              }}
              className="py-4 bg-slate-100 text-slate-500 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmAndAdd}
              className="py-4 bg-emerald-500 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors"
            >
              Add to Stock
            </button>
          </div>
        </div>
      )}

      {/* Example commands */}
      {!parsedItem && !isListening && !isProcessing && (
        <div className="bg-indigo-50/50 rounded-[28px] p-5 border border-indigo-100/50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.15em] mb-3 px-1">Try saying:</p>
          <div className="space-y-2">
            {[
              "Add 3 bottles of Heinz ketchup to pantry 2",
              "Two pounds of ground beef in freezer one",
              "Sharp cheddar one block in cheese drawer",
              "Five Roma tomatoes in the fridge"
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
