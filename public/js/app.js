/**
 * Ceylon Journey - Main Application Script
 * Controls Landing Page and Day Trip Planner
 * Coordinates: Haloluwa Junction (7.3069° N, 80.6095° E)
 */

// Global App State
const APP_STATE = {
  attractions: [],
  filteredAttractions: [],
  filters: {
    search: '',
    category: 'all',
    maxDistance: 25,
    sortBy: 'nearest'
  },
  itinerary: JSON.parse(localStorage.getItem('ceylon_journey_itinerary') || '[]'),
  haloluwa: {
    lat: 7.3069,
    lng: 80.6095,
    name: 'Haloluwa, Kandy (Benchmark Origin)'
  },
  leafletMap: null,
  mapMarkers: [],
  mapPolyline: null
};

// Category Icon & Color Mapping
const CATEGORY_META = {
  Religious: { icon: '🔥', class: 'cat-religious', color: '#b25316' },
  Heritage: { icon: '🏛️', class: 'cat-heritage', color: '#785a36' },
  Nature: { icon: '🌿', class: 'cat-nature', color: '#2c6f37' },
  Cultural: { icon: '🎭', class: 'cat-cultural', color: '#216f91' },
  Sightseeing: { icon: '🔭', class: 'cat-sightseeing', color: '#414b5c' }
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  await fetchAttractions();
  
  // Detect if on Landing Page or Planner Page
  const isLandingPage = document.getElementById('attractions-grid') !== null;
  const isPlannerPage = document.getElementById('itinerary-stops-container') !== null;

  if (isLandingPage) {
    initLandingPage();
  }
  
  if (isPlannerPage) {
    initPlannerPage();
  }
}

// ==========================================================================
// DATA FETCHING (API with static fallback)
// ==========================================================================
async function fetchAttractions() {
  try {
    const res = await fetch('/api/attractions');
    if (res.ok) {
      const data = await res.json();
      APP_STATE.attractions = data.data || data;
    } else {
      throw new Error('API request failed');
    }
  } catch (err) {
    console.warn('[Ceylon Journey] Using fallback dataset:', err);
    APP_STATE.attractions = getFallbackAttractions();
  }
  APP_STATE.filteredAttractions = [...APP_STATE.attractions];
}

// ==========================================================================
// LANDING PAGE LOGIC (Screenshots 1 & 2)
// ==========================================================================
function initLandingPage() {
  setupFilterListeners();
  renderAttractionsGrid();
}

function setupFilterListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      APP_STATE.filters.search = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  const catButtons = document.querySelectorAll('.cat-filter-btn');
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      APP_STATE.filters.category = btn.getAttribute('data-category');
      applyFilters();
    });
  });

  const distSlider = document.getElementById('distance-slider');
  const distVal = document.getElementById('distance-val');
  if (distSlider && distVal) {
    distSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      distVal.textContent = `≤ ${val}km`;
      APP_STATE.filters.maxDistance = val;
      applyFilters();
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      APP_STATE.filters.sortBy = e.target.value;
      applyFilters();
    });
  }
}

function applyFilters() {
  let result = [...APP_STATE.attractions];

  // Keyword search
  if (APP_STATE.filters.search) {
    const q = APP_STATE.filters.search;
    result = result.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.description.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  }

  // Category filter
  if (APP_STATE.filters.category !== 'all') {
    result = result.filter(item => item.category === APP_STATE.filters.category);
  }

  // Distance filter (<= maxDistance km)
  result = result.filter(item => parseFloat(item.distance_km) <= APP_STATE.filters.maxDistance);

  // Sorting
  if (APP_STATE.filters.sortBy === 'nearest') {
    result.sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));
  } else if (APP_STATE.filters.sortBy === 'rating') {
    result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  } else if (APP_STATE.filters.sortBy === 'alpha') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }

  APP_STATE.filteredAttractions = result;
  renderAttractionsGrid();
}

