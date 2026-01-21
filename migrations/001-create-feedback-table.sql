-- ==========================================
-- Migration: Create Feedback Table
-- Description: Creates the feedback table to store user feedback
-- ==========================================

CREATE TABLE IF NOT EXISTS `feedback` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique feedback ID',
  `session_id` VARCHAR(36) NULL COMMENT 'Optional session ID if feedback is session-specific',
  `email` VARCHAR(255) NOT NULL COMMENT 'User email address',
  `rating` INT NOT NULL COMMENT 'User rating (1-5 stars)',
  `category` ENUM('bug', 'feature', 'improvement', 'other') NOT NULL COMMENT 'Feedback category',
  `message` LONGTEXT NOT NULL COMMENT 'Detailed feedback message',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When feedback was submitted',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When feedback was last updated',
  
  -- Indexes for better query performance
  INDEX `idx_email` (`email`) COMMENT 'Index on email for faster lookups',
  INDEX `idx_session_id` (`session_id`) COMMENT 'Index on session_id for session-based queries',
  INDEX `idx_category` (`category`) COMMENT 'Index on category for filtering',
  INDEX `idx_rating` (`rating`) COMMENT 'Index on rating for statistics',
  INDEX `idx_created_at` (`created_at`) COMMENT 'Index on created_at for sorting and filtering by date'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User feedback for SQL visualization tool';

