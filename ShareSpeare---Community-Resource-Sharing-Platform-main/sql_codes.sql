CREATE DATABASE IF NOT EXISTS ShareJoe;
USE ShareJoe;

-- 1. Users table (with trust score and suspension)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('USER','COMMUNITY_ADMIN','SUPER_ADMIN') DEFAULT 'USER',
    trust_score DECIMAL(3,2) DEFAULT 5.00,
    suspended BOOLEAN DEFAULT FALSE,
    profile_pic VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Communities table (with rules)
CREATE TABLE IF NOT EXISTS communities (
    community_id INT AUTO_INCREMENT PRIMARY KEY,
    community_name VARCHAR(100),
    community_type ENUM('college','apartment','office','public'),
    description VARCHAR(300),
    created_by INT,
    fine_rate DECIMAL(10,2) DEFAULT 10.00,
    borrow_limit INT DEFAULT 3,
    join_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- 3. Community Membership
CREATE TABLE IF NOT EXISTS community_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    community_id INT,
    role ENUM('MEMBER','ADMIN') DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (community_id) REFERENCES communities(community_id)
);

-- 4. Community Join Requests (for approval flow)
CREATE TABLE IF NOT EXISTS join_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    community_id INT,
    status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (community_id) REFERENCES communities(community_id)
);

-- 5. Resources (Items to share)
CREATE TABLE IF NOT EXISTS resources (
    resource_id INT AUTO_INCREMENT PRIMARY KEY,
    community_id INT,
    owner_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    quantity INT DEFAULT 1,
    available_quantity INT DEFAULT 1,
    item_condition VARCHAR(50),
    image_url VARCHAR(255),
    approval_status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES communities(community_id),
    FOREIGN KEY (owner_id) REFERENCES users(user_id)
);

-- 6. Bookings (Borrowing lifecycle)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT,
    borrower_id INT,
    community_id INT,
    start_date DATE,
    end_date DATE,
    status ENUM('REQUESTED','APPROVED','ACTIVE','RETURNED','REJECTED','OVERDUE') DEFAULT 'REQUESTED',
    extend_requested BOOLEAN DEFAULT FALSE,
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(resource_id),
    FOREIGN KEY (borrower_id) REFERENCES users(user_id),
    FOREIGN KEY (community_id) REFERENCES communities(community_id)
);

-- 7. Fines (Penalty records)
CREATE TABLE IF NOT EXISTS fines (
    fine_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    user_id INT,
    amount DECIMAL(10,2),
    reason VARCHAR(255),
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message TEXT,
    type VARCHAR(20),
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 9. Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
    waitlist_id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT,
    user_id INT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(resource_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 10. Ratings
CREATE TABLE IF NOT EXISTS ratings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    rater_id INT,
    ratee_id INT,
    score INT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (rater_id) REFERENCES users(user_id),
    FOREIGN KEY (ratee_id) REFERENCES users(user_id)
);

-- 11. Feed Posts
CREATE TABLE IF NOT EXISTS community_posts (
    post_id INT AUTO_INCREMENT PRIMARY KEY,
    community_id INT,
    user_id INT,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (community_id) REFERENCES communities(community_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ── PART 2: INITIAL SEED DATA ──────────────────────────────────────────────

INSERT INTO users (name, email, password, role) VALUES ('Mariya Joevita', 'mariya@gmail.com', '$2a$10$7zB...', 'USER');
INSERT INTO users (name, email, password, role) VALUES ('Joe', 'joe@gmail.com', '$2a$10$7zB...', 'COMMUNITY_ADMIN');
INSERT INTO users (name, email, password, role) VALUES ('Admin System', 'admin@sharespeare.com', 'admin123', 'SUPER_ADMIN');

-- ── PART 3: FUNCTIONAL QUERIES (AS USED IN NODE.JS) ─────────────────────────

-- [AUTH]
-- Login: SELECT user_id, name, email, role, trust_score, suspended FROM users WHERE email=?
-- Signup: INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)

-- [COMMUNITY]
-- Create: INSERT INTO communities (community_name, community_type, description, created_by, fine_rate, borrow_limit, join_approval) VALUES (?,?,?,?,?,?,?)
-- View All: SELECT community_id AS id, community_name, community_type, description, fine_rate, borrow_limit, join_approval, (SELECT COUNT(*) FROM community_members WHERE community_id=c.community_id) AS members FROM communities c

-- [RESOURCES]
-- List: SELECT r.*, u.name AS owner_name FROM resources r JOIN users u ON r.owner_id = u.user_id WHERE r.community_id=? AND r.approval_status='APPROVED'
-- Add: INSERT INTO resources (community_id, owner_id, name, description, category, quantity, available_quantity, item_condition, image_url, approval_status) VALUES (?,?,?,?,?,?,?,?,?,?)

-- [BOOKINGS]
-- Request: INSERT INTO bookings (resource_id, borrower_id, community_id, start_date, end_date) VALUES (?,?,?,?,?)
-- Approve: UPDATE bookings SET status='ACTIVE' WHERE booking_id=?; UPDATE resources SET available_quantity = available_quantity - 1 WHERE resource_id=?
-- Return: UPDATE bookings SET status='RETURNED' WHERE booking_id=?; UPDATE resources SET available_quantity = available_quantity + 1 WHERE resource_id=?

-- [DASHBOARD STATS]
-- Top Resources: SELECT r.name, COUNT(b.booking_id) AS borrow_count FROM bookings b JOIN resources r ON b.resource_id = r.resource_id WHERE b.community_id=? GROUP BY b.resource_id ORDER BY borrow_count DESC LIMIT 5
-- Community Stats: SELECT COUNT(*) FROM community_members WHERE community_id=?; SELECT COALESCE(SUM(amount),0) FROM fines WHERE paid=TRUE

-- [BG SCANNER]
-- Find Overdue: SELECT b.*, c.fine_rate FROM bookings b JOIN communities c ON b.community_id = c.community_id WHERE b.status = 'ACTIVE' AND b.end_date < CURDATE()
-- Issue Fine: INSERT INTO fines (booking_id, user_id, amount, reason) VALUES (?,?,?,?)

select * from users;

DESCRIBE communities;
ALTER TABLE communities

ADD COLUMN fine_rate DECIMAL(10,2) DEFAULT 10.00,
ADD COLUMN borrow_limit INT DEFAULT 3,
ADD COLUMN join_approval BOOLEAN DEFAULT FALSE;