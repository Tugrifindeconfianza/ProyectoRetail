let config = {};
let state = [];
let selectedCell = null;

/* ---- Filas variables por columna (0-indexed) ----
   Col 1-6 = 12 filas | Col 7 = 7 | Col 8 = 12 | Col 9-14 = 11 */
const COLUMN_ROWS = [12, 12, 12, 12, 12, 12, 7, 12, 11, 11, 11, 11, 11, 11];

function rowsForColumn(c) {
  return COLUMN_ROWS[c] ?? (config.rows || 12);
}
function totalPositions() {
  let t = 0;
  for (let c = 0; c < config.columns; c++) t += rowsForColumn(c);
  return t;
}

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
      <rect width="100%" height="100%" fill="#021D49"/>
      <circle cx="200" cy="170" r="80" fill="#FF0000"/>
      <rect x="95" y="285" width="210" height="130" rx="65" fill="#032566"/>
      <text x="50%" y="88%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="28" font-weight="800" fill="#f8fafc">
        ${text}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const fallbackConfig = {
  columns: 14,
  rows: 12,
  statusOptions: ['PENDIENTE', 'EN PROGRESO', 'DESPACHADO'],
  clients: [
    { id: 'cliente-1', name: 'Cliente 1', logo: makeLogo('Cliente 1') },
    { id: 'cliente-2', name: 'Cliente 2', logo: makeLogo('Cliente 2') },
    { id: 'cliente-3', name: 'Cliente 3', logo: makeLogo('Cliente 3') }
  ],
  leaders: [
    { name: 'Responsable 1', photo: makePhoto('R1') },
    { name: 'Responsable 2', photo: makePhoto('R2') },
    { name: 'Responsable 3', photo: makePhoto('R3') }
  ]
};

function hasAppsScript() {
  return typeof google !== 'undefined' && google.script && google.script.run;
}

function normalizeConfig(cfg = {}) {
  return {
    columns: cfg.columns || fallbackConfig.columns,
    rows: cfg.rows || fallbackConfig.rows,
    statusOptions: Array.isArray(cfg.statusOptions) ? cfg.statusOptions : fallbackConfig.statusOptions,
    clients: Array.isArray(cfg.clients) ? cfg.clients : fallbackConfig.clients,
    leaders: Array.isArray(cfg.leaders) ? cfg.leaders : fallbackConfig.leaders
  };
}

function buildEmptyState() {
  return Array.from({ length: config.columns }, (_, c) =>
    Array.from({ length: rowsForColumn(c) }, () => ({
      clientId: '',
      status: 'PENDIENTE'
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
    return Array.from({ length: rowsForColumn(c) }, (_, r) => {
      const cell = col[r] || {};
      return {
        clientId: cell.clientId || '',
        status: config.statusOptions.includes(cell.status) ? cell.status : 'PENDIENTE'
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

  document.getElementById('lastSaved').textContent = "";
}

function fillSelectors() {
  document.getElementById('clientSelect').innerHTML =
    config.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

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

    const rows = rowsForColumn(colIndex);
    for (let r = 0; r < rows; r++) {
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
  const total = totalPositions();
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
      <div class="metric-sub">${total ? Math.round((occupied / total) * 100) : 0}% de ocupación</div>
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
    const rows = rowsForColumn(c);
    const used = state[c].filter(cell => cell.clientId).length;
    const progress = rows ? Math.round((used / rows) * 100) : 0;

    const col = document.createElement('div');
    col.className = 'column';

    const
