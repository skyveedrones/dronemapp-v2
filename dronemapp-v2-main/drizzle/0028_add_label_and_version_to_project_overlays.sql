-- Migration: Add label and version_number columns to project_overlays
ALTER TABLE project_overlays 
ADD COLUMN label VARCHAR(100) DEFAULT 'Initial Plan',
ADD COLUMN version_number INT DEFAULT 1;