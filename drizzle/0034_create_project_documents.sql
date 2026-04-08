CREATE TABLE IF NOT EXISTS `project_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` int NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `fileKey` varchar(512) NOT NULL,
  `fileType` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT 'uploaded',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);