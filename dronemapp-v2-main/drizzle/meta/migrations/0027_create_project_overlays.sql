-- Migration: Create project_overlays table
CREATE TABLE project_overlays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  userId INT NOT NULL,
  fileUrl VARCHAR(255) NOT NULL,
  opacity INT DEFAULT 50,
  coordinates JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id)
);