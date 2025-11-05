// ✅ G-Tracker (Server-enabled version for XAMPP)
// Folder: gtracker

const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewSection = document.getElementById('previewSection');
const imagePreview = document.getElementById('imagePreview');
const locationInfo = document.getElementById('locationInfo');
const mapLinkContainer = document.getElementById('mapLinkContainer');
const statusMessage = document.getElementById('statusMessage');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
const viewHistoryBtn = document.getElementById('viewHistoryBtn');
const historyModal = document.getElementById('historyModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const historyContainer = document.getElementById('historyContainer');

let currentImage = null;
let currentLocation = null;

// ✅ Helper functions
function showStatus(message, type) {
  statusMessage.innerHTML = `
    <div class="status ${type}">
      ${type === 'loading' ? '<div class="spinner"></div>' : ''}
      ${message}
    </div>
  `;
}

function convertDMSToDD(degrees, minutes, seconds, direction) {
  let dd = degrees + minutes / 60 + seconds / (60 * 60);
  if (direction === "S" || direction === "W") dd = dd * -1;
  return dd;
}

function formatCoordinate(value, isLat) {
  const direction = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${Math.abs(value).toFixed(6)}° ${direction}`;
}

function displayLocation(lat, lon, source) {
  const sourceText = source === 'gps' ? 'from image GPS data' : 'from current device location';
  locationInfo.innerHTML = `
    <strong>Latitude:</strong> ${formatCoordinate(lat, true)}<br>
    <strong>Longitude:</strong> ${formatCoordinate(lon, false)}<br>
    <span style="color: #999; font-size: 12px;">Location obtained ${sourceText}</span>
  `;
  mapLinkContainer.innerHTML = `
    <a href="https://maps.google.com/?q=${lat},${lon}" target="_blank" class="map-link">
      🗺️ View on Google Maps
    </a>
  `;
  currentLocation = { latitude: lat, longitude: lon };
  showStatus('Location successfully extracted!', 'success');
}

// ✅ Handle image and EXIF data
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showStatus('Please select a valid image file', 'error');
    return;
  }

  showStatus('Processing image...', 'loading');
  const reader = new FileReader();

  reader.onload = function (e) {
    currentImage = e.target.result;
    imagePreview.src = currentImage;
    previewSection.classList.add('active');
  };

  reader.readAsDataURL(file);

  EXIF.getData(file, function () {
    const latArr = EXIF.getTag(this, "GPSLatitude");
    const lonArr = EXIF.getTag(this, "GPSLongitude");
    const latRef = EXIF.getTag(this, "GPSLatitudeRef");
    const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

    if (latArr && lonArr && latRef && lonRef) {
      const lat = convertDMSToDD(latArr[0], latArr[1], latArr[2], latRef);
      const lon = convertDMSToDD(lonArr[0], lonArr[1], lonArr[2], lonRef);
      displayLocation(lat, lon, 'gps');
    } else {
      showStatus('No GPS in image — requesting device location...', 'loading');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => displayLocation(pos.coords.latitude, pos.coords.longitude, 'device'),
          () => {
            showStatus('Unable to get location. Please enable GPS.', 'error');
            locationInfo.innerHTML = 'Location unavailable.';
          }
        );
      } else {
        showStatus('Geolocation not supported.', 'error');
        locationInfo.innerHTML = 'Geolocation not supported by this browser.';
      }
    }
  });
}

// ✅ Upload area events
uploadArea.addEventListener('click', () => imageInput.click());
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
imageInput.addEventListener('change', function () {
  const file = this.files[0];
  if (file) handleFile(file);
});

// ✅ Reset form
resetBtn.addEventListener('click', () => {
  imageInput.value = '';
  previewSection.classList.remove('active');
  statusMessage.innerHTML = '';
  locationInfo.innerHTML = '';
  mapLinkContainer.innerHTML = '';
  currentImage = null;
  currentLocation = null;
});

// ✅ Save record to server (PHP)
saveBtn.addEventListener('click', async () => {
  if (!currentImage || !currentLocation) {
    showStatus('Please upload an image with location first', 'error');
    return;
  }

  try {
    showStatus('Saving record to server...', 'loading');
    const blob = await (await fetch(currentImage)).blob();
    const formData = new FormData();
    formData.append('image', blob, `garbage_${Date.now()}.jpg`);
    formData.append('latitude', currentLocation.latitude);
    formData.append('longitude', currentLocation.longitude);

    const response = await fetch('http://localhost/gtracker/save_record.php', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (result.status === 'success') {
      showStatus('Record saved successfully!', 'success');
      setTimeout(() => resetBtn.click(), 1500);
    } else {
      showStatus(result.message || 'Server error while saving', 'error');
    }
  } catch (error) {
    console.error(error);
    showStatus('Error connecting to server. Check XAMPP is running.', 'error');
  }
});

// ✅ Load history from server
viewHistoryBtn.addEventListener('click', async () => {
  historyModal.classList.add('active');
  await loadHistory();
});

closeModalBtn.addEventListener('click', () => historyModal.classList.remove('active'));
historyModal.addEventListener('click', (e) => {
  if (e.target === historyModal) historyModal.classList.remove('active');
});

async function loadHistory() {
  historyContainer.innerHTML = '<p style="padding:20px">Loading records...</p>';
  try {
    const response = await fetch('http://localhost/gtracker/get_records.php');
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      historyContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No records yet</h3>
          <p>Upload your first garbage picture to start tracking!</p>
        </div>`;
      return;
    }

    historyContainer.innerHTML = `
      <div class="history-grid">
        ${data.map(record => `
          <div class="history-item">
            <img src="${record.image_path}" class="history-image" />
            <div class="history-details">
              <div class="history-date">${record.created_at}</div>
              <div class="history-location">📍 ${formatCoordinate(record.latitude, true)}, ${formatCoordinate(record.longitude, false)}</div>
              <a href="https://maps.google.com/?q=${record.latitude},${record.longitude}" target="_blank" class="history-map-link">🗺️ View Map</a>
              <button class="delete-btn" data-id="${record.id}">🗑️ Delete</button>
            </div>
          </div>`).join('')}
      </div>
    `;

    // Delete handlers
    historyContainer.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Delete this record?')) return;

        const delResp = await fetch('http://localhost/gtracker/delete_record.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `id=${encodeURIComponent(id)}`
        });

        const delResult = await delResp.json();
        if (delResult.status === 'success') {
          btn.closest('.history-item').remove();
        } else {
          alert('Failed to delete record.');
        }
      });
    });
  } catch (error) {
    console.error(error);
    historyContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Error loading history</h3>
        <p>Check if XAMPP Apache/MySQL are running.</p>
      </div>`;
  }
}
