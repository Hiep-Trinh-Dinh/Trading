-- Add role and isLocked to users table (admin feature)
-- An toàn khi chạy nhiều lần (nếu cột đã tồn tại thì bỏ qua)
DELIMITER //
CREATE PROCEDURE add_users_columns_if_not_exists()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'user' COMMENT 'admin | user';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'isLocked'
  ) THEN
    ALTER TABLE users ADD COLUMN isLocked TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=locked';
  END IF;
END //
DELIMITER ;
CALL add_users_columns_if_not_exists();
DROP PROCEDURE IF EXISTS add_users_columns_if_not_exists;

-- Gán quyền admin cho user (thay email thành email của bạn):
-- UPDATE users SET role='admin' WHERE email='admin@example.com';
