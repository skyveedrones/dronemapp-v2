-- Migration: Add updatedAt column to client_project_assignments
ALTER TABLE client_project_assignments ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL;