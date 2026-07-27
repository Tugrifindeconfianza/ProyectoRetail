let config = {};
let state = [];
let selectedCell = null;

const makeLogo = (text) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="260" height="90">
      <rect width="100%" height="100%" rx="18" fill="#e5e7eb"/>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="24" font-weight="800" fill="#111827">
        ${text}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const makePhoto = (text) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
      <rect width="100%" height="100%" fill="#1e293b"/>
      <circle cx="200" cy="170" r="80" fill="#3b82f6"/>
      <rect x="95" y="285" width="210" height="130" rx="65" fill="#334155"/>
      <text x="50%" y="88%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="28" font-weight="800" fill="#f8fafc">
        ${text}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const fallbackConfig = {
  columns: 7,
  rows: 5,
  statusOptions: ['PICKING', 'ARMADO', 'PENDIENTE', 'REALIZADO'],
  clients: [
    { id: 'Cliente-1', name: 'PROMART', logo: makeLogo('PROMART') },
    { id: 'Cliente-2', name: 'SODIMAC', logo: makeLogo('SODIMAC') },
    { id: 'Cliente-3', name: 'TOTTUS', logo: makeLogo('TOTTUS') },
    { id: 'Cliente-4', name: 'CENCOSUD', logo: makeLogo('CENCOSUD') },
    { id: 'Cliente-5', name: 'SSPP', logo: makeLogo('SSPP') },
    { id: 'Cliente-6', name: 'MAYORSA', logo: makeLogo('MAYORSA') },
    { id: 'Cliente-7', name: 'CORP. VEGA', logo: makeLogo('CORP. VEGA') }
  ],
  leaders: [
  { id: 'R1', name: 'WILLIAM VALDIVIA', photo: makePhoto('R1') },
  { id: 'R2', name: 'MIGUEL BUSTAMANTE', photo: makePhoto('R2') },
  { id: 'R3', name: 'JOHAN LUYO', photo: makePhoto('R3') }
]
};

function hasAppsScript() {
  return typeof google !== 'undefined' &&
    google.script &&
    google.script.run;
}

function normalizeConfig(cfg = {}) {
  return {
    columns: cfg.columns || fallbackConfig.columns,
    rows: cfg.rows || fallbackConfig.rows,
    statusOptions: Array.isArray(cfg.statusOptions) && cfg.statusOptions.length
      ? cfg.statusOptions
      : fallbackConfig.statusOptions,
    clients: Array.isArray(cfg.clients) && cfg.clients.length
      ? cfg.clients
      : fallbackConfig.clients,
    leaders: Array.isArray(cfg.leaders) && cfg.leaders.length
      ? cfg.leaders
      : fallbackConfig.leaders
  };
}

function buildEmptyState() {
  return Array.from({ length: config.columns }, () =>
    Array.from({ length: config.rows }, () => ({
      clientId: '',
      status: 'PENDIENTE',
      leaderId: ''
    }))
  );
}

function normalizeState(saved) {
  const empty = buildEmptyState();

  if (!Array.isArray(saved) || saved.length !== config.columns) {
    return empty;
  }

  return Array.from({ length: config.columns }, (_, c) => {
    const col = Array.isArray(saved[c]) ? saved[c] : [];

    return Array.from({ length: config.rows }, (_, r) => {
      const cell = col[r] || {};

      return {
  clientId: cell.clientId || '',
  status: config.statusOptions.includes(cell.status) ? cell.status : 'PENDIENTE',
  leaderId: cell.leaderId || ''
      };
    });
  });
}

function loadApp() {
  if (hasAppsScript()) {
    google.script.run.withSuccessHandler(cfg => {
      config = normalizeConfig(cfg);
      fillSelectors();
      renderLeaders();

      google.script.run.withSuccessHandler(saved => {
        state = normalizeState(saved);
        render();
        init3DEffects();
      }).getLayoutData();
    }).getConfig();

    return;
  }

  config = normalizeConfig();

  fillSelectors();
  renderLeaders();

  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem('layoutData'));
  } catch (error) {
    saved = null;
  }

  state = normalizeState(saved);
  render();
  init3DEffects();

  document.getElementById('lastSaved').textContent = 'Modo GitHub/local: datos guardados en el navegador';
}

