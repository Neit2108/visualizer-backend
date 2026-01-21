-- Migration: Create Sessions Table
-- Description: Stores session information for better management and persistence

CREATE TABLE IF NOT EXISTS `sessions` (
    -- Primary identification
    `id` VARCHAR(36) NOT NULL COMMENT 'UUID của session',
    `schema_name` VARCHAR(100) NOT NULL COMMENT 'Tên schema MySQL được tạo cho session',

    -- Tracking timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo session',
    `last_accessed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm truy cập cuối',
    `expires_at` TIMESTAMP NULL COMMENT 'Thời điểm session hết hạn',

    -- Session status
    `status` ENUM('active', 'expired', 'deleted')
        NOT NULL DEFAULT 'active' COMMENT 'Trạng thái session',

    -- User/Client info
    `client_ip` VARCHAR(45) NULL COMMENT 'IP address của client (IPv4/IPv6)',
    `user_agent` VARCHAR(500) NULL COMMENT 'Browser/Client user agent',

    -- Usage statistics
    `query_count` INT NOT NULL DEFAULT 0 COMMENT 'Số lượng query đã thực hiện',
    `table_count` INT NOT NULL DEFAULT 0 COMMENT 'Số lượng bảng đã tạo',

    -- Primary key
    PRIMARY KEY (`id`),

    -- Indexes
    INDEX `idx_status` (`status`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_last_accessed_at` (`last_accessed_at`),
    INDEX `idx_expires_at` (`expires_at`)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='Quản lý các session SQL visualization';
