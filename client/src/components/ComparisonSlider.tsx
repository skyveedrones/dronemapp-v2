import React, { useState } from 'react';

export const ComparisonSlider = ({ beforeLayer, afterLayer }) => {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* The "Before" (Real Drone Photo) is the base map */}
      <div className="absolute inset-0 z-0">
        {afterLayer} 
      </div>

      {/* The "After" (Construction Plan) is clipped by the slider */}
      <div 
        className="absolute inset-0 z-10 border-r-2 border-blue-500 shadow-[5px_0_15px_rgba(0,0,0,0.3)]"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        {beforeLayer}
      </div>

      {/* The Draggable Handle */}
      <div 
        className="absolute top-0 bottom-0 z-20 w-1 bg-blue-500 cursor-col-resize group"
        style={{ left: `${sliderPos}%` }}
        onMouseDown={(e) => {
          const move = (moveEvent: MouseEvent) => {
            const newPos = (moveEvent.clientX / window.innerWidth) * 100;
            setSliderPos(Math.max(0, Math.min(100, newPos)));
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', () => window.removeEventListener('mousemove', move), { once: true });
        }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7l-4 4m0 0l4 4m-4-4h16m-4-4l4 4m0 0l-4 4" />
          </svg>
        </div>
      </div>
    </div>
  );
};
