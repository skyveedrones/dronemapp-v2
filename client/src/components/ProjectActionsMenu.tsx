"use client";

import React, { useRef } from 'react';
import { uploadProjectOverlay } from "@/app/actions/overlay";

export const ProjectActionsMenu = ({ projectId }: { projectId: number }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadProjectOverlay(formData, projectId);
      if (result.success) {
        // Refresh to show the new overlay on the map
        window.location.reload(); 
      }
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  return (
    <div className="relative">
      {/* This is the green button seen on the CIP222 page */}
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="bg-[#00df9a] text-black px-6 py-2 rounded-lg font-bold hover:bg-[#00bf82] transition shadow-lg"
      >
        UPLOAD PROJECT MAP OVERLAY
      </button>

      {/* Hidden input to handle the Windows file picker */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.png,.jpg" 
        onChange={onFileSelected} 
      />
    </div>
  );
};