function fillSelectors() {
  document.getElementById('modalLeaderSelect').innerHTML =
  `<option value="">Sin responsable</option>` +
  config.leaders.map(l => `<option value="${l.id}">${l.name}</option>`).join('');

  document.getElementById('columnSelect').innerHTML =
    Array.from({ length: config.columns }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return `<option value="${i}">Columna ${n}</option>`;
    }).join('');

  document.getElementById('statusSelect').innerHTML =
    config.statusOptions.map(s => `<option value="${s}">${s}</option>`).join('');

  document.getElementById('modalClientSelect').innerHTML =
    `<option value="">Sin asignar</option>` +
    config.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  document.getElementById('modalStatusSelect').innerHTML =
    config.statusOptions.map(s => `<option value="${s}">${s}</option>`).join('');
}

function getClientById(id) {
  return config.clients.find(c => c.id === id);
}

function isColumnOccupied(colIndex) {
  return state[colIndex].some(cell => cell.clientId);
}

function assignClient() {
  const clientId = document.getElementById('clientSelect').value;
  const status = document.getElementById('statusSelect').value;
  const colIndex = Number(document.getElementById('columnSelect').value);
  const fullColumn = document.getElementById('fullColumnMode').checked;

  if (!clientId) {
    setStatus('Selecciona un cliente.');
    return;
  }

  if (fullColumn) {
    if (isColumnOccupied(colIndex)) {
      const ok = confirm('La columna ya contiene datos. ¿Deseas reemplazarla completa?');
      if (!ok) return;
    }

    for (let r = 0; r < config.rows; r++) {
      state[colIndex][r] = { clientId, status };
    }

    render();
    init3DEffects();
    setStatus(`Columna ${String(colIndex + 1).padStart(2, '0')} actualizada completamente.`);
    return;
  }

  const rowIndex = state[colIndex].findIndex(cell => !cell.clientId);

  if (rowIndex === -1) {
    setStatus('La columna seleccionada ya está completa.');
    return;
  }

  state[colIndex][rowIndex] = { clientId, status };
  render();
  init3DEffects();

  setStatus(
    `Asignación realizada en columna ${String(colIndex + 1).padStart(2, '0')}, posición ${String(rowIndex + 1).padStart(2, '0')}.`
  );
}

function statusClass(status) {
  if (status === 'PENDIENTE') return 'pending';
  if (status === 'EN PROGRESO') return 'progress';
  if (status === 'DESPACHADO') return 'shipped';
  return 'empty';
}

