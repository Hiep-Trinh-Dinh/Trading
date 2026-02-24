-- ============================================
-- Trade System - Database Schema
-- MySQL compatible
-- ============================================

-- Drop tables in reverse dependency order (if re-running)
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS deposits;
DROP TABLE IF EXISTS trade_history;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS users;

-- ============================================
-- Table: users
-- Người dùng hệ thống (login, register, profile)
-- ============================================
CREATE TABLE users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  accountType VARCHAR(16) NOT NULL DEFAULT 'Demo' COMMENT 'Demo | Live',
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: wallets
-- Ví tiền của user theo từng symbol (USD, BTC, ETH...)
-- ============================================
CREATE TABLE wallets (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  symbol VARCHAR(32) NOT NULL COMMENT 'e.g. USD, BTC, ETH',
  amount DOUBLE NOT NULL DEFAULT 0,
  lastPrice DOUBLE NOT NULL DEFAULT 0 COMMENT 'last known price (for UI valuation)',
  UNIQUE KEY uk_wallets_user_symbol (userId, symbol),
  INDEX idx_wallets_userId (userId),
  CONSTRAINT fk_wallets_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: chat_messages
-- Tin nhắn chat real-time (general: chat tổng, support: chat hỗ trợ)
-- ============================================
CREATE TABLE chat_messages (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  room VARCHAR(32) NOT NULL COMMENT 'general | support',
  userId VARCHAR(64) NOT NULL,
  userName VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_chat_messages_room_created (room, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: deposits
-- Yêu cầu nạp tiền VNPay (VND -> USD)
-- ============================================
CREATE TABLE deposits (
  orderId VARCHAR(200) NOT NULL PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  amount BIGINT NOT NULL COMMENT 'VND',
  amountUsd DOUBLE NOT NULL DEFAULT 0 COMMENT 'USD credited',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending | success | failed',
  vnpTransactionNo VARCHAR(100) NULL,
  vnpResponseCode VARCHAR(20) NULL,
  ipnPayload JSON NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_deposits_userId (userId),
  INDEX idx_deposits_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: orders
-- Lệnh giao dịch (market, limit)
-- ============================================
CREATE TABLE orders (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  side VARCHAR(8) NOT NULL COMMENT 'buy | sell',
  type VARCHAR(8) NOT NULL COMMENT 'market | limit',
  lots DOUBLE NOT NULL,
  entryPrice DOUBLE NOT NULL,
  stopLoss DOUBLE NULL,
  takeProfit DOUBLE NULL,
  status VARCHAR(16) NOT NULL COMMENT 'filled | pending | cancelled',
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_orders_userId (userId),
  INDEX idx_orders_symbol (symbol),
  CONSTRAINT fk_orders_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: positions
-- Vị thế mở (open/closed)
-- ============================================
CREATE TABLE positions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  orderId VARCHAR(64) NOT NULL,
  userId VARCHAR(64) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  side VARCHAR(8) NOT NULL COMMENT 'buy | sell',
  lots DOUBLE NOT NULL,
  entryPrice DOUBLE NOT NULL,
  stopLoss DOUBLE NULL,
  takeProfit DOUBLE NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open' COMMENT 'open | closed',
  closePrice DOUBLE NULL,
  closeReason VARCHAR(16) NULL COMMENT 'manual | tp | sl',
  closedAt DATETIME(6) NULL,
  marginReserved DOUBLE NOT NULL DEFAULT 0 COMMENT 'USD margin locked when position was opened',
  openedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_positions_userId (userId),
  INDEX idx_positions_orderId (orderId),
  INDEX idx_positions_symbol (symbol),
  CONSTRAINT fk_positions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: trade_history
-- Lịch sử giao dịch đã đóng (PnL)
-- ============================================
CREATE TABLE trade_history (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  orderId VARCHAR(64) NOT NULL,
  positionId VARCHAR(64) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  side VARCHAR(8) NOT NULL COMMENT 'buy | sell',
  lots DOUBLE NOT NULL,
  entryPrice DOUBLE NOT NULL,
  exitPrice DOUBLE NOT NULL,
  pnl DOUBLE NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_trade_history_userId (userId),
  INDEX idx_trade_history_orderId (orderId),
  INDEX idx_trade_history_positionId (positionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
