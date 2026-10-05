/**
 * Ceylon Journey - Admin Portal Logic
 * Controls Admin Table, CRUD modals, KPI metrics, and Authentication
 * Matches Screenshot 4
 */

const ADMIN_STATE = {
  attractions: [],
  filteredAttractions: [],
  filters: {
    search: '',
    category: 'all'
  },
  editingId: null,
  deleteTargetId: null,
  adminUsers: [],
  deleteAdminId: null,
  editingAdminId: null,
  currentUser: (() => {
    try {
      return JSON.parse(localStorage.getItem('ceylon_admin_user') || 'null');
    } catch (e) {
      return null;
    }
  })(),
  token: localStorage.getItem('ceylon_admin_token') || null
};

const CATEGORY_META = {
  Religious: { icon: '🔥', bg: '#fdf2e9', color: '#b25316' },
  Heritage: { icon: '🏛️', bg: '#f5efe6', color: '#785a36' },
  Nature: { icon: '🌿', bg: '#eaf4ed', color: '#2c6f37' },
  Cultural: { icon: '🎭', bg: '#e8f3f8', color: '#216f91' },
  Sightseeing: { icon: '🔭', bg: '#edeef2', color: '#414b5c' }
};

document.addEventListener('DOMContentLoaded', () => {
  initAdminPortal();
});

async function initAdminPortal() {
  if (!checkAuth()) return;
  setupAdminFilters();
  await loadAdminAttractions();
}

// ==========================================================================
// AUTHENTICATION
// ==========================================================================
function checkAuth() {
  if (!ADMIN_STATE.token) {
    // Redirect to landing page and open blurred login popup
    window.location.replace('index.html?login=admin');
    return false;
  }
  updateAuthHeader(true);
  return true;
}

function updateAuthHeader(isLoggedIn) {
  const badge = document.getElementById('admin-user-status');
  const signoutBtn = document.getElementById('admin-signout-btn');
  if (badge) {
    if (isLoggedIn) {
      const u = ADMIN_STATE.currentUser;
      const displayName = u ? (u.username || 'admin') : 'admin';
      badge.innerHTML = `
        <span class="status-indicator-dot"></span>
        <span class="status-text">Logged in as ${escapeHtml(displayName)}</span>
      `;
    } else {
      badge.innerHTML = `
        <span class="status-indicator-dot" style="background: #999;"></span>
        <span class="status-text">Guest</span>
      `;
    }
  }
  if (signoutBtn) {
    signoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error-msg');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      ADMIN_STATE.token = data.token || 'demo_token';
      ADMIN_STATE.currentUser = data.user || { id: 1, username, full_name: username, role: 'admin' };
      localStorage.setItem('ceylon_admin_token', ADMIN_STATE.token);
      localStorage.setItem('ceylon_admin_user', JSON.stringify(ADMIN_STATE.currentUser));
      document.getElementById('admin-login-modal').classList.remove('active');
      updateAuthHeader(true);
      await loadAdminAttractions();
    } else {
      // Allow demo bypass for admin / Admin@Ceylon2026
      if (username === 'admin' && (password === 'Admin@Ceylon2026' || password === 'admin')) {
        ADMIN_STATE.token = 'local_admin_token';
        ADMIN_STATE.currentUser = { id: 1, username: 'admin', full_name: 'System Administrator', role: 'admin' };
        localStorage.setItem('ceylon_admin_token', ADMIN_STATE.token);
        localStorage.setItem('ceylon_admin_user', JSON.stringify(ADMIN_STATE.currentUser));
        document.getElementById('admin-login-modal').classList.remove('active');
        updateAuthHeader(true);
        await loadAdminAttractions();
      } else {
        errorDiv.textContent = data.message || 'Invalid username or password';
        errorDiv.style.display = 'block';
      }
    }
  } catch (err) {
    // Fallback local check
    if (username === 'admin' && (password === 'Admin@Ceylon2026' || password === 'admin')) {
      ADMIN_STATE.token = 'local_admin_token';
      ADMIN_STATE.currentUser = { id: 1, username: 'admin', full_name: 'System Administrator', role: 'admin' };
      localStorage.setItem('ceylon_admin_token', ADMIN_STATE.token);
      localStorage.setItem('ceylon_admin_user', JSON.stringify(ADMIN_STATE.currentUser));
      document.getElementById('admin-login-modal').classList.remove('active');
      updateAuthHeader(true);
      await loadAdminAttractions();
    } else {
      errorDiv.textContent = 'Invalid credentials. Use admin / Admin@Ceylon2026';
      errorDiv.style.display = 'block';
    }
  }
}

function handleAdminLogout() {
  localStorage.removeItem('ceylon_admin_token');
  localStorage.removeItem('ceylon_admin_user');
  ADMIN_STATE.token = null;
  ADMIN_STATE.currentUser = null;
  updateAuthHeader(false);
  window.location.replace('index.html');
}

