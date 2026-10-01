-- Ceylon Journey Database Schema
-- Local Tourist Day-Visit Planner and Information System (Kandy, Haloluwa)
-- Compatible with MySQL 8.0+ / MariaDB in XAMPP

CREATE DATABASE IF NOT EXISTS ceylon_journey;
USE ceylon_journey;

-- Table: Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recreate attractions table to ensure all columns match
DROP TABLE IF EXISTS attractions;

-- Table: Attractions
CREATE TABLE attractions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category ENUM('Religious', 'Heritage', 'Nature', 'Cultural', 'Sightseeing') NOT NULL,
    description TEXT NOT NULL,
    historical_context TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    distance_km DECIMAL(5, 2) NOT NULL,
    opening_time VARCHAR(100) DEFAULT '08:00 AM - 05:00 PM',
    price_local DECIMAL(10, 2) DEFAULT 0.00,
    price_foreign DECIMAL(10, 2) DEFAULT 0.00,
    price_display VARCHAR(50) DEFAULT 'Free',
    estimated_duration_min INT DEFAULT 60,
    rating DECIMAL(2, 1) DEFAULT 4.5,
    image_url VARCHAR(500),
    accessibility_wheelchair TINYINT(1) DEFAULT 0,
    accessibility_parking TINYINT(1) DEFAULT 1,
    accessibility_restrooms TINYINT(1) DEFAULT 1,
    walking_difficulty ENUM('Easy', 'Moderate', 'Challenging') DEFAULT 'Easy',
    elderly_friendly TINYINT(1) DEFAULT 1,
    dress_code VARCHAR(255) DEFAULT 'Modest casual attire',
    photography_rules VARCHAR(255) DEFAULT 'Allowed in most areas',
    cultural_tips TEXT,
    emergency_contact VARCHAR(255) DEFAULT 'Tourist Police Kandy: +94 81 222 2222 / 1912',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: Saved Itineraries
CREATE TABLE IF NOT EXISTS itineraries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    itinerary_token VARCHAR(64) NOT NULL UNIQUE,
    trip_title VARCHAR(255) DEFAULT 'My Kandy Day Plan',
    total_stops INT DEFAULT 0,
    total_distance_km DECIMAL(6, 2) DEFAULT 0.00,
    total_duration_min INT DEFAULT 0,
    total_cost_local DECIMAL(10, 2) DEFAULT 0.00,
    items_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
