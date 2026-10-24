-- ═══════════════════════════════════════════════════════════
--  KIOSK – Saintgits Campus Food System — MySQL Schema
--  Run once: mysql -u root -p < sql/schema.sql
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS kiosk_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kiosk_db;

-- ─────────────────────────── USERS ───────────────────────────────
-- Stores both students/faculty (role='user') and admin (role='admin')
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(120)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,           -- bcrypt hash
  role         ENUM('user','admin') DEFAULT 'user',
  name         VARCHAR(100),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────── OUTLETS ─────────────────────────────
CREATE TABLE IF NOT EXISTS outlets (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE,              -- 'RB Kiosk', 'AK Kiosk', 'Canteen'
  emoji VARCHAR(10) DEFAULT '🏪',
  eta_min  TINYINT DEFAULT 10,                    -- default prep minutes
  eta_max  TINYINT DEFAULT 20
);

-- ─────────────────────────── MENU ITEMS ──────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120)  NOT NULL,
  outlet_id   INT           NOT NULL,
  category    ENUM('snacks','biscuits','drinks','colddrinks','icecream','morning','lunch','evening') NOT NULL,
  price       SMALLINT      NOT NULL CHECK (price > 0),
  emoji       VARCHAR(10)   DEFAULT '🍽️',
  status      ENUM('available','preparing','unavailable') DEFAULT 'available',
  stock_count SMALLINT      DEFAULT 0,
  description TEXT,
  eta         VARCHAR(30),                        -- e.g. '~15 min' when preparing
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
  INDEX idx_mi_outlet   (outlet_id),
  INDEX idx_mi_status   (status),
  INDEX idx_mi_category (category)
);

-- ─────────────────────────── ORDERS ──────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              VARCHAR(20) PRIMARY KEY,         -- 'ORD' + timestamp suffix
  user_id         INT         NOT NULL,
  student_name    VARCHAR(100) NOT NULL,
  block           VARCHAR(60)  NOT NULL,
  room            VARCHAR(60)  NOT NULL,
  subtotal        DECIMAL(8,2) NOT NULL,
  delivery_fee    DECIMAL(6,2) DEFAULT 5.00,
  cod_fee         DECIMAL(6,2) DEFAULT 0.00,
  total           DECIMAL(8,2) NOT NULL,
  payment_method  ENUM('upi','cod') DEFAULT 'upi',
  status          ENUM('preparing','delivered','cancelled') DEFAULT 'preparing',
  eta_text        VARCHAR(60),
  placed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at    TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_orders_user   (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_placed (placed_at)
);

-- ─────────────────────────── ORDER ITEMS ─────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    VARCHAR(20) NOT NULL,
  menu_item_id INT        NOT NULL,
  item_name   VARCHAR(120) NOT NULL,   -- snapshot at time of order
  item_emoji  VARCHAR(10),
  item_price  DECIMAL(7,2) NOT NULL,
  outlet_id   INT          NOT NULL,
  outlet_name VARCHAR(80)  NOT NULL,
  qty         SMALLINT     NOT NULL DEFAULT 1,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_oi_order  (order_id),
  INDEX idx_oi_outlet (outlet_id)
);

-- ─────────────────────────── TRIGGERS ────────────────────────────

-- Auto-decrement stock when an order item is inserted
DROP TRIGGER IF EXISTS trg_decrement_stock;
DELIMITER $$
CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  UPDATE menu_items
  SET stock_count = GREATEST(stock_count - NEW.qty, 0),
      status = CASE
        WHEN GREATEST(stock_count - NEW.qty, 0) = 0 AND status = 'available' THEN 'unavailable'
        ELSE status
      END
  WHERE id = NEW.menu_item_id;
END$$
DELIMITER ;

-- Auto-set delivered_at when order status flips to 'delivered'
DROP TRIGGER IF EXISTS trg_order_delivered;
DELIMITER $$
CREATE TRIGGER trg_order_delivered
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    SET NEW.delivered_at = NOW();
  END IF;
END$$
DELIMITER ;