// ==========================================================================
// DATA RETRIEVAL & KPI CARDS
// ==========================================================================
async function loadAdminAttractions() {
  try {
    const res = await fetch('/api/attractions');
    if (res.ok) {
      const data = await res.json();
      ADMIN_STATE.attractions = data.data || data;
    } else {
      throw new Error('API unavailable');
    }
  } catch (err) {
    console.warn('Loading fallback data in admin portal:', err);
    ADMIN_STATE.attractions = getAdminFallbackAttractions();
  }

  ADMIN_STATE.filteredAttractions = [...ADMIN_STATE.attractions];
  updateAdminKPICards();
  renderAdminTable();
}

function updateAdminKPICards() {
  const total = ADMIN_STATE.attractions.length;
  const natureCount = ADMIN_STATE.attractions.filter(a => a.category === 'Nature').length;
  const heritageCount = ADMIN_STATE.attractions.filter(a => a.category === 'Heritage').length;
  const freeCount = ADMIN_STATE.attractions.filter(a => 
    parseFloat(a.price_local || 0) === 0 || 
    (a.price_display && a.price_display.toLowerCase().includes('free'))
  ).length;

  document.getElementById('kpi-total-attractions').textContent = total;
  document.getElementById('kpi-nature-count').textContent = natureCount;
  document.getElementById('kpi-heritage-count').textContent = heritageCount;
  document.getElementById('kpi-free-count').textContent = freeCount;
}

// ==========================================================================
// ADMIN FILTERING & TABLE (Screenshot 4)
// ==========================================================================
function setupAdminFilters() {
  const search = document.getElementById('admin-search-input');
  if (search) {
    search.addEventListener('input', (e) => {
      ADMIN_STATE.filters.search = e.target.value.trim().toLowerCase();
      applyAdminFilters();
    });
  }

  const catSelect = document.getElementById('admin-category-select');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      ADMIN_STATE.filters.category = e.target.value;
      applyAdminFilters();
    });
  }
}

function applyAdminFilters() {
  let result = [...ADMIN_STATE.attractions];

  if (ADMIN_STATE.filters.search) {
    const q = ADMIN_STATE.filters.search;
    result = result.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.description.toLowerCase().includes(q)
    );
  }

  if (ADMIN_STATE.filters.category !== 'all') {
    result = result.filter(a => a.category === ADMIN_STATE.filters.category);
  }

  ADMIN_STATE.filteredAttractions = result;
  renderAdminTable();
}