function renderMetrics() {
  const total = config.rows * config.columns;
  const occupied = state.flat().filter(c => c.clientId).length;
  const available = total - occupied;
  const shipped = state.flat().filter(c => c.clientId && c.status === 'DESPACHADO').length;

  document.getElementById('metrics').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">TOTAL POSICIONES</div>
      <div class="metric-value">${total}</div>
      <div class="metric-sub">Capacidad total del layout</div>
    </div>

    <div class="metric-card">
      <div class="metric-label">OCUPADAS</div>
      <div class="metric-value">${occupied}</div>
      <div class="metric-sub">${Math.round((occupied / total) * 100)}% de ocupación</div>
    </div>

    <div class="metric-card">
      <div class="metric-label">DISPONIBLES</div>
      <div class="metric-value">${available}</div>
      <div class="metric-sub">Espacios libres para asignación</div>
    </div>

    <div class="metric-card">
      <div class="metric-label">DESPACHADAS</div>
      <div class="metric-value">${shipped}</div>
      <div class="metric-sub">Posiciones cerradas o listas</div>
    </div>
  `;
}

function render() {
  renderMetrics();

  const container = document.getElementById('layout');
  container.innerHTML = '';

  for (let c = 0; c < config.columns; c++) {
    const used = state[c].filter(cell => cell.clientId).length;
    const progress = Math.round((used / config.rows) * 100);

    const col = document.createElement('div');
    col.className = 'column';

    const header = document.createElement('div');
    header.className = 'column-header';
    header.innerHTML = `
      <div class="column-top">
        <div class="column-number">${String(c + 1).padStart(2, '0')}</div>
        <div class="column-count">${used}/${config.rows}</div>
      </div>

      <div class="progress-track">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
    `;

    col.appendChild(header);

    for (let r = 0; r < config.rows; r++) {
      const cellData = state[c][r];
      const cell = document.createElement('div');
      const cellStatusClass = cellData.clientId ? statusClass(cellData.status) : 'empty';

      cell.className = `cell ${cellData.clientId ? '' : 'empty'} ${cellStatusClass}`;

      if (cellData.clientId) {
        const client = getClientById(cellData.clientId) || {
          name: 'Cliente no encontrado',
          logo: makeLogo('N/A')
        };

        cell.innerHTML = `
          <div class="badge-row">
            <span class="badge ${statusClass(cellData.status)}">${cellData.status}</span>
            <span class="slot-id">${String(r + 1).padStart(2, '0')}</span>
          </div>

          <div class="logo-wrap">
            <img class="logo" src="${client.logo}" alt="${client.name}">
          </div>
          <div class="retail-owner">
  ${getLeaderById(cellData.leaderId)?.name || 'Sin responsable'}
</div>

        `;
      } else {
        cell.innerHTML = `
          <div class="badge-row">
            <span class="badge empty">DISPONIBLE</span>
            <span class="slot-id">${String(r + 1).padStart(2, '0')}</span>
          </div>

          <div class="logo-wrap">
            <div class="empty-text">Sin asignación</div>
          </div>

          <div class="client-name" style="color:#64748b">-</div>
        `;
      }

      cell.onclick = () => openModal(c, r);
      col.appendChild(cell);
    }

    container.appendChild(col);
  }
}

function openModal(c, r) {
  selectedCell = { c, r };
  const cell = state[c][r];

  document.getElementById('modalPosition').textContent =
    `Columna ${String(c + 1).padStart(2, '0')} · Posición ${String(r + 1).padStart(2, '0')}`;

  document.getElementById('modalClientSelect').value = cell.clientId || '';
  document.getElementById('modalStatusSelect').value = cell.status || 'PENDIENTE';
  document.getElementById('modalLeaderSelect').value = cell.leaderId || '';

  document.getElementById('modalBackdrop').classList.add('show');
}

function closeModal() {
  selectedCell = null;
  document.getElementById('modalBackdrop').classList.remove('show');
}

function backdropClose(event) {
  if (event.target.id === 'modalBackdrop') {
    closeModal();
  }
}

function saveCellFromModal() {
  if (!selectedCell) return;

  const clientId = document.getElementById('modalClientSelect').value;
  const status = document.getElementById('modalStatusSelect').value;
  const leaderId = document.getElementById('modalLeaderSelect').value;

  const { c, r } = selectedCell;

  if (!clientId) {
    state[c][r] = { clientId: '', status: 'PENDIENTE', leaderId: '' };
  } else {
    state[c][r] = { clientId, status, leaderId };
  }

  closeModal();
  render();
  init3DEffects();
  setStatus('Posición actualizada correctamente.');
}

function removeCellFromModal() {
  if (!selectedCell) return;

  const { c, r } = selectedCell;

  state[c][r] = { clientId: '', status: 'PENDIENTE' };

  closeModal();
  render();
  init3DEffects();
  setStatus('Posición liberada.');
}

function init3DEffects() {
  document.querySelectorAll('.column').forEach(col => {
    col.onmousemove = e => {
      const rect = col.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rotateX = 10 + ((rect.height / 2 - y) / rect.height) * 10;
      const rotateY = -6 + ((x - rect.width / 2) / rect.width) * 12;

      col.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    };

    col.onmouseleave = () => {
      col.style.transform = 'rotateX(10deg) rotateY(-6deg)';
    };
  });
}

function saveLayout() {
  if (hasAppsScript()) {
    google.script.run.withSuccessHandler(() => {
      const now = new Date().toLocaleString('es-PE');
      document.getElementById('lastSaved').textContent = `Último guardado: ${now}`;
      setStatus('Layout guardado correctamente.');
    }).saveLayoutData(state);

    return;
  }

  localStorage.setItem('layoutData', JSON.stringify(state));

  const now = new Date().toLocaleString('es-PE');
  setStatus(`Último guardado: ${now}`);
  }

function resetLayout() {
  const ok = confirm('¿Deseas limpiar todo el layout?');

  if (!ok) return;

  state = buildEmptyState();

  render();
  init3DEffects();
  setStatus('Layout reiniciado.');
}

function setStatus(text) {
  document.getElementById('status').textContent = text;

  setTimeout(() => {
    document.getElementById('status').textContent = '';
  }, 3200);
}

function renderLeaders() {
  const container = document.getElementById('leaders');

  if (!container || !config.leaders) return;

  container.innerHTML = config.leaders.map((person, i) => `
    <div class="leader-card">
      <div class="leader-photo-wrap">
        <img class="leader-photo" src="${person.photo}" alt="${person.name}">
      </div>

      <div class="leader-info">
        <div class="leader-name">${person.name}</div>
        <div class="leader-tag">RESPONSABLE ${String(i + 1).padStart(2, '0')}</div>
      </div>
    </div>
  `).join('');
}

function getLeaderById(id) {
  return config.leaders.find(l => l.id === id);
}

loadApp();
