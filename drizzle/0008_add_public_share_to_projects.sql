-- Migration: Add publicShareToken and isPubliclyShared to projects
ALTER TABLE projects 
ADD COLUMN publicShareToken VARCHAR(64) UNIQUE DEFAULT NULL,
ADD COLUMN isPubliclyShared BOOLEAN DEFAULT FALSE;