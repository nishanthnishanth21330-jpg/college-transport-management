/* ==========================================================
   College Transport Management System — Frontend Logic
   Firebase Realtime Database + simple local session
   ========================================================== */
import { db } from "./firebase-config.js";

import {
  ref,
  set,
  push,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

/* ---------------- Session helpers ---------------- */
const Auth = {
  getUser() {
    const raw = localStorage.getItem('ct_user');
    try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  },
  setSession(user) {
    localStorage.setItem('ct_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('ct_user');
  },
  isLoggedIn() {
    return !!this.getUser();
  }
};

/* ---------------- Toast notifications ---------------- */
function toast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ---------------- Sidebar / Layout ---------------- */
const NAV_ITEMS = [
  { href: 'index.html', label: 'Home', icon: '🏠', page: 'home' },
  { href: 'login.html', label: 'Login', icon: '🔑', page: 'login', hideWhenLoggedIn: true },
  { href: 'add-bus.html', label: 'Add Bus', icon: '➕', page: 'add-bus', protected: true },
  { href: 'live-bus.html', label: 'Live Bus', icon: '🚌', page: 'live-bus', protected: true },
];

function renderSidebar(activePage) {
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  const loggedIn = Auth.isLoggedIn();
  const user = Auth.getUser();

  const navLinks = NAV_ITEMS
    .filter(item => !(item.hideWhenLoggedIn && loggedIn))
    .map(item => `
      <a href="${item.href}" class="${activePage === item.page ? 'active' : ''}">
        <span>${item.icon}</span><span>${item.label}</span>
      </a>
    `).join('');

  const logoutLink = loggedIn
    ? `<a href="#" id="logout-link"><span>🚪</span><span>Logout</span></a>`
    : '';

  root.innerHTML = `
    <div class="mobile-topbar">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;">🚌 College Transport</div>
      <button class="menu-btn" id="menu-toggle" aria-label="Open menu">☰</button>
    </div>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand"><span class="icon">🚌</span><span>College Transport</span></div>
      <nav class="sidebar-nav">
        ${navLinks}
        ${logoutLink}
      </nav>
      ${user ? `<div class="sidebar-user"><strong>${escapeHtml(user.name)}</strong>${escapeHtml(user.phone)}</div>` : ''}
    </aside>
  `;

  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  const logoutBtn = document.getElementById('logout-link');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      Auth.clearSession();
      toast('Logged out successfully', 'success');
      setTimeout(() => (window.location.href = 'login.html'), 600);
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function requireAuthOrRedirect() {
  if (!Auth.isLoggedIn()) {
    toast('Please log in to continue', 'error');
    setTimeout(() => (window.location.href = 'login.html'), 800);
    return false;
  }
  return true;
}

/* ---------------- Page: Login ---------------- */
function initLoginPage() {
  if (Auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  const form = document.getElementById('login-form');
  const nameInput = document.getElementById('login-name');
  const phoneInput = document.getElementById('login-phone');
  const nameError = document.getElementById('name-error');
  const phoneError = document.getElementById('phone-error');
  const submitBtn = document.getElementById('login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    nameError.classList.remove('show');
    phoneError.classList.remove('show');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    let valid = true;

    if (!name) {
      nameError.textContent = 'Name cannot be empty.';
      nameError.classList.add('show');
      valid = false;
    }
    if (!phone || !/^\+?[0-9]{7,15}$/.test(phone)) {
      phoneError.textContent = 'Please enter a valid phone number (7-15 digits).';
      phoneError.classList.add('show');
      valid = false;
    }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const usersRef = ref(db, 'users');
      const snapshot = await new Promise((resolve, reject) => {
        onValue(usersRef, resolve, reject, { onlyOnce: true });
      });

      let userId = null;
      if (snapshot.exists()) {
        const users = snapshot.val();
        for (const id in users) {
          if (users[id].phone === phone) {
            userId = id;
            break;
          }
        }
      }

      if (!userId) {
        const newUserRef = push(usersRef);
        userId = newUserRef.key;
        await set(newUserRef, {
          name,
          phone,
          createdAt: new Date().toISOString()
        });
      } else {
        await update(ref(db, `users/${userId}`), { name });
      }

      Auth.setSession({ id: userId, name, phone });
      toast('Login successful!', 'success');
      setTimeout(() => (window.location.href = 'index.html'), 500);
    } catch (err) {
      console.error('Firebase Login Error:', err);
      toast(err.message || 'Login failed. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'LOGIN';
    }
  });
}

/* ---------------- Page: Home ---------------- */
async function initHomePage() {
  const welcome = document.getElementById('welcome-user');
  const user = Auth.getUser();
  if (welcome) {
    welcome.textContent = user ? `Welcome back, ${user.name}!` : 'Welcome! Please log in to manage buses.';
  }

  if (!Auth.isLoggedIn()) {
    setStat('stat-total', '—');
    setStat('stat-active', '—');
    setStat('stat-live', '—');
    setStat('stat-completed', '—');
    return;
  }

  try {
    const busesRef = ref(db, 'buses');
    const snapshot = await new Promise((resolve, reject) => {
      onValue(busesRef, resolve, reject, { onlyOnce: true });
    });

    const buses = snapshot.exists() ? Object.values(snapshot.val()) : [];
    setStat('stat-total', buses.length);
    setStat('stat-active', buses.filter(b => b.status !== 'COMPLETED').length);
    setStat('stat-live', buses.filter(b => b.status === 'LIVE').length);
    setStat('stat-completed', buses.filter(b => b.status === 'COMPLETED').length);
  } catch (err) {
    console.error('Firebase Dashboard Error:', err);
    toast(err.message || 'Failed to load dashboard data.', 'error');
  }
}
function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ---------------- Page: Add Bus ---------------- */
function initAddBusPage() {
  if (!requireAuthOrRedirect()) return;

  const startBtn = document.getElementById('start-add-bus');
  const formWrap = document.getElementById('add-bus-form-wrap');
  const hero = document.getElementById('add-bus-hero');
  const form = document.getElementById('add-bus-form');
  const submitBtn = document.getElementById('add-bus-submit');

  if (!startBtn || !formWrap || !hero || !form || !submitBtn) {
    console.error('Add Bus elements not found.');
    return;
  }

  startBtn.addEventListener('click', () => {
    hero.style.display = 'none';
    formWrap.style.display = 'block';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fields = {
      bus_name: document.getElementById('bus_name').value.trim(),
      bus_number: document.getElementById('bus_number').value.trim(),
      driver_name: document.getElementById('driver_name').value.trim(),
      driver_phone: document.getElementById('driver_phone').value.trim(),
      start_location: document.getElementById('start_location').value.trim(),
      destination: document.getElementById('destination').value.trim(),
      route_details: document.getElementById('route_details').value.trim()
    };

    const liveLocation =
      document.getElementById('initial_live_location').value.trim();

    let latitude = null;
    let longitude = null;

    if (liveLocation) {
      const parts = liveLocation.split(',').map(p => p.trim());

      if (
        parts.length === 2 &&
        !isNaN(parseFloat(parts[0])) &&
        !isNaN(parseFloat(parts[1]))
      ) {
        latitude = parseFloat(parts[0]);
        longitude = parseFloat(parts[1]);
      } else {
        toast(
          'Please enter location like: 13.0827, 80.2707',
          'error'
        );
        return;
      }
    }

    // Required field validation
    if (
      !fields.bus_name ||
      !fields.bus_number ||
      !fields.driver_name ||
      !fields.driver_phone ||
      !fields.start_location ||
      !fields.destination
    ) {
      toast('Please fill in all required fields.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      // Check duplicate bus number in Firebase
      const busesRef = ref(db, 'buses');

      const snapshot = await new Promise((resolve, reject) => {
        onValue(
          busesRef,
          resolve,
          { onlyOnce: true }
        );
      });

      let duplicate = false;

      if (snapshot.exists()) {
        const buses = snapshot.val();

        Object.values(buses).forEach(bus => {
          if (
            bus.bus_number &&
            bus.bus_number.toLowerCase() ===
            fields.bus_number.toLowerCase()
          ) {
            duplicate = true;
          }
        });
      }

      if (duplicate) {
        throw new Error(
          'A bus with this Bus Number already exists.'
        );
      }

      // Create unique Firebase ID
      const newBusRef = push(busesRef);

      const busData = {
        id: newBusRef.key,
        ownerId: Auth.getUser().id,
        ownerName: Auth.getUser().name,
        ownerPhone: Auth.getUser().phone,
        bus_name: fields.bus_name,
        bus_number: fields.bus_number,
        driver_name: fields.driver_name,
        driver_phone: fields.driver_phone,
        start_location: fields.start_location,
        destination: fields.destination,
        route_details: fields.route_details,
        latitude: latitude,
        longitude: longitude,
        status: 'STOPPED',
        created_at: new Date().toISOString()
      };

      // Save bus to Firebase Realtime Database
      await set(newBusRef, busData);

      console.log('Bus saved to Firebase:', busData);

      toast('Bus Submitted Successfully!', 'success');

      form.reset();
      formWrap.style.display = 'none';
      hero.style.display = 'flex';

    } catch (err) {
      console.error('Firebase Add Bus Error:', err);
      toast(
        err.message || 'Failed to save bus.',
        'error'
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'SUBMIT BUS';
    }
  });
}

/* ---------------- Page: Live Bus ---------------- */
let watchId = null;         // navigator.geolocation.watchPosition id
let trackingBusId = null;   // currently tracked bus id
let liveMap = null, liveMarker = null;
let mapModalBusId = null;
let mapAutoRefreshTimer = null;

async function initLiveBusPage() {
  if (!requireAuthOrRedirect()) return;
  await loadBuses();
}

async function loadBuses() {
  const grid = document.getElementById('bus-grid');
  const loader = document.getElementById('bus-loader');
  const empty = document.getElementById('bus-empty');

  if (!grid || !loader || !empty) return;

  loader.style.display = 'block';
  grid.innerHTML = '';
  empty.style.display = 'none';

  try {
    const busesRef = ref(db, 'buses');

    const snapshot = await new Promise((resolve, reject) => {
      onValue(
        busesRef,
        resolve,
        { onlyOnce: true }
      );
    });

    loader.style.display = 'none';

    if (!snapshot.exists()) {
      empty.style.display = 'block';
      return;
    }

    const busesData = snapshot.val();

    const buses = Object.entries(busesData).map(([key, bus]) => ({
      ...bus,
      id: bus.id || key
    }));

    if (buses.length === 0) {
      empty.style.display = 'block';
      return;
    }

    grid.innerHTML = buses.map(renderBusCard).join('');

    buses.forEach(attachBusCardHandlers);

  } catch (err) {
    loader.style.display = 'none';

    console.error('Firebase Load Buses Error:', err);

    toast(
      err.message || 'Failed to load buses from Firebase.',
      'error'
    );
  }
}

function renderBusCard(bus) {
  const statusLower = bus.status;
  const isStopped = bus.status === 'STOPPED';
  const isLive = bus.status === 'LIVE';
  const isCompleted = bus.status === 'COMPLETED';

  const currentUser = Auth.getUser();
  const isOwner = !!currentUser && bus.ownerId === currentUser.id;

  const ownerControls = isOwner ? `
    <div class="inline-edit" style="display:none;" id="edit-wrap-${bus.id}">
      <input type="text" id="edit-input-${bus.id}" value="${escapeHtml(bus.bus_name)}" />
      <button class="btn btn-primary btn-sm save-name-btn" data-id="${bus.id}">SAVE</button>
    </div>

    <div class="bus-card-actions owner-controls">
      <button class="btn btn-outline btn-sm change-name-btn" data-id="${bus.id}">CHANGE NAME</button>
      <button class="btn btn-accent btn-sm start-journey-btn" data-id="${bus.id}" ${isStopped ? '' : 'style="display:none;"'}>START JOURNEY</button>
      <button class="btn btn-danger btn-sm stop-journey-btn" data-id="${bus.id}" ${isLive ? '' : 'style="display:none;"'}>STOP JOURNEY</button>
      ${isCompleted ? `<button class="btn btn-accent btn-sm start-journey-btn" data-id="${bus.id}">START JOURNEY</button>` : ''}
      <button class="btn btn-danger btn-sm delete-bus-btn" data-id="${bus.id}">DELETE BUS</button>
    </div>
  ` : '';

  return `
    <div class="card bus-card ${isOwner ? 'bus-owner-card' : 'bus-viewer-card'}" data-bus-id="${bus.id}">
      <div class="bus-card-header">
        <div class="bus-card-title">
          <span class="emoji">🚌</span>
          <div>
            <h3 class="bus-name-display">${escapeHtml(bus.bus_name)}</h3>
            <div class="bus-number">${escapeHtml(bus.bus_number)}</div>
          </div>
        </div>
        <span class="status-badge ${statusLower}">${statusLower}</span>
      </div>

      <div class="bus-card-info">
        <div><span class="label">Driver:</span> ${escapeHtml(bus.driver_name)} (${escapeHtml(bus.driver_phone)})</div>
        <div><span class="label">Route:</span> ${escapeHtml(bus.start_location)} → ${escapeHtml(bus.destination)}</div>
        ${bus.route_details ? `<div><span class="label">Details:</span> ${escapeHtml(bus.route_details)}</div>` : ''}
      </div>

      <div class="bus-card-actions view-location-actions">
        <button class="btn btn-primary btn-sm view-location-btn" data-id="${bus.id}">BUS LIVE LOCATION</button>
      </div>

      ${ownerControls}
    </div>
  `;
}

async function deleteBus(busId) {
  const currentUser = Auth.getUser();
  if (!currentUser) {
    toast('Please log in first.', 'error');
    return;
  }

  try {
    const snapshot = await new Promise((resolve, reject) => {
      onValue(ref(db, `buses/${busId}`), resolve, reject, { onlyOnce: true });
    });

    if (!snapshot.exists()) {
      toast('Bus not found.', 'error');
      return;
    }

    const bus = snapshot.val();

    if (bus.ownerId !== currentUser.id) {
      toast('Only the bus owner can delete this bus.', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this bus?')) return;

    if (watchId !== null && trackingBusId === busId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      trackingBusId = null;
    }

    await set(ref(db, `buses/${busId}`), null);
    toast('Bus Deleted Successfully', 'success');
    await loadBuses();

  } catch (err) {
    console.error('Delete Bus Error:', err);
    toast(err.message || 'Failed to delete bus.', 'error');
  }
}

document.addEventListener('click', (e) => {

  // START JOURNEY
  const startBtn = e.target.closest('.start-journey-btn');

  if (startBtn) {
    const busId = startBtn.dataset.id;

    console.log('START JOURNEY CLICKED:', busId);

    if (busId) {
      startJourney(busId);
    }

    return;
  }

  // DELETE BUS
  const deleteBtn = e.target.closest('.delete-bus-btn');

  if (deleteBtn) {
    const busId = deleteBtn.dataset.id;

    console.log('DELETE BUS CLICKED:', busId);

    if (busId) {
      deleteBus(busId);
    }
  }

});
function attachBusCardHandlers(bus) {
  const id = bus.id;

  // CHANGE NAME
  const changeBtn = document.querySelector(
    `.change-name-btn[data-id="${id}"]`
  );

  const editWrap = document.getElementById(`edit-wrap-${id}`);

  if (changeBtn && editWrap) {
    changeBtn.addEventListener('click', () => {
      editWrap.style.display =
        editWrap.style.display === 'none' ? 'flex' : 'none';
    });
  }

  // SAVE NAME
  const saveBtn = document.querySelector(
    `.save-name-btn[data-id="${id}"]`
  );

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const currentUser = Auth.getUser();

      if (!currentUser || bus.ownerId !== currentUser.id) {
        toast('Only the bus owner can change the bus name.', 'error');
        return;
      }

      const input = document.getElementById(`edit-input-${id}`);
      const newName = input.value.trim();

      if (!newName) {
        toast('Bus name cannot be empty.', 'error');
        return;
      }

      saveBtn.disabled = true;

     try {
  const busRef = ref(db, `buses/${id}`);

  await update(busRef, {
    bus_name: newName
  });
 
       document.querySelector(
    `.bus-card[data-bus-id="${id}"] .bus-name-display`
  ).textContent = newName;

  editWrap.style.display = 'none';

  toast('Bus Name Updated Successfully', 'success');

} catch (err) {
  console.error('Firebase Change Name Error:', err);
  toast(err.message, 'error');

} finally {
  saveBtn.disabled = false;
}
    });
  }

  // VIEW LIVE LOCATION
  const viewBtn = document.querySelector(
    `.view-location-btn[data-id="${id}"]`
  );

  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      openLocationModal(bus);
    });
  }

  // START JOURNEY
 const startBtn = document.querySelector(
  `.start-journey-btn[data-id="${id}"]`
);

  // STOP JOURNEY
  const stopBtn = document.querySelector(
    `.stop-journey-btn[data-id="${id}"]`
  );

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      console.log('STOP JOURNEY CLICKED');
      console.log('BUS ID:', id);

      stopJourney(id);
    });
  }
}


