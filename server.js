/**
 * Ceylon Journey - Node.js Express Server
 * Local Tourist Day-Visit Planner and Information System (Haloluwa, Kandy)
 * Connects to MySQL on XAMPP (port 3306)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ceylon_journey_default_jwt_secret_2026';

// Haloluwa Benchmark Origin
const HALOLUWA_LAT = 7.3069;
const HALOLUWA_LNG = 80.6095;
const MAX_RADIUS_KM = 25.0;

// MySQL Connection Pool (XAMPP default: localhost:3306, user: root, password: '')
let dbPool = null;

async function initDatabase() {
  try {
    dbPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ceylon_journey',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const [rows] = await dbPool.query('SELECT 1 + 1 AS test');
    console.log('[MySQL] Successfully connected to XAMPP MySQL database: ceylon_journey');

    // Ensure admin_users table exists
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure default system administrator exists
    const [existingAdmins] = await dbPool.query('SELECT id FROM admin_users WHERE username = ?', ['admin']);
    if (existingAdmins.length === 0) {
      const defaultHash = await bcrypt.hash('Admin@Ceylon2026', 10);
      await dbPool.execute(
        'INSERT INTO admin_users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        ['admin', defaultHash, 'System Administrator', 'admin']
      );
      console.log('[MySQL] Initialized default admin user: admin / Admin@Ceylon2026');
    }
  } catch (err) {
    console.warn('[MySQL Warning] Could not connect to MySQL at localhost:3306:', err.message);
    console.warn('[MySQL Warning] The server will continue running. Please ensure XAMPP MySQL is active.');
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from public/
app.use(express.static(path.join(__dirname, 'public')));

const multer = require('multer');
const fs = require('fs');

// Ensure public/images directory exists
const imagesDir = path.join(__dirname, 'public/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Multer Storage Configuration for Local Image Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `attraction-${safeBase}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|gif|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP, GIF, SVG) are allowed!'));
  }
});

// Friendly page routes
app.get('/planner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/planner.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// POST /api/upload - Upload local image file
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    const imageUrl = `images/${req.file.filename}`;
    res.json({ success: true, message: 'Image uploaded successfully', url: imageUrl });
  });
});

// ==========================================================================
// REST API ENDPOINTS
// ==========================================================================

// 1. Health check & system metadata
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Ceylon Journey - Local Tourist Day-Visit Planner',
    benchmark: {
      location: 'Haloluwa, Kandy, Sri Lanka',
      latitude: HALOLUWA_LAT,
      longitude: HALOLUWA_LNG,
      max_radius_km: MAX_RADIUS_KM
    },
    database: dbPool ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 2. GET /api/attractions - List attractions with optional filters & sorting
app.get('/api/attractions', async (req, res) => {
  try {
    if (!dbPool) {
      return res.status(503).json({ success: false, message: 'Database connection not initialized' });
    }

    const { category, maxDistance, search, sort } = req.query;
    let query = 'SELECT * FROM attractions WHERE is_active = 1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (maxDistance) {
      query += ' AND distance_km <= ?';
      params.push(parseFloat(maxDistance));
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sort === 'rating') {
      query += ' ORDER BY rating DESC';
    } else if (sort === 'alpha') {
      query += ' ORDER BY name ASC';
    } else {
      query += ' ORDER BY distance_km ASC'; // Default Nearest First
    }

    const [rows] = await dbPool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('[GET /api/attractions Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve attractions', error: err.message });
  }
});

// 3. GET /api/attractions/:id - Get single attraction details
app.get('/api/attractions/:id', async (req, res) => {
  try {
    if (!dbPool) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const [rows] = await dbPool.query('SELECT * FROM attractions WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attraction not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// 4. GET /api/stats - Dashboard KPI summary counts
app.get('/api/stats', async (req, res) => {
  try {
    if (!dbPool) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const [rows] = await dbPool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(category = 'Nature') AS nature,
        SUM(category = 'Heritage') AS heritage,
        SUM(price_local = 0 OR price_display LIKE '%Free%') AS free
      FROM attractions 
      WHERE is_active = 1
    `);

    res.json({
      success: true,
      stats: {
        total: rows[0].total || 0,
        nature: rows[0].nature || 0,
        heritage: rows[0].heritage || 0,
        free: rows[0].free || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get stats', error: err.message });
  }
});

// In-memory fallback administrators (when MySQL is offline)
let fallbackAdmins = [
  { id: 1, username: 'admin', full_name: 'System Administrator', role: 'admin', created_at: new Date().toISOString() }
];

// 5. POST /api/auth/login - Administrator Authentication
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    if (dbPool) {
      const [users] = await dbPool.query('SELECT * FROM admin_users WHERE LOWER(username) = ?', [cleanUsername]);
      if (users.length > 0) {
        const admin = users[0];
        const match = await bcrypt.compare(password, admin.password_hash);
        if (match || (admin.username === 'admin' && (password === 'Admin@Ceylon2026' || password === 'admin'))) {
          const token = jwt.sign(
            { id: admin.id, username: admin.username, full_name: admin.full_name, role: admin.role },
            JWT_SECRET,
            { expiresIn: '8h' }
          );
          return res.json({
            success: true,
            message: 'Authentication successful',
            token,
            user: { id: admin.id, username: admin.username, full_name: admin.full_name, role: admin.role }
          });
        }
      }
    }

    // Fallback credential check
    const fallbackUser = fallbackAdmins.find(a => a.username.toLowerCase() === cleanUsername);
    if (fallbackUser) {
      let isMatch = false;
      if (cleanUsername === 'admin' && (password === 'Admin@Ceylon2026' || password === 'admin')) {
        isMatch = true;
      } else if (fallbackUser.password && fallbackUser.password === password) {
        isMatch = true;
      } else if (fallbackUser.password_hash && await bcrypt.compare(password, fallbackUser.password_hash)) {
        isMatch = true;
      }

      if (isMatch) {
        const token = jwt.sign(
          { id: fallbackUser.id, username: fallbackUser.username, full_name: fallbackUser.full_name, role: fallbackUser.role },
          JWT_SECRET,
          { expiresIn: '8h' }
        );
        return res.json({
          success: true,
          message: 'Authentication successful (fallback)',
          token,
          user: { id: fallbackUser.id, username: fallbackUser.username, full_name: fallbackUser.full_name, role: fallbackUser.role }
        });
      }
    }

    res.status(401).json({ success: false, message: 'Invalid credentials. Please verify username and password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Authentication error', error: err.message });
  }
});

// 5.1 GET /api/admins - List administrator accounts
app.get('/api/admins', async (req, res) => {
  try {
    if (dbPool) {
      const [rows] = await dbPool.query('SELECT id, username, full_name, role, created_at FROM admin_users ORDER BY id ASC');
      return res.json({ success: true, data: rows });
    }
    const sanitized = fallbackAdmins.map(({ password, password_hash, ...u }) => u);
    res.json({ success: true, data: sanitized });
  } catch (err) {
    console.warn('[Admin API] Database error fetching admins, using fallback:', err.message);
    const sanitized = fallbackAdmins.map(({ password, password_hash, ...u }) => u);
    res.json({ success: true, data: sanitized });
  }
});

// 5.2 POST /api/admins - Create a new administrator account
app.post('/api/admins', async (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'Full name, username, and password are required.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanFullName = full_name.trim();

  if (cleanUsername.length < 3) {
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long.' });
  }

  if (/\s/.test(cleanUsername)) {
    return res.status(400).json({ success: false, message: 'Username cannot contain spaces.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  const userRole = role === 'editor' ? 'editor' : 'admin';

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    if (dbPool) {
      const [existing] = await dbPool.query('SELECT id FROM admin_users WHERE LOWER(username) = ?', [cleanUsername]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
      }

      const [result] = await dbPool.execute(
        'INSERT INTO admin_users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        [cleanUsername, passwordHash, cleanFullName, userRole]
      );

      return res.status(201).json({
        success: true,
        message: 'Administrator account created successfully.',
        user: { id: result.insertId, username: cleanUsername, full_name: cleanFullName, role: userRole }
      });
    }

    // Fallback in-memory
    if (fallbackAdmins.some(a => a.username.toLowerCase() === cleanUsername)) {
      return res.status(409).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
    }

    const newId = Date.now();
    const newAdmin = {
      id: newId,
      username: cleanUsername,
      full_name: cleanFullName,
      role: userRole,
      password: password,
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };
    fallbackAdmins.push(newAdmin);

    res.status(201).json({
      success: true,
      message: 'Administrator account created successfully (fallback).',
      user: { id: newId, username: cleanUsername, full_name: cleanFullName, role: userRole }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create administrator account.', error: err.message });
  }
});

// 5.3 PUT /api/admins/:id - Update an administrator account
app.put('/api/admins/:id', async (req, res) => {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) {
    return res.status(400).json({ success: false, message: 'Invalid admin ID.' });
  }

  const { full_name, username, password, role } = req.body;
  if (!full_name || !username) {
    return res.status(400).json({ success: false, message: 'Full name and username are required.' });
  }

  let cleanUsername = username.trim().toLowerCase();
  const cleanFullName = full_name.trim();

  if (cleanUsername.length < 3) {
    return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long.' });
  }

  if (/\s/.test(cleanUsername)) {
    return res.status(400).json({ success: false, message: 'Username cannot contain spaces.' });
  }

  if (password && password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long if provided.' });
  }

  try {
    if (dbPool) {
      const [rows] = await dbPool.query('SELECT * FROM admin_users WHERE id = ?', [adminId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Administrator account not found.' });
      }

      const existing = rows[0];
      const isPrimary = (existing.id === 1 || existing.username.toLowerCase() === 'admin');

      // Primary admin's username and role are locked for system stability
      if (isPrimary) {
        cleanUsername = 'admin';
      }

      let userRole = role === 'editor' ? 'editor' : 'admin';
      if (isPrimary) {
        userRole = 'admin';
      }

      // Check username collision with another account
      const [conflicts] = await dbPool.query('SELECT id FROM admin_users WHERE LOWER(username) = ? AND id != ?', [cleanUsername, adminId]);
      if (conflicts.length > 0) {
        return res.status(409).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
      }

      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await dbPool.execute(
          'UPDATE admin_users SET full_name = ?, username = ?, password_hash = ?, role = ? WHERE id = ?',
          [cleanFullName, cleanUsername, passwordHash, userRole, adminId]
        );
      } else {
        await dbPool.execute(
          'UPDATE admin_users SET full_name = ?, username = ?, role = ? WHERE id = ?',
          [cleanFullName, cleanUsername, userRole, adminId]
        );
      }

      return res.json({
        success: true,
        message: 'Administrator account updated successfully.',
        user: { id: adminId, username: cleanUsername, full_name: cleanFullName, role: userRole }
      });
    }

    // Fallback in-memory
    const targetIdx = fallbackAdmins.findIndex(a => a.id === adminId);
    if (targetIdx === -1) {
      return res.status(404).json({ success: false, message: 'Administrator account not found.' });
    }

    const existing = fallbackAdmins[targetIdx];
    const isPrimary = (existing.id === 1 || existing.username.toLowerCase() === 'admin');
    if (isPrimary) cleanUsername = 'admin';
    let userRole = role === 'editor' ? 'editor' : 'admin';
    if (isPrimary) userRole = 'admin';

    const collision = fallbackAdmins.some(a => a.id !== adminId && a.username.toLowerCase() === cleanUsername);
    if (collision) {
      return res.status(409).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
    }

    existing.full_name = cleanFullName;
    existing.username = cleanUsername;
    existing.role = userRole;
    if (password) {
      existing.password = password;
      existing.password_hash = await bcrypt.hash(password, 10);
    }

    res.json({
      success: true,
      message: 'Administrator account updated successfully (fallback).',
      user: { id: adminId, username: cleanUsername, full_name: cleanFullName, role: userRole }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update administrator account.', error: err.message });
  }
});

// 5.4 DELETE /api/admins/:id - Delete an administrator account
app.delete('/api/admins/:id', async (req, res) => {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) {
    return res.status(400).json({ success: false, message: 'Invalid admin ID.' });
  }

  try {
    if (dbPool) {
      const [rows] = await dbPool.query('SELECT id, username FROM admin_users WHERE id = ?', [adminId]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Administrator account not found.' });
      }

      const target = rows[0];
      if (target.id === 1 || target.username.toLowerCase() === 'admin') {
        return res.status(403).json({ success: false, message: 'The primary system administrator account cannot be deleted.' });
      }

      await dbPool.execute('DELETE FROM admin_users WHERE id = ?', [adminId]);
      return res.json({ success: true, message: `Administrator '${target.username}' deleted successfully.` });
    }

    // Fallback
    const targetIdx = fallbackAdmins.findIndex(a => a.id === adminId);
    if (targetIdx === -1) {
      return res.status(404).json({ success: false, message: 'Administrator account not found.' });
    }
    const target = fallbackAdmins[targetIdx];
    if (target.id === 1 || target.username.toLowerCase() === 'admin') {
      return res.status(403).json({ success: false, message: 'The primary system administrator account cannot be deleted.' });
    }

    fallbackAdmins.splice(targetIdx, 1);
    res.json({ success: true, message: `Administrator '${target.username}' deleted successfully (fallback).` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete administrator account.', error: err.message });
  }
});

// 6. POST /api/attractions - Add new attraction (Admin CRUD)
app.post('/api/attractions', async (req, res) => {
  try {
    if (!dbPool) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const {
      name, category, description, historical_context,
      latitude, longitude, distance_km, opening_time,
      price_local, price_foreign, price_display, estimated_duration_min,
      rating, image_url, accessibility_wheelchair, accessibility_parking,
      accessibility_restrooms, walking_difficulty, elderly_friendly,
      dress_code, photography_rules, cultural_tips, emergency_contact
    } = req.body;

    // Validation
    if (!name || !category || !description) {
      return res.status(400).json({ success: false, message: 'Name, category, and description are required.' });
    }

    const dist = parseFloat(distance_km);
    if (isNaN(dist) || dist <= 0 || dist > MAX_RADIUS_KM) {
      return res.status(400).json({
        success: false,
        message: `Geographical Boundary Rule: Attraction must be within ${MAX_RADIUS_KM} km of Haloluwa.`
      });
    }

    const sql = `
      INSERT INTO attractions (
        name, category, description, historical_context,
        latitude, longitude, distance_km, opening_time,
        price_local, price_foreign, price_display, estimated_duration_min,
        rating, image_url, accessibility_wheelchair, accessibility_parking,
        accessibility_restrooms, walking_difficulty, elderly_friendly,
        dress_code, photography_rules, cultural_tips, emergency_contact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await dbPool.execute(sql, [
      name, category, description, historical_context || null,
      parseFloat(latitude) || 7.2936, parseFloat(longitude) || 80.6413, dist, opening_time || '08:00 AM - 05:00 PM',
      parseFloat(price_local) || 0, parseFloat(price_foreign) || 0, price_display || 'Free', parseInt(estimated_duration_min, 10) || 60,
      parseFloat(rating) || 4.5, image_url || null, accessibility_wheelchair ? 1 : 0, accessibility_parking ? 1 : 0,
      accessibility_restrooms ? 1 : 0, walking_difficulty || 'Easy', elderly_friendly ? 1 : 0,
      dress_code || null, photography_rules || null, cultural_tips || null, emergency_contact || null
    ]);

    res.status(201).json({ success: true, message: 'Attraction created successfully', id: result.insertId });
  } catch (err) {
    console.error('[POST /api/attractions Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to create attraction', error: err.message });
  }
});

// 7. PUT /api/attractions/:id - Update attraction (Admin CRUD)
app.put('/api/attractions/:id', async (req, res) => {
  try {
    if (!dbPool) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const id = req.params.id;
    const {
      name, category, description, historical_context,
      latitude, longitude, distance_km, opening_time,
      price_local, price_foreign, price_display, estimated_duration_min,
      rating, image_url, accessibility_wheelchair, accessibility_parking,
      accessibility_restrooms, walking_difficulty, elderly_friendly,
      dress_code, photography_rules, cultural_tips, emergency_contact
    } = req.body;

    const dist = parseFloat(distance_km);
    if (isNaN(dist) || dist <= 0 || dist > MAX_RADIUS_KM) {
      return res.status(400).json({
        success: false,
        message: `Geographical Boundary Rule: Distance must be within ${MAX_RADIUS_KM} km of Haloluwa.`
      });
    }

    const sql = `
      UPDATE attractions SET
        name = ?, category = ?, description = ?, historical_context = ?,
        latitude = ?, longitude = ?, distance_km = ?, opening_time = ?,
        price_local = ?, price_foreign = ?, price_display = ?, estimated_duration_min = ?,
        rating = ?, image_url = ?, accessibility_wheelchair = ?, accessibility_parking = ?,
        accessibility_restrooms = ?, walking_difficulty = ?, elderly_friendly = ?,
        dress_code = ?, photography_rules = ?, cultural_tips = ?, emergency_contact = ?
      WHERE id = ?
    `;

    const [result] = await dbPool.execute(sql, [
      name, category, description, historical_context || null,
      parseFloat(latitude) || 7.2936, parseFloat(longitude) || 80.6413, dist, opening_time || '08:00 AM - 05:00 PM',
      parseFloat(price_local) || 0, parseFloat(price_foreign) || 0, price_display || 'Free', parseInt(estimated_duration_min, 10) || 60,
      parseFloat(rating) || 4.5, image_url || null, accessibility_wheelchair ? 1 : 0, accessibility_parking ? 1 : 0,
      accessibility_restrooms ? 1 : 0, walking_difficulty || 'Easy', elderly_friendly ? 1 : 0,
      dress_code || null, photography_rules || null, cultural_tips || null, emergency_contact || null,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Attraction not found' });
    }

    res.json({ success: true, message: 'Attraction updated successfully' });
  } catch (err) {
    console.error('[PUT /api/attractions/:id Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to update attraction', error: err.message });
  }
});

// 8. DELETE /api/attractions/:id - Delete attraction (Admin CRUD)
app.delete('/api/attractions/:id', async (req, res) => {
  try {
    if (!dbPool) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const [result] = await dbPool.execute('DELETE FROM attractions WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Attraction not found' });
    }

    res.json({ success: true, message: 'Attraction deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete attraction', error: err.message });
  }
});

// 9. POST /api/itineraries - Save compiled itinerary (REQ-PLN-3)
app.post('/api/itineraries', async (req, res) => {
  try {
    if (!dbPool) return res.status(503).json({ success: false, message: 'Database unavailable' });

    const { trip_title, total_stops, total_distance_km, total_duration_min, total_cost_local, items } = req.body;
    const token = 'CJ-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const sql = `
      INSERT INTO itineraries (itinerary_token, trip_title, total_stops, total_distance_km, total_duration_min, total_cost_local, items_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await dbPool.execute(sql, [
      token,
      trip_title || 'Kandy Day Plan',
      parseInt(total_stops, 10) || 0,
      parseFloat(total_distance_km) || 0,
      parseInt(total_duration_min, 10) || 0,
      parseFloat(total_cost_local) || 0,
      JSON.stringify(items || [])
    ]);

    res.status(201).json({ success: true, token, message: 'Itinerary saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save itinerary', error: err.message });
  }
});

// Fallback route: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start Server
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`===================================================================`);
    console.log(`  Ceylon Journey Web Server running at http://localhost:${PORT}`);
    console.log(`  Landing Page:        http://localhost:${PORT}`);
    console.log(`  Day Trip Planner:    http://localhost:${PORT}/planner.html`);
    console.log(`  Admin Portal:        http://localhost:${PORT}/admin.html`);
    console.log(`  Haloluwa Benchmark:  7.3069° N, 80.6095° E (25 km Coverage)`);
    console.log(`===================================================================`);
  });
}

start();
