import React from 'react';

export const MunicipalGateway = () => {
  return (
    <section className="relative py-24 overflow-hidden bg-slate-950">
      
      {/* 1. THE GEOSPATIAL POP (SVG Background) */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-40-39c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm20-27c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zM0 80c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zm80 0c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zm0-80c0 5.523 4.477 10 10 10s10-4.477 10-10-4.477-10-10-10-10 4.477-10 10z' fill='%2310b981' fill-rule='evenodd'/%3E%3C%2Fsvg%3E")`
        }}
      />

      {/* 2. THE RADIAL GLOW */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative w-full px-6 text-center">
        
        <div className="max-w-4xl mx-auto">
        {/* PILL BADGE */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
          <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Government Solutions</span>
        </div>

        {/* HEADLINE */}
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          Built for <span className="text-[#10b981]">Municipal</span> Progress
        </h2>

        {/* SUBHEADLINE */}
        <p className="text-lg md:text-xl text-slate-400 leading-relaxed mb-12 max-w-2xl mx-auto">
          Bridge the gap between City Hall and the Job Site. MAPIT provides the Digital Twin infrastructure needed to manage assets, mitigate risk, and protect taxpayer investment.
        </p>
        </div>

        {/* THE CTA BUTTON */}
        <div className="flex justify-center">
          <a 
            href="/municipal" 
            className="group relative px-8 py-4 bg-[#10b981] text-slate-950 font-bold rounded-full transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
          >
            Explore Municipal Solutions
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>

      </div>
    </section>
  );
};