// START JOURNEY
async function startJourney(busId) {
  const currentUser = Auth.getUser();

  if (!currentUser) {
    toast('Please log in first.', 'error');
    return;
  }

  try {
    const snapshot = await new Promise((resolve, reject) => {
      onValue(ref(db, `buses/${busId}`), resolve, reject, { onlyOnce: true });
    });

    if (!snapshot.exists()) {
      toast('Bus not found.', 'error');
      return;
    }

    if (snapshot.val().ownerId !== currentUser.id) {
      toast('Only the bus owner can start this journey.', 'error');
      return;
    }
  } catch (err) {
    console.error('Owner Check Error:', err);
    toast('Unable to verify bus ownership.', 'error');
    return;
  }

  if (!navigator.geolocation) {
    toast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {
        const busRef = ref(db, `buses/${busId}`);

        await update(busRef, {
          status: 'LIVE',
          latitude,
          longitude,
          journey_started_at: new Date().toISOString()
        });

        toast('Journey Started Successfully', 'success');
        trackingBusId = busId;

        if (watchId !== null) navigator.geolocation.clearWatch(watchId);

        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            try {
              await update(busRef, {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                location_updated_at: new Date().toISOString()
              });

              if (mapModalBusId === busId && liveMarker) {
                liveMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
                if (liveMap) liveMap.panTo([pos.coords.latitude, pos.coords.longitude]);
              }
            } catch (err) {
              console.error('Firebase Location Update Error:', err);
            }
          },
          (err) => toast(`Location tracking error: ${err.message}`, 'error'),
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 10000
          }
        );

        await loadBuses();
      } catch (err) {
        console.error('Firebase Start Journey Error:', err);
        toast(err.message || 'Failed to start journey.', 'error');
      }
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        toast('Location permission denied. Please allow location access.', 'error');
      } else {
        toast(`Location Error: ${err.code} - ${err.message}`, 'error');
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 10000
    }
  );
}

