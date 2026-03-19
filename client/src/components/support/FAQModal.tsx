import React, { useState, useMemo } from 'react';
import { faqItems } from './FAQData';

export const FAQModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Search Logic: Filters questions and answers in real-time
  const filteredFaqs = useMemo(() => {
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <>
      {/* Help Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition border border-slate-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        HELP & FAQ
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">Knowledge Base</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">SkyVee MAPIT Support</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-2xl transition">&times;</button>
            </div>

            {/* Search Bar */}
            <div className="p-4 bg-slate-950/50 border-b border-slate-800">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input 
                  type="text"
                  placeholder="Search for 'KML', 'Sharing', 'Coordinates'..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* FAQ List */}
            <div className="p-6 overflow-y-auto space-y-4">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((item, i) => (
                  <div key={i} className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors group">
                    <h4 className="text-blue-400 font-bold text-sm mb-2 group-hover:text-blue-300 transition-colors">{item.question}</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{item.answer}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-slate-500 text-sm italic">No matching topics found for "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em]">© 2026 SkyVee Aerial Drones Services LLC</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};