function renderAdminTable() {
  const tbody = document.getElementById('admin-table-tbody');
  if (!tbody) return;

  if (ADMIN_STATE.filteredAttractions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: #7d7265;">
          No attractions found matching the criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = ADMIN_STATE.filteredAttractions.map((att, index) => {
    const cat = CATEGORY_META[att.category] || { icon: '📍', bg: '#eee', color: '#333' };
    const ticketStr = att.price_display || (parseFloat(att.price_local) === 0 ? 'Free' : `LKR ${parseFloat(att.price_local).toLocaleString()}`);
    const ratingStr = `★ ${parseFloat(att.rating || 4.5).toFixed(1)}`;
    const safeName = escapeHtml(att.name);
    const safeDesc = escapeHtml(att.description);
    const safeCategory = escapeHtml(att.category);
    const safeTicket = escapeHtml(ticketStr);

    return `
      <tr>
        <td class="td-index">${index + 1}</td>
        <td class="td-name-col">
          <div class="td-name-title">${safeName}</div>
          <div class="td-name-snippet">${safeDesc}</div>
        </td>
        <td>
          <span class="td-category-badge" style="background-color: ${cat.bg}; color: ${cat.color};">
            ${cat.icon} ${safeCategory}
          </span>
        </td>
        <td class="td-distance">${att.distance_km}km</td>
        <td class="td-ticket">${safeTicket}</td>
        <td class="td-rating">${ratingStr}</td>
        <td>
          <div class="td-actions-group">
            <button type="button" class="btn-table-edit" onclick="openEditModal(${att.id})">Edit</button>
            <button type="button" class="btn-table-delete" onclick="openDeleteConfirm(${att.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// CRUD MODALS: ADD / EDIT / DELETE
// ==========================================================================
function openAddModal() {
  ADMIN_STATE.editingId = null;
  document.getElementById('attraction-modal-title').textContent = 'Add New Attraction';
  handleClearForm();

  const modalBody = document.querySelector('#attraction-crud-modal .modal-body');
  if (modalBody) modalBody.scrollTop = 0;
  document.getElementById('attraction-crud-modal').classList.add('active');
}

function openEditModal(attractionId) {
  const att = ADMIN_STATE.attractions.find(a => a.id === attractionId);
  if (!att) return;

  ADMIN_STATE.editingId = attractionId;
  document.getElementById('attraction-modal-title').textContent = `Edit Attraction: ${att.name}`;
  document.getElementById('form-error-alert').style.display = 'none';

  // Populate form fields
  document.getElementById('field-name').value = att.name || '';
  const catField = document.getElementById('field-category');
  if (catField) {
    catField.value = att.category || 'Religious';
    if (catField._syncCustomSelect) catField._syncCustomSelect();
  }
  document.getElementById('field-distance').value = att.distance_km || '';
  document.getElementById('field-price-display').value = att.price_display || '';
  document.getElementById('field-price-local').value = att.price_local || 0;
  document.getElementById('field-price-foreign').value = att.price_foreign || 0;
  document.getElementById('field-rating').value = att.rating || 4.5;
  document.getElementById('field-latitude').value = att.latitude || '';
  document.getElementById('field-longitude').value = att.longitude || '';
  document.getElementById('field-duration').value = att.estimated_duration_min || 60;
  document.getElementById('field-opening').value = att.opening_time || '';
  document.getElementById('field-image').value = att.image_url || '';
  document.getElementById('field-desc').value = att.description || '';
  document.getElementById('field-history').value = att.historical_context || '';
  document.getElementById('field-dress').value = att.dress_code || '';
  document.getElementById('field-photo').value = att.photography_rules || '';
  document.getElementById('field-tips').value = att.cultural_tips || '';
  document.getElementById('field-emergency').value = att.emergency_contact || '';

  // Checkboxes
  document.getElementById('field-wheelchair').checked = Boolean(att.accessibility_wheelchair);
  document.getElementById('field-parking').checked = Boolean(att.accessibility_parking);
  document.getElementById('field-restrooms').checked = Boolean(att.accessibility_restrooms);
  document.getElementById('field-elderly').checked = Boolean(att.elderly_friendly);
  const diffField = document.getElementById('field-difficulty');
  if (diffField) {
    diffField.value = att.walking_difficulty || 'Easy';
    if (diffField._syncCustomSelect) diffField._syncCustomSelect();
  }

  // Setup image preview if existing
  const fileInput = document.getElementById('field-image-file');
  if (fileInput) fileInput.value = '';
  if (att.image_url) {
    showImagePreview(att.image_url);
  } else {
    clearAttractionImagePreview();
  }

  const modalBody = document.querySelector('#attraction-crud-modal .modal-body');
  if (modalBody) modalBody.scrollTop = 0;
  document.getElementById('attraction-crud-modal').classList.add('active');
}

function closeCrudModal() {
  document.getElementById('attraction-crud-modal').classList.remove('active');
  clearAttractionImage();
}

function handleClearForm() {
  const form = document.getElementById('attraction-form');
  if (form) form.reset();

  const inputIds = [
    'field-name', 'field-distance', 'field-price-display',
    'field-price-local', 'field-price-foreign', 'field-rating',
    'field-duration', 'field-latitude', 'field-longitude',
    'field-opening', 'field-image', 'field-desc',
    'field-history', 'field-dress', 'field-photo',
    'field-tips', 'field-emergency'
  ];

  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const catEl = document.getElementById('field-category');
  if (catEl) {
    catEl.value = 'Religious';
    if (catEl._syncCustomSelect) catEl._syncCustomSelect();
  }
  const diffEl = document.getElementById('field-difficulty');
  if (diffEl) {
    diffEl.value = 'Easy';
    if (diffEl._syncCustomSelect) diffEl._syncCustomSelect();
  }

  ['field-wheelchair', 'field-parking', 'field-restrooms', 'field-elderly'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });

  clearAttractionImage();

  const errorAlert = document.getElementById('form-error-alert');
  if (errorAlert) {
    errorAlert.textContent = '';
    errorAlert.style.display = 'none';
  }
}

// ==========================================================================
// LOCAL IMAGE UPLOAD & PREVIEW LOGIC
// ==========================================================================
async function handleLocalImageUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('upload-status-text');
  const clearBtn = document.getElementById('btn-clear-image');

  if (statusEl) {
    statusEl.textContent = `Uploading ${file.name}...`;
    statusEl.style.color = 'var(--text-muted)';
  }

  // Instant local preview via FileReader
  const reader = new FileReader();
  reader.onload = function(evt) {
    showImagePreview(evt.target.result);
  };
  reader.readAsDataURL(file);

  // Upload file via /api/upload
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success) {
      document.getElementById('field-image').value = data.url;
      if (statusEl) {
        statusEl.textContent = `✓ ${file.name}`;
        statusEl.style.color = '#2c6f37';
      }
      if (clearBtn) clearBtn.style.display = 'inline';
    } else {
      throw new Error(data.message || 'Server upload failed');
    }
  } catch (err) {
    console.warn('[Admin Upload] Server upload unavailable, using base64 preview:', err);
    if (reader.result) {
      document.getElementById('field-image').value = reader.result;
    }
    if (statusEl) {
      statusEl.textContent = `✓ ${file.name} (Local)`;
      statusEl.style.color = '#2c6f37';
    }
    if (clearBtn) clearBtn.style.display = 'inline';
  }
}

function handleImageUrlInput(url) {
  const val = (url || '').trim();
  if (val) {
    showImagePreview(val);
    const clearBtn = document.getElementById('btn-clear-image');
    if (clearBtn) clearBtn.style.display = 'inline';
    const statusEl = document.getElementById('upload-status-text');
    if (statusEl) statusEl.textContent = '';
  } else {
    clearAttractionImagePreview();
  }
}

function showImagePreview(src) {
  const previewBox = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview-el');
  const clearBtn = document.getElementById('btn-clear-image');
  if (previewImg) {
    previewImg.src = src;
    previewImg.onerror = function() {
      if (previewBox) previewBox.style.display = 'none';
    };
    previewImg.onload = function() {
      if (previewBox) previewBox.style.display = 'block';
    };
  }
  if (previewBox && src) previewBox.style.display = 'block';
  if (clearBtn) clearBtn.style.display = 'inline';
}

function clearAttractionImage() {
  document.getElementById('field-image').value = '';
  const fileInput = document.getElementById('field-image-file');
  if (fileInput) fileInput.value = '';
  clearAttractionImagePreview();
}

function clearAttractionImagePreview() {
  const previewBox = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview-el');
  const statusEl = document.getElementById('upload-status-text');
  const clearBtn = document.getElementById('btn-clear-image');

  if (previewBox) previewBox.style.display = 'none';
  if (previewImg) previewImg.src = '';
  if (statusEl) statusEl.textContent = '';
  if (clearBtn) clearBtn.style.display = 'none';
}

async function handleAttractionFormSubmit(e) {
  e.preventDefault();
  const errorAlert = document.getElementById('form-error-alert');
  errorAlert.style.display = 'none';

  const name = document.getElementById('field-name').value.trim();
  const category = document.getElementById('field-category').value;
  const distance = parseFloat(document.getElementById('field-distance').value);
  const priceDisplay = document.getElementById('field-price-display').value.trim();
  const priceLocal = parseFloat(document.getElementById('field-price-local').value) || 0;
  const priceForeign = parseFloat(document.getElementById('field-price-foreign').value) || 0;
  const rating = parseFloat(document.getElementById('field-rating').value) || 4.5;
  const latitude = parseFloat(document.getElementById('field-latitude').value);
  const longitude = parseFloat(document.getElementById('field-longitude').value);
  const duration = parseInt(document.getElementById('field-duration').value, 10) || 60;
  const opening = document.getElementById('field-opening').value.trim();
  const imageUrl = document.getElementById('field-image').value.trim();
  const description = document.getElementById('field-desc').value.trim();
  const history = document.getElementById('field-history').value.trim();
  const dressCode = document.getElementById('field-dress').value.trim();
  const photoRules = document.getElementById('field-photo').value.trim();
  const culturalTips = document.getElementById('field-tips').value.trim();
  const emergency = document.getElementById('field-emergency').value.trim();

  const wheelchair = document.getElementById('field-wheelchair').checked ? 1 : 0;
  const parking = document.getElementById('field-parking').checked ? 1 : 0;
  const restrooms = document.getElementById('field-restrooms').checked ? 1 : 0;
  const elderly = document.getElementById('field-elderly').checked ? 1 : 0;
  const difficulty = document.getElementById('field-difficulty').value;

  // Validation according to SRS Business Rules (5.5)
  if (!name || !description) {
    showFormError('Name and Description are required fields.');
    return;
  }

  if (isNaN(distance) || distance <= 0 || distance > 25.0) {
    showFormError('Geographical Boundary Rule: Distance must be greater than 0 and within 25.0 km of Haloluwa.');
    return;
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    showFormError('Valid GPS Latitude and Longitude coordinates are required for map rendering.');
    return;
  }

  const payload = {
    name, category, distance_km: distance, price_display: priceDisplay || (priceLocal === 0 ? 'Free' : `LKR ${priceLocal}`),
    price_local: priceLocal, price_foreign: priceForeign, rating, latitude, longitude,
    estimated_duration_min: duration, opening_time: opening, image_url: imageUrl,
    description, historical_context: history, dress_code: dressCode, photography_rules: photoRules,
    cultural_tips: culturalTips, emergency_contact: emergency,
    accessibility_wheelchair: wheelchair, accessibility_parking: parking,
    accessibility_restrooms: restrooms, elderly_friendly: elderly, walking_difficulty: difficulty
  };

  try {
    const isEdit = ADMIN_STATE.editingId !== null;
    const url = isEdit ? `/api/attractions/${ADMIN_STATE.editingId}` : '/api/attractions';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeCrudModal();
      await loadAdminAttractions();
    } else {
      const errData = await res.json();
      showFormError(errData.message || 'Server error while saving attraction');
    }
  } catch (err) {
    // Local fallback persistence
    if (ADMIN_STATE.editingId) {
      const idx = ADMIN_STATE.attractions.findIndex(a => a.id === ADMIN_STATE.editingId);
      if (idx > -1) {
        ADMIN_STATE.attractions[idx] = { ...ADMIN_STATE.attractions[idx], ...payload };
      }
    } else {
      const newId = Date.now();
      ADMIN_STATE.attractions.push({ id: newId, ...payload });
    }
    closeCrudModal();
    applyAdminFilters();
    updateAdminKPICards();
  }
}

function showFormError(msg) {
  const alert = document.getElementById('form-error-alert');
  alert.textContent = msg;
  alert.style.display = 'block';
}

function openDeleteConfirm(attractionId) {
  const att = ADMIN_STATE.attractions.find(a => a.id === attractionId);
  if (!att) return;

  ADMIN_STATE.deleteTargetId = attractionId;
  document.getElementById('delete-attraction-name').textContent = att.name;
  document.getElementById('admin-delete-modal').classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('admin-delete-modal').classList.remove('active');
  ADMIN_STATE.deleteTargetId = null;
}

async function confirmDeleteAttraction() {
  if (!ADMIN_STATE.deleteTargetId) return;

  try {
    const res = await fetch(`/api/attractions/${ADMIN_STATE.deleteTargetId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });

    if (res.ok) {
      closeDeleteModal();
      await loadAdminAttractions();
    } else {
      throw new Error('Delete failed');
    }
  } catch (err) {
    // Local fallback
    ADMIN_STATE.attractions = ADMIN_STATE.attractions.filter(a => a.id !== ADMIN_STATE.deleteTargetId);
    closeDeleteModal();
    applyAdminFilters();
    updateAdminKPICards();
  }
}

function getAdminFallbackAttractions() {
  return [
    { id: 1, name: 'Temple of the Tooth Relic', category: 'Religious', distance_km: 5.2, price_display: 'LKR 1,500', price_local: 1500, rating: 4.9, latitude: 7.2936, longitude: 80.6413, description: 'Sri Lanka\'s most sacred Buddhist shrine, housing the venerated tooth relic of Lord Buddha inside the historic royal palace complex.', image_url: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?w=800' },
    { id: 2, name: 'Peradeniya Royal Botanical Gardens', category: 'Nature', distance_km: 6.8, price_display: 'LKR 1,800', price_local: 1800, rating: 4.7, latitude: 7.2715, longitude: 80.5954, description: 'One of the finest botanical gardens in Asia, renowned for its extensive orchid collection, avenue of royal palms, and giant Javan fig tree.', image_url: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800' },
    { id: 3, name: 'Udawattakele Forest Reserve', category: 'Nature', distance_km: 3.5, price_display: 'LKR 600', price_local: 600, rating: 4.5, latitude: 7.2995, longitude: 80.6445, description: 'A 104-hectare natural forest sanctuary within Kandy city, home to monkeys, birds, and rare indigenous plant species overlooking the lake.', image_url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800' },
    { id: 4, name: 'Kandy Lake (Kiri Muhuda)', category: 'Sightseeing', distance_km: 4.9, price_display: 'Free', price_local: 0, rating: 4.6, latitude: 7.2905, longitude: 80.6380, description: 'An artificial lake built in 1807 by King Sri Vikrama Rajasinha, featuring the romantic Walakulu Bamma (clouds wall) and peaceful promenade.', image_url: 'https://images.unsplash.com/photo-1546708973-b339540b5162?w=800' },
    { id: 5, name: 'Bahiravokanda Vihara Buddha Statue', category: 'Religious', distance_km: 4.1, price_display: 'Free (donation)', price_local: 0, rating: 4.4, latitude: 7.2974, longitude: 80.6277, description: 'A 27-metre white Buddha statue overlooking Kandy, built in 1969, with panoramic views of the city, lake, and distant mountain horizon.', image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800' },
    { id: 6, name: 'Lankatilaka Vihara', category: 'Heritage', distance_km: 12.3, price_display: 'LKR 500', price_local: 500, rating: 4.6, latitude: 7.2307, longitude: 80.5645, description: 'A 14th-century rock temple rising from a granite rock, showcasing Gampola era architecture, intricate brickwork, and monumental seated Buddha statues.', image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800' },
    { id: 7, name: 'Kandy Market (Pettah)', category: 'Cultural', distance_km: 3.8, price_display: 'Free', price_local: 0, rating: 4.2, latitude: 7.2918, longitude: 80.6352, description: 'A bustling traditional market in the heart of Kandy, brimming with spices, handcrafts, fresh tropical fruits, batik textiles, and local life.', image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800' },
    { id: 8, name: 'Kandy Cultural Centre', category: 'Cultural', distance_km: 4.6, price_display: 'LKR 1,200', price_local: 1200, rating: 4.3, latitude: 7.2912, longitude: 80.6401, description: 'Renowned cultural theatre showcasing authentic Kandyan dances, ceremonial Ves drumming, acrobatics, and dramatic fire-walking performances.', image_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800' },
    { id: 9, name: 'Gadaladeniya Viharaya', category: 'Heritage', distance_km: 13.5, price_display: 'LKR 400', price_local: 400, rating: 4.7, latitude: 7.2572, longitude: 80.5567, description: 'Ancient South Indian Dravidian stone temple built on an elevated cliff by King Buwanekabahu IV in 1344 AD, celebrated for carved granite pillars.', image_url: 'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=800' },
    { id: 10, name: 'Embekke Devalaya', category: 'Heritage', distance_km: 15.2, price_display: 'LKR 500', price_local: 500, rating: 4.8, latitude: 7.2185, longitude: 80.5694, description: 'Famed 14th-century temple featuring 514 intricate wood carvings of dancers, swans, wrestlers, and mythical beasts across 32 timber pillars.', image_url: 'https://images.unsplash.com/photo-1566837945700-30057527ade0?w=800' },
    { id: 11, name: 'Hanthana Mountain Range Trail', category: 'Nature', distance_km: 6.7, price_display: 'LKR 500', price_local: 500, rating: 4.6, latitude: 7.2550, longitude: 80.6280, description: 'Popular trekking range with seven mountain peaks rising above 1,200m, offering panoramic tea valley vistas, montane grasslands, and diverse avian life.', image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800' },
    { id: 12, name: 'Dunumadalawa Forest Sanctuary', category: 'Nature', distance_km: 5.8, price_display: 'LKR 400', price_local: 400, rating: 4.5, latitude: 7.2810, longitude: 80.6470, description: 'A pristine catchment forest and reservoir area nestled between Kandy and Hantana, rich in endemic bird species, quiet trails, and rare butterflies.', image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800' }
  ];
}

// ==========================================================================
// ADMINISTRATOR MANAGEMENT CONTROLLER
// ==========================================================================
async function openAdminUsersModal() {
  const modal = document.getElementById('admin-users-modal');
  if (!modal) return;

  resetAdminForm();
  modal.classList.add('active');
  await loadAdminUsers();
}

function closeAdminUsersModal() {
  const modal = document.getElementById('admin-users-modal');
  if (modal) modal.classList.remove('active');
  resetAdminForm();
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; padding: 2rem; color: #7d7265;">
        Loading administrators...
      </td>
    </tr>
  `;

  try {
    const res = await fetch('/api/admins');
    if (res.ok) {
      const data = await res.json();
      ADMIN_STATE.adminUsers = data.data || [];
    } else {
      throw new Error('Failed to load administrators');
    }
  } catch (err) {
    console.warn('Could not fetch /api/admins from server, using local fallback:', err);
    if (!ADMIN_STATE.adminUsers || ADMIN_STATE.adminUsers.length === 0) {
      ADMIN_STATE.adminUsers = [
        { id: 1, username: 'admin', full_name: 'System Administrator', role: 'admin', created_at: new Date().toISOString() }
      ];
    }
  }

  renderAdminUsersTable();
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-tbody');
  const countBadge = document.getElementById('admins-count-badge');
  if (!tbody) return;

  const users = ADMIN_STATE.adminUsers || [];
  if (countBadge) {
    countBadge.textContent = users.length === 1 ? '1 Admin' : `${users.length} Admins`;
  }

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2rem; color: #7d7265;">
          No administrators found.
        </td>
      </tr>
    `;
    return;
  }

  const currentUsername = ADMIN_STATE.currentUser ? (ADMIN_STATE.currentUser.username || '').toLowerCase() : 'admin';

  tbody.innerHTML = users.map(user => {
    const isPrimary = (user.id === 1 || (user.username && user.username.toLowerCase() === 'admin'));
    const isCurrent = (user.username && user.username.toLowerCase() === currentUsername);

    const safeFullName = escapeHtml(user.full_name || user.username || 'Admin');
    const safeUsername = escapeHtml(user.username || '');
    const safeRole = escapeHtml(user.role === 'editor' ? 'Editor' : 'Administrator');
    const roleBadgeBg = user.role === 'editor' ? '#e8f3f8' : '#eaf4ed';
    const roleBadgeColor = user.role === 'editor' ? '#216f91' : '#2c6f37';

    let actionHtml = '';
    if (isPrimary) {
      actionHtml = `
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.45rem;">
          <button type="button" class="btn-edit-admin-row" onclick="startEditAdmin(${user.id})" title="Edit Primary Administrator details">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <span class="admin-user-pill-primary" title="Primary system account protected from deletion">Primary</span>
        </div>
      `;
    } else {
      actionHtml = `
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.45rem;">
          <button type="button" class="btn-edit-admin-row" onclick="startEditAdmin(${user.id})" title="Edit administrator details">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <button type="button" class="btn-delete-admin-row" onclick="openDeleteAdminConfirm(${user.id})" title="Delete administrator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      `;
    }

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #ece4d8; color: #473e34; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;">
              ${safeFullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 600; color: #221c16; display: flex; align-items: center;">
                ${safeFullName}
                ${isCurrent ? '<span class="admin-user-pill-you">You</span>' : ''}
              </div>
              <div style="font-size: 0.75rem; color: #8c827a;">
                Added ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'System'}
              </div>
            </div>
          </div>
        </td>
        <td style="font-family: monospace; color: #5a4f43;">@${safeUsername}</td>
        <td>
          <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: ${roleBadgeBg}; color: ${roleBadgeColor};">
            ${safeRole}
          </span>
        </td>
        <td style="text-align: right;">
          ${actionHtml}
        </td>
      </tr>
    `;
  }).join('');
}

function startEditAdmin(adminId) {
  const user = (ADMIN_STATE.adminUsers || []).find(u => u.id === adminId);
  if (!user) return;

  ADMIN_STATE.editingAdminId = adminId;

  const idInput = document.getElementById('edit-admin-id');
  if (idInput) idInput.value = user.id;

  const isPrimary = (user.id === 1 || (user.username && user.username.toLowerCase() === 'admin'));

  const heading = document.getElementById('admin-form-heading');
  if (heading) {
    heading.textContent = `✏️ Edit Administrator (@${user.username})`;
  }

  const modeBadge = document.getElementById('admin-form-mode-badge');
  if (modeBadge) modeBadge.style.display = 'inline-block';

  const fullNameInput = document.getElementById('new-admin-fullname');
  if (fullNameInput) fullNameInput.value = user.full_name || '';

  const usernameInput = document.getElementById('new-admin-username');
  if (usernameInput) {
    usernameInput.value = user.username || '';
    if (isPrimary) {
      usernameInput.disabled = true;
      usernameInput.title = 'Primary administrator username cannot be changed';
    } else {
      usernameInput.disabled = false;
      usernameInput.title = '';
    }
  }

  const roleSelect = document.getElementById('new-admin-role');
  if (roleSelect) {
    roleSelect.value = user.role || 'admin';
    if (isPrimary) {
      roleSelect.disabled = true;
      roleSelect.title = 'Primary administrator must retain Administrator role';
    } else {
      roleSelect.disabled = false;
      roleSelect.title = '';
    }
    if (roleSelect._syncCustomSelect) roleSelect._syncCustomSelect();
  }

  const passwordLabel = document.getElementById('lbl-admin-password');
  if (passwordLabel) passwordLabel.textContent = 'Password (leave blank to keep current)';

  const passwordInput = document.getElementById('new-admin-password');
  if (passwordInput) {
    passwordInput.required = false;
    passwordInput.value = '';
    passwordInput.placeholder = 'Leave blank to keep unchanged';
  }

  const hint = document.getElementById('password-edit-hint');
  if (hint) hint.style.display = 'block';

  const submitBtn = document.getElementById('btn-submit-admin');
  if (submitBtn) {
    submitBtn.textContent = 'Update Admin';
    submitBtn.disabled = false;
  }

  const cancelBtn = document.getElementById('btn-cancel-admin-edit');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  const formDeleteBtn = document.getElementById('btn-admin-form-delete');
  if (formDeleteBtn) {
    formDeleteBtn.style.display = isPrimary ? 'none' : 'inline-flex';
  }

  const alertEl = document.getElementById('add-admin-alert');
  if (alertEl) {
    alertEl.style.display = 'none';
    alertEl.textContent = '';
  }

  // Smooth scroll up to form
  const modalBody = document.querySelector('#admin-users-modal .modal-body');
  if (modalBody) {
    modalBody.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (fullNameInput) fullNameInput.focus();
}

function resetAdminForm() {
  ADMIN_STATE.editingAdminId = null;

  const form = document.getElementById('add-admin-form');
  if (form) form.reset();

  const idInput = document.getElementById('edit-admin-id');
  if (idInput) idInput.value = '';

  const heading = document.getElementById('admin-form-heading');
  if (heading) heading.textContent = '+ Add New Administrator';

  const modeBadge = document.getElementById('admin-form-mode-badge');
  if (modeBadge) modeBadge.style.display = 'none';

  const usernameInput = document.getElementById('new-admin-username');
  if (usernameInput) {
    usernameInput.disabled = false;
    usernameInput.placeholder = 'e.g. ruwan';
    usernameInput.title = '';
  }

  const roleSelect = document.getElementById('new-admin-role');
  if (roleSelect) {
    roleSelect.disabled = false;
    roleSelect.value = 'admin';
    roleSelect.title = '';
    if (roleSelect._syncCustomSelect) roleSelect._syncCustomSelect();
  }

  const passwordLabel = document.getElementById('lbl-admin-password');
  if (passwordLabel) passwordLabel.textContent = 'Password (min 6 chars) *';

  const passwordInput = document.getElementById('new-admin-password');
  if (passwordInput) {
    passwordInput.required = true;
    passwordInput.placeholder = '••••••••';
    passwordInput.value = '';
  }

  const hint = document.getElementById('password-edit-hint');
  if (hint) hint.style.display = 'none';

  const submitBtn = document.getElementById('btn-submit-admin');
  if (submitBtn) {
    submitBtn.textContent = 'Create Admin Account';
    submitBtn.disabled = false;
  }

  const cancelBtn = document.getElementById('btn-cancel-admin-edit');
  if (cancelBtn) cancelBtn.style.display = 'none';

  const formDeleteBtn = document.getElementById('btn-admin-form-delete');
  if (formDeleteBtn) formDeleteBtn.style.display = 'none';

  const alertEl = document.getElementById('add-admin-alert');
  if (alertEl) {
    alertEl.style.display = 'none';
    alertEl.textContent = '';
  }
}

function handleFormDeleteAdminClick() {
  if (!ADMIN_STATE.editingAdminId) return;
  const user = (ADMIN_STATE.adminUsers || []).find(u => u.id === ADMIN_STATE.editingAdminId);
  if (!user) return;
  if (user.id === 1 || (user.username && user.username.toLowerCase() === 'admin')) {
    alert('The primary system administrator account cannot be deleted.');
    return;
  }
  openDeleteAdminConfirm(user.id);
}

async function handleAdminFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btn-submit-admin');

  const fullNameInput = document.getElementById('new-admin-fullname');
  const usernameInput = document.getElementById('new-admin-username');
  const passwordInput = document.getElementById('new-admin-password');
  const roleSelect = document.getElementById('new-admin-role');

  const fullName = fullNameInput ? fullNameInput.value.trim() : '';
  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';
  const role = roleSelect ? roleSelect.value : 'admin';

  const isEdit = Boolean(ADMIN_STATE.editingAdminId);

  if (!fullName || !username) {
    showAdminAlert('Please fill in both Full Name and Username.', 'error');
    return;
  }

  if (username.length < 3) {
    showAdminAlert('Username must be at least 3 characters long.', 'error');
    return;
  }

  if (/\s/.test(username)) {
    showAdminAlert('Username cannot contain spaces.', 'error');
    return;
  }

  if (!isEdit && (!password || password.length < 6)) {
    showAdminAlert('Password is required and must be at least 6 characters long.', 'error');
    return;
  }

  if (isEdit && password && password.length < 6) {
    showAdminAlert('New password must be at least 6 characters long if provided.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Updating...' : 'Creating...';
  }

  try {
    const url = isEdit ? `/api/admins/${ADMIN_STATE.editingAdminId}` : '/api/admins';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
      full_name: fullName,
      username,
      role
    };
    if (password) {
      payload.password = password;
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showAdminAlert(
        isEdit ? `Administrator '${username}' updated successfully!` : `Admin account '${username}' created successfully!`,
        'success'
      );

      // If updating the currently logged-in account, refresh current user and header
      if (ADMIN_STATE.currentUser && (
        ADMIN_STATE.currentUser.id === (data.user && data.user.id) ||
        (ADMIN_STATE.currentUser.username && ADMIN_STATE.currentUser.username.toLowerCase() === username.toLowerCase())
      )) {
        ADMIN_STATE.currentUser = { ...ADMIN_STATE.currentUser, ...data.user };
        localStorage.setItem('ceylon_admin_user', JSON.stringify(ADMIN_STATE.currentUser));
        updateAuthHeader(true);
      }

      resetAdminForm();
      await loadAdminUsers();
    } else {
      showAdminAlert(data.message || `Failed to ${isEdit ? 'update' : 'create'} administrator account.`, 'error');
    }
  } catch (err) {
    // Local fallback for offline
    if (isEdit) {
      const idx = ADMIN_STATE.adminUsers.findIndex(u => u.id === ADMIN_STATE.editingAdminId);
      if (idx > -1) {
        ADMIN_STATE.adminUsers[idx] = {
          ...ADMIN_STATE.adminUsers[idx],
          full_name: fullName,
          username: username,
          role: role
        };
        showAdminAlert(`Administrator '${username}' updated successfully (offline mode)!`, 'success');
        resetAdminForm();
        renderAdminUsersTable();
      }
    } else {
      const exists = ADMIN_STATE.adminUsers.some(u => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        showAdminAlert(`Username '${username}' is already taken.`, 'error');
      } else {
        const newAdmin = {
          id: Date.now(),
          full_name: fullName,
          username: username,
          role: role,
          created_at: new Date().toISOString()
        };
        ADMIN_STATE.adminUsers.push(newAdmin);
        showAdminAlert(`Admin account '${username}' created successfully (offline mode)!`, 'success');
        resetAdminForm();
        renderAdminUsersTable();
      }
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Update Admin' : 'Create Admin Account';
    }
  }
}

function showAdminAlert(msg, type = 'error') {
  const alertEl = document.getElementById('add-admin-alert');
  if (!alertEl) return;

  alertEl.textContent = msg;
  alertEl.style.display = 'block';
  if (type === 'success') {
    alertEl.style.background = '#eaf4ed';
    alertEl.style.border = '1px solid #c2e2c8';
    alertEl.style.color = '#2c6f37';
  } else {
    alertEl.style.background = '#fdf0ed';
    alertEl.style.border = '1px solid #f5b7b1';
    alertEl.style.color = '#c0392b';
  }
}

function openDeleteAdminConfirm(adminId, adminName) {
  ADMIN_STATE.deleteAdminId = adminId;
  const user = (ADMIN_STATE.adminUsers || []).find(u => u.id === adminId);
  const displayName = adminName || (user ? (user.full_name || user.username) : 'this administrator');
  const nameEl = document.getElementById('delete-admin-target-name');
  if (nameEl) nameEl.textContent = displayName;
  const modal = document.getElementById('delete-admin-modal');
  if (modal) modal.classList.add('active');
}

function closeDeleteAdminModal() {
  const modal = document.getElementById('delete-admin-modal');
  if (modal) modal.classList.remove('active');
  ADMIN_STATE.deleteAdminId = null;
}

async function confirmDeleteAdminUser() {
  if (!ADMIN_STATE.deleteAdminId) return;

  try {
    const res = await fetch(`/api/admins/${ADMIN_STATE.deleteAdminId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (ADMIN_STATE.editingAdminId === ADMIN_STATE.deleteAdminId) {
        resetAdminForm();
      }
      closeDeleteAdminModal();
      await loadAdminUsers();
    } else {
      alert(data.message || 'Failed to delete administrator account.');
      closeDeleteAdminModal();
    }
  } catch (err) {
    // Offline fallback
    if (ADMIN_STATE.editingAdminId === ADMIN_STATE.deleteAdminId) {
      resetAdminForm();
    }
    ADMIN_STATE.adminUsers = ADMIN_STATE.adminUsers.filter(u => u.id !== ADMIN_STATE.deleteAdminId);
    closeDeleteAdminModal();
    renderAdminUsersTable();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