// STOP JOURNEY
async function stopJourney(busId) {
  const currentUser = Auth.getUser();

  if (!currentUser) {
    toast('Please log in first.', 'error');
    return;
  }

  try {
    const snapshot = await new Promise((resolve, reject) => {
      onValue(ref(db, `buses/${busId}`), resolve, reject, { onlyOnce: true });
    });

    if (!snapshot.exists()) {
      toast('Bus not found.', 'error');
      return;
    }

    if (snapshot.val().ownerId !== currentUser.id) {
      toast('Only the bus owner can stop this journey.', 'error');
      return;
    }

    await update(ref(db, `buses/${busId}`), {
      status: 'COMPLETED',
      journey_stopped_at: new Date().toISOString()
    });

    if (watchId !== null && trackingBusId === busId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      trackingBusId = null;
    }

    toast('Journey Stopped Successfully — Tracking Stopped', 'success');
    await loadBuses();

  } catch (err) {
    console.error('Firebase Stop Journey Error:', err);
    toast(err.message || 'Failed to stop journey.', 'error');
  }
}

/* ---------------- Full Page Live Location Map ---------------- */

function openLocationModal(bus) {
  mapModalBusId = bus.id;

  const modal = document.getElementById('map-modal');
  if (!modal) return;

  document.getElementById('modal-bus-name').textContent = bus.bus_name;
  document.getElementById('modal-bus-number').textContent = bus.bus_number;

  modal.classList.add('open');
  document.body.classList.add('map-page-open');
  updateMapMeta(bus);

  setTimeout(() => {
    const lat = bus.latitude != null ? Number(bus.latitude) : 20.5937;
    const lng = bus.longitude != null ? Number(bus.longitude) : 78.9629;
    const zoom = bus.latitude != null && bus.longitude != null ? 15 : 5;

    if (!liveMap) {
      liveMap = L.map('map').setView([lat, lng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(liveMap);

      liveMarker = L.marker([lat, lng]).addTo(liveMap);
    } else {
      liveMap.setView([lat, lng], zoom);
      liveMarker.setLatLng([lat, lng]);
    }

    liveMarker
      .bindPopup(`<strong>${escapeHtml(bus.bus_name)}</strong><br>${escapeHtml(bus.bus_number)}`)
      .openPopup();

    liveMap.invalidateSize();
  }, 150);

  if (mapAutoRefreshTimer) clearInterval(mapAutoRefreshTimer);

  mapAutoRefreshTimer = setInterval(async () => {
    if (!mapModalBusId) return;

    try {
      const snapshot = await new Promise((resolve, reject) => {
        onValue(ref(db, `buses/${mapModalBusId}`), resolve, reject, { onlyOnce: true });
      });

      if (!snapshot.exists()) return;

      const latestBus = snapshot.val();
      updateMapMeta(latestBus);

      if (liveMarker && latestBus.latitude != null && latestBus.longitude != null) {
        const lat = Number(latestBus.latitude);
        const lng = Number(latestBus.longitude);

        liveMarker.setLatLng([lat, lng]);
        if (liveMap) liveMap.panTo([lat, lng]);
      }
    } catch (err) {
      console.error('Firebase Live Location Error:', err);
    }
  }, 5000);
}

function updateMapMeta(bus) {
  const lat = document.getElementById('modal-lat');
  const lng = document.getElementById('modal-lng');
  const updated = document.getElementById('modal-updated');

  if (lat) lat.textContent = bus.latitude != null ? Number(bus.latitude).toFixed(6) : '—';
  if (lng) lng.textContent = bus.longitude != null ? Number(bus.longitude).toFixed(6) : '—';
  if (updated) updated.textContent = new Date().toLocaleTimeString();
}

function closeLocationModal() {
  const modal = document.getElementById('map-modal');
  if (modal) modal.classList.remove('open');

  document.body.classList.remove('map-page-open');
  mapModalBusId = null;

  if (mapAutoRefreshTimer) {
    clearInterval(mapAutoRefreshTimer);
    mapAutoRefreshTimer = null;
  }
}

/* ---------------- Bootstrapping ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  renderSidebar(page);

  if (page === 'home') initHomePage();
  if (page === 'login') initLoginPage();
  if (page === 'add-bus') initAddBusPage();
  if (page === 'live-bus') initLiveBusPage();

  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeLocationModal);
  const modalOverlay = document.getElementById('map-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeLocationModal();
    });
  }
});