function renderAttractionsGrid() {
  const grid = document.getElementById('attractions-grid');
  const countElem = document.getElementById('attractions-count');
  if (!grid) return;

  if (countElem) {
    countElem.textContent = `${APP_STATE.filteredAttractions.length} attractions found`;
  }

  if (APP_STATE.filteredAttractions.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: #7d7265;">
        <p style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.5rem;">No attractions match your criteria</p>
        <p style="font-size: 0.9rem;">Try adjusting your search keyword or increasing the distance radius.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = APP_STATE.filteredAttractions.map(att => {
    const isAdded = APP_STATE.itinerary.some(item => item.id === att.id);
    const cat = CATEGORY_META[att.category] || { icon: '📍', class: '', color: '#333' };

    return `
      <article class="attraction-card" data-id="${att.id}">
        <div class="card-image-wrap">
          <img src="${att.image_url || 'https://images.unsplash.com/photo-1546708973-b339540b5162?w=800'}" alt="${att.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1546708973-b339540b5162?w=800'">
          <span class="badge-category-float" style="color: ${cat.color};">
            ${cat.icon} ${att.category}
          </span>
          <span class="badge-rating-float">
            ★ ${parseFloat(att.rating).toFixed(1)}
          </span>
        </div>
        <div class="card-content">
          <div class="card-title-row">
            <h3 class="card-title">${att.name}</h3>
            <span class="card-distance">${att.distance_km} km</span>
          </div>
          <p class="card-desc">${att.description}</p>
          <div class="card-footer-row">
            <button type="button" class="btn-details-link" onclick="openDetailsModal(${att.id})">Details</button>
            <button type="button" class="btn-add-plan ${isAdded ? 'added' : ''}" onclick="togglePlanItem(${att.id})">
              ${isAdded ? '✓ Added' : '+ Add to Plan'}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================================================
// DETAILS MODAL (Multi-Tab per SRS 3.1 & 4.1)
// ==========================================================================
let currentDetailsMap = null;

function openDetailsModal(attractionId) {
  const att = APP_STATE.attractions.find(a => a.id === attractionId);
  if (!att) return;

  const modal = document.getElementById('details-modal');
  if (!modal) return;

  const cat = CATEGORY_META[att.category] || { icon: '📍', color: '#333' };
  const isAdded = APP_STATE.itinerary.some(item => item.id === att.id);

  document.getElementById('modal-attraction-title').textContent = att.name;
  
  // Tab 1: Overview
  document.getElementById('tab-content-overview').innerHTML = `
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
      <img src="${att.image_url}" alt="${att.name}" style="width: 220px; height: 160px; object-fit: cover; border-radius: 12px;">
      <div style="flex: 1; min-width: 240px;">
        <div style="margin-bottom: 0.6rem; display: flex; gap: 0.8rem; align-items: center;">
          <span class="badge-category-float" style="position: static; color: ${cat.color};">${cat.icon} ${att.category}</span>
          <span style="font-weight: 600; color: #1e5a32;">★ ${att.rating} Rating</span>
          <span style="color: #7d7265; font-size: 0.88rem;">📍 ${att.distance_km} km from Haloluwa</span>
        </div>
        <p style="font-size: 0.92rem; color: #473e34; margin-bottom: 0.8rem; line-height: 1.5;">${att.description}</p>
        <div style="font-size: 0.85rem; color: #6e6459; display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
          <div><strong>🕒 Hours:</strong> ${att.opening_time || '08:00 AM - 05:00 PM'}</div>
          <div><strong>⏱️ Duration:</strong> ~${att.estimated_duration_min || 60} mins</div>
          <div><strong>🎟️ Local:</strong> ${att.price_display || 'Free'}</div>
          <div><strong>🎟️ Foreign:</strong> ${att.price_foreign > 0 ? `LKR ${att.price_foreign}` : 'Free'}</div>
        </div>
      </div>
    </div>
    ${att.historical_context ? `
      <div style="background: #FAF6EF; border: 1px solid #ebdccb; border-radius: 10px; padding: 1rem; margin-top: 1rem;">
        <h4 style="font-family: var(--font-serif); font-size: 0.95rem; margin-bottom: 0.35rem; color: #221c16;">Historical Significance</h4>
        <p style="font-size: 0.86rem; color: #5a4f43; line-height: 1.5;">${att.historical_context}</p>
      </div>
    ` : ''}
    <div style="margin-top: 1rem; font-size: 0.82rem; color: #887b6e;">
      <strong>📞 Emergency & Assistance:</strong> ${att.emergency_contact || 'Tourist Police Kandy: 1912'}
    </div>
  `;

  // Tab 2: Accessibility & Facilities
  document.getElementById('tab-content-accessibility').innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0.5rem 0;">
      <div style="background: #faf7f2; border: 1px solid #ebdccb; border-radius: 10px; padding: 1rem;">
        <div style="font-size: 1.2rem; margin-bottom: 0.3rem;">♿ Wheelchair Accessibility</div>
        <p style="font-size: 0.86rem; color: #5a4f43;">${att.accessibility_wheelchair ? 'Fully accessible ramps & pathways.' : 'Limited accessibility; stairs and rocky terrain.'}</p>
      </div>
      <div style="background: #faf7f2; border: 1px solid #ebdccb; border-radius: 10px; padding: 1rem;">
        <div style="font-size: 1.2rem; margin-bottom: 0.3rem;">🚗 Parking & Arrival</div>
        <p style="font-size: 0.86rem; color: #5a4f43;">${att.accessibility_parking ? 'Designated vehicle parking area available.' : 'Street parking or drop-off only.'}</p>
      </div>
      <div style="background: #faf7f2; border: 1px solid #ebdccb; border-radius: 10px; padding: 1rem;">
        <div style="font-size: 1.2rem; margin-bottom: 0.3rem;">🚻 Restroom Facilities</div>
        <p style="font-size: 0.86rem; color: #5a4f43;">${att.accessibility_restrooms ? 'Maintained on-site visitor restrooms.' : 'Nearest public restrooms in Kandy city.'}</p>
      </div>
      <div style="background: #faf7f2; border: 1px solid #ebdccb; border-radius: 10px; padding: 1rem;">
        <div style="font-size: 1.2rem; margin-bottom: 0.3rem;">🥾 Walking Difficulty</div>
        <p style="font-size: 0.86rem; color: #5a4f43;"><strong>${att.walking_difficulty || 'Easy'}</strong> • ${att.elderly_friendly ? 'Elderly & family friendly' : 'Moderate physical endurance recommended'}</p>
      </div>
    </div>
  `;

  // Tab 3: Cultural Tips & Etiquette
  document.getElementById('tab-content-tips').innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0;">
      <div style="background: #faf7f2; border: 1px solid #ebdccb; border-radius: 10px; padding: 1rem;">
        <h4 style="font-family: var(--font-serif); font-size: 0.95rem; margin-bottom: 0.3rem;">👔 Dress Code Guidelines</h4>
        <p style="font-size: 0.86rem; color: #5a4f43;">${att.dress_code || 'Modest casual attire recommended.'}</p>
      </div>
      <div style="background: #faf7f2; border: 1px solid #ebdccb; border-radius: 10px; padding: 1rem;">
        <h4 style="font-family: var(--font-serif); font-size: 0.95rem; margin-bottom: 0.3rem;">📷 Photography Regulations</h4>
        <p style="font-size: 0.86rem; color: #5a4f43;">${att.photography_rules || 'Photography permitted in designated areas.'}</p>
      </div>
      <div style="background: #faf7f2; border: 1px solid #ebdccb; border-radius: 10px; padding: 1rem;">
        <h4 style="font-family: var(--font-serif); font-size: 0.95rem; margin-bottom: 0.3rem;">🤝 Local Etiquette & Customs</h4>
        <p style="font-size: 0.86rem; color: #5a4f43;">${att.cultural_tips || 'Treat local traditions with care. Maintain silence in meditation areas.'}</p>
      </div>
    </div>
  `;

  // Tab 4: Map Location
  document.getElementById('tab-content-map').innerHTML = `
    <div id="details-leaflet-map" style="height: 320px; border-radius: 12px; border: 1px solid #ebdccb;"></div>
    <p style="font-size: 0.82rem; color: #7d7265; margin-top: 0.6rem;">
      GPS: ${parseFloat(att.latitude).toFixed(4)}° N, ${parseFloat(att.longitude).toFixed(4)}° E • 
      Distance from Haloluwa Reference Junction: <strong>${att.distance_km} km</strong>
    </p>
  `;

  // Update Footer Button in Modal
  const modalAddBtn = document.getElementById('modal-btn-add-plan');
  if (modalAddBtn) {
    modalAddBtn.className = `btn-add-plan ${isAdded ? 'added' : ''}`;
    modalAddBtn.textContent = isAdded ? '✓ In Itinerary' : '+ Add to Plan';
    modalAddBtn.onclick = () => {
      togglePlanItem(att.id);
      modalAddBtn.className = `btn-add-plan ${APP_STATE.itinerary.some(i => i.id === att.id) ? 'added' : ''}`;
      modalAddBtn.textContent = APP_STATE.itinerary.some(i => i.id === att.id) ? '✓ In Itinerary' : '+ Add to Plan';
    };
  }

  // Switch to Overview tab by default
  switchDetailsTab('overview');

  modal.classList.add('active');

  // Trigger leaflet map rendering on map tab click or deferred
  setTimeout(() => {
    initDetailsMap(att);
  }, 200);
}

function switchDetailsTab(tabId) {
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.details-tab-pane').forEach(pane => {
    pane.style.display = pane.id === `tab-content-${tabId}` ? 'block' : 'none';
  });

  if (tabId === 'map' && currentDetailsMap) {
    setTimeout(() => {
      currentDetailsMap.invalidateSize();
    }, 150);
  }
}

function initDetailsMap(att) {
  const mapElem = document.getElementById('details-leaflet-map');
  if (!mapElem || typeof L === 'undefined') return;

  if (currentDetailsMap) {
    currentDetailsMap.remove();
    currentDetailsMap = null;
  }

  const lat = parseFloat(att.latitude) || 7.2936;
  const lng = parseFloat(att.longitude) || 80.6413;

  currentDetailsMap = L.map('details-leaflet-map').setView([lat, lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(currentDetailsMap);

  // Attraction Pin
  L.marker([lat, lng]).addTo(currentDetailsMap)
    .bindPopup(`<strong>${att.name}</strong><br>${att.category} • ${att.distance_km} km from Haloluwa`)
    .openPopup();

  // Haloluwa Benchmark Pin
  L.circleMarker([APP_STATE.haloluwa.lat, APP_STATE.haloluwa.lng], {
    color: '#94532b',
    fillColor: '#94532b',
    fillOpacity: 0.9,
    radius: 7
  }).addTo(currentDetailsMap).bindPopup('Haloluwa Junction (0.00 km)');
}

function closeDetailsModal() {
  const modal = document.getElementById('details-modal');
  if (modal) modal.classList.remove('active');
}

// ==========================================================================
// ITINERARY MANAGEMENT (Local State & Sync)
// ==========================================================================
function togglePlanItem(attractionId) {
  const att = APP_STATE.attractions.find(a => a.id === attractionId);
  if (!att) return;

  const idx = APP_STATE.itinerary.findIndex(item => item.id === attractionId);
  if (idx > -1) {
    APP_STATE.itinerary.splice(idx, 1);
  } else {
    APP_STATE.itinerary.push(att);
  }

  saveItinerary();
  renderAttractionsGrid();

  // If on planner page, re-render
  if (document.getElementById('itinerary-stops-container')) {
    renderPlannerItinerary();
    renderPlannerAddList();
  }
}

function saveItinerary() {
  localStorage.setItem('ceylon_journey_itinerary', JSON.stringify(APP_STATE.itinerary));
}

// ==========================================================================
// DAY TRIP PLANNER PAGE LOGIC (Screenshot 3)
// ==========================================================================
function initPlannerPage() {
  setupPlannerSearch();
  renderPlannerItinerary();
  renderPlannerAddList();
  initPlannerMap();
}

function setupPlannerSearch() {
  const search = document.getElementById('planner-add-search');
  if (search) {
    search.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      renderPlannerAddList(q);
    });
  }
}

function renderPlannerAddList(filterText = '') {
  const list = document.getElementById('planner-add-list');
  if (!list) return;

  let items = APP_STATE.attractions;
  if (filterText) {
    items = items.filter(a => 
      a.name.toLowerCase().includes(filterText) ||
      a.category.toLowerCase().includes(filterText)
    );
  }

  list.innerHTML = items.map(att => {
    const isAdded = APP_STATE.itinerary.some(item => item.id === att.id);
    const cat = CATEGORY_META[att.category] || { icon: '📍' };
    const priceTxt = att.price_display || (att.price_local > 0 ? `LKR ${att.price_local}` : 'Free');

    return `
      <div class="add-attraction-card">
        <img src="${att.image_url || 'https://images.unsplash.com/photo-1546708973-b339540b5162?w=800'}" alt="${att.name}" class="add-card-thumb" onerror="this.src='https://images.unsplash.com/photo-1546708973-b339540b5162?w=800'">
        <div class="add-card-body">
          <h4 class="add-card-name">${att.name}</h4>
          <div class="add-card-details">
            <span>${cat.icon} ${att.distance_km}km</span>
            <span>★ ${att.rating}</span>
            <span>${priceTxt}</span>
          </div>
        </div>
        <button type="button" class="btn-circle-add ${isAdded ? 'is-added' : ''}" onclick="togglePlanItem(${att.id})" title="${isAdded ? 'Remove from plan' : 'Add to plan'}">
          ${isAdded ? '✓' : '+'}
        </button>
      </div>
    `;
  }).join('');
}

function renderPlannerItinerary() {
  const container = document.getElementById('itinerary-stops-container');
  const countTitle = document.getElementById('itinerary-stops-count');
  if (!container) return;

  const count = APP_STATE.itinerary.length;
  if (countTitle) {
    countTitle.textContent = `Your Itinerary (${count} stops)`;
  }

  if (count === 0) {
    container.innerHTML = `
      <div class="itinerary-empty-box">
        <div class="empty-box-icon">🗺️</div>
        <p class="empty-box-text">Add attractions from the list to begin planning your perfect day.</p>
      </div>
    `;
    updatePlannerStats(0, 0, 0);
    updatePlannerMapRoute();
    return;
  }

  // Calculate Metrics
  let totalKm = 0;
  let totalMinutes = 0;
  let totalLKR = 0;

  // Origin to stop 1
  let prevLat = APP_STATE.haloluwa.lat;
  let prevLng = APP_STATE.haloluwa.lng;

  APP_STATE.itinerary.forEach((stop) => {
    const sLat = parseFloat(stop.latitude) || 7.2936;
    const sLng = parseFloat(stop.longitude) || 80.6413;
    totalKm += haversineDistance(prevLat, prevLng, sLat, sLng);
    prevLat = sLat;
    prevLng = sLng;

    totalMinutes += (parseInt(stop.estimated_duration_min, 10) || 60) + 20; // +20 min travel time
    totalLKR += parseFloat(stop.price_local || 0);
  });

  updatePlannerStats(totalKm, totalMinutes, totalLKR);

  // Render Controls & Ordered Cards
  container.innerHTML = `
    <div class="itinerary-stats-banner">
      <div class="itinerary-stat-pill">
        <span class="stat-pill-label">Total Distance</span>
        <span class="stat-pill-val">${totalKm.toFixed(1)} km</span>
      </div>
      <div class="itinerary-stat-pill">
        <span class="stat-pill-label">Est. Duration</span>
        <span class="stat-pill-val">${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m</span>
      </div>
      <div class="itinerary-stat-pill">
        <span class="stat-pill-label">Total Cost</span>
        <span class="stat-pill-val">LKR ${totalLKR.toLocaleString()}</span>
      </div>
    </div>

    <div class="itinerary-actions-row">
      <button type="button" class="btn-action-sm btn-action-primary-sm" onclick="optimizeItineraryRoute()">
        ⚡ Optimize Route
      </button>
      <button type="button" class="btn-action-sm" onclick="printItinerary()">
        🖨️ Print / Export
      </button>
      <button type="button" class="btn-action-sm" onclick="clearItinerary()">
        🗑️ Clear All
      </button>
    </div>

    <div class="itinerary-stops-list">
      ${APP_STATE.itinerary.map((stop, index) => {
        const cat = CATEGORY_META[stop.category] || { icon: '📍' };
        const priceTxt = stop.price_display || (stop.price_local > 0 ? `LKR ${stop.price_local}` : 'Free');
        return `
          <div class="itinerary-stop-card">
            <div class="stop-seq-badge">${index + 1}</div>
            <img src="${stop.image_url}" alt="${stop.name}" class="stop-img-thumb" onerror="this.src='https://images.unsplash.com/photo-1546708973-b339540b5162?w=800'">
            <div class="stop-info-body">
              <h4 class="stop-title">${stop.name}</h4>
              <div class="stop-meta-line">
                <span>${cat.icon} ${stop.category}</span>
                <span>⏱️ ~${stop.estimated_duration_min || 60}m</span>
                <span>🎟️ ${priceTxt}</span>
              </div>
            </div>
            <div class="stop-controls-group">
              ${index > 0 ? `<button type="button" class="btn-icon-control" onclick="moveStop(${index}, -1)" title="Move Up">▲</button>` : ''}
              ${index < count - 1 ? `<button type="button" class="btn-icon-control" onclick="moveStop(${index}, 1)" title="Move Down">▼</button>` : ''}
              <button type="button" class="btn-icon-control btn-icon-delete" onclick="removeStop(${index})" title="Remove">✕</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="itinerary-map-container" id="itinerary-leaflet-map"></div>
  `;

  setTimeout(() => {
    initPlannerMap();
    updatePlannerMapRoute();
  }, 100);
}

function updatePlannerStats(km, min, cost) {
  // Update header or stats element if present
}

function moveStop(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= APP_STATE.itinerary.length) return;
  const temp = APP_STATE.itinerary[index];
  APP_STATE.itinerary[index] = APP_STATE.itinerary[target];
  APP_STATE.itinerary[target] = temp;
  saveItinerary();
  renderPlannerItinerary();
}

function removeStop(index) {
  APP_STATE.itinerary.splice(index, 1);
  saveItinerary();
  renderPlannerItinerary();
  renderPlannerAddList();
}

function clearItinerary() {
  if (!confirm('Are you sure you want to clear your current day plan?')) return;
  APP_STATE.itinerary = [];
  saveItinerary();
  renderPlannerItinerary();
  renderPlannerAddList();
}

// ==========================================================================
// ROUTE OPTIMIZATION (Greedy Nearest-Neighbor from Haloluwa per SRS REQ-PLN-2)
// ==========================================================================
function optimizeItineraryRoute() {
  if (APP_STATE.itinerary.length <= 1) return;

  const unvisited = [...APP_STATE.itinerary];
  const optimized = [];

  let currentLat = APP_STATE.haloluwa.lat;
  let currentLng = APP_STATE.haloluwa.lng;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let shortestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistance(
        currentLat, currentLng,
        parseFloat(unvisited[i].latitude), parseFloat(unvisited[i].longitude)
      );
      if (dist < shortestDist) {
        shortestDist = dist;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    optimized.push(nextStop);
    currentLat = parseFloat(nextStop.latitude);
    currentLng = parseFloat(nextStop.longitude);
  }

  APP_STATE.itinerary = optimized;
  saveItinerary();
  renderPlannerItinerary();
  alert('Route optimized! Stops have been rearranged to minimize travel time starting from Haloluwa.');
}

function printItinerary() {
  window.print();
}

// ==========================================================================
// LEAFLET ROUTE MAP (Planner Page)
// ==========================================================================
function initPlannerMap() {
  const mapDiv = document.getElementById('itinerary-leaflet-map');
  if (!mapDiv || typeof L === 'undefined') return;

  if (APP_STATE.leafletMap) {
    APP_STATE.leafletMap.remove();
    APP_STATE.leafletMap = null;
  }

  APP_STATE.leafletMap = L.map('itinerary-leaflet-map').setView([APP_STATE.haloluwa.lat, APP_STATE.haloluwa.lng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(APP_STATE.leafletMap);

  updatePlannerMapRoute();
}

function updatePlannerMapRoute() {
  if (!APP_STATE.leafletMap) return;

  // Clear previous markers & polyline
  APP_STATE.mapMarkers.forEach(m => APP_STATE.leafletMap.removeLayer(m));
  APP_STATE.mapMarkers = [];
  if (APP_STATE.mapPolyline) {
    APP_STATE.leafletMap.removeLayer(APP_STATE.mapPolyline);
    APP_STATE.mapPolyline = null;
  }

  const latlngs = [[APP_STATE.haloluwa.lat, APP_STATE.haloluwa.lng]];

  // Haloluwa start marker
  const startMarker = L.circleMarker([APP_STATE.haloluwa.lat, APP_STATE.haloluwa.lng], {
    color: '#1e5a32',
    fillColor: '#2e6930',
    fillOpacity: 1,
    radius: 9
  }).addTo(APP_STATE.leafletMap).bindPopup('<strong>Start: Haloluwa Junction</strong> (0.00 km)');
  APP_STATE.mapMarkers.push(startMarker);

  APP_STATE.itinerary.forEach((stop, index) => {
    const lat = parseFloat(stop.latitude);
    const lng = parseFloat(stop.longitude);
    latlngs.push([lat, lng]);

    // Numbered marker
    const marker = L.marker([lat, lng]).addTo(APP_STATE.leafletMap)
      .bindPopup(`<strong>Stop ${index + 1}: ${stop.name}</strong><br>${stop.category} • ${stop.distance_km} km from Haloluwa`);
    APP_STATE.mapMarkers.push(marker);
  });

  if (latlngs.length > 1) {
    APP_STATE.mapPolyline = L.polyline(latlngs, {
      color: '#94532b',
      weight: 3.5,
      dashArray: '6, 6',
      opacity: 0.85
    }).addTo(APP_STATE.leafletMap);

    APP_STATE.leafletMap.fitBounds(APP_STATE.mapPolyline.getBounds(), { padding: [30, 30] });
  } else {
    APP_STATE.leafletMap.setView([APP_STATE.haloluwa.lat, APP_STATE.haloluwa.lng], 12);
  }
}

// ==========================================================================
// UTILITY: Haversine Distance Formula
// ==========================================================================
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fallback seed data if offline or backend DB not running
function getFallbackAttractions() {
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
