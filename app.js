let config = {};
let state = [];
let selectedCell = null;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

function setTextById(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

const makeLogo = (text) => {
  const safeText = escapeHtml(text);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="260" height="90">
      <rect width="100%" height="100%" rx="18" fill="#e5e7eb"/>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="24" font-weight="800" fill="#111827">
        ${safeText}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const makePhoto = (text) => {
  const safeText = escapeHtml(text);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
      <rect width="100%" height="100%" fill="#1e293b"/>
      <circle cx="200" cy="170" r="80" fill="#3b82f6"/>
      <rect x="95" y="285" width="210" height="130" rx="65" fill="#334155"/>
      <text x="50%" y="88%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="28" font-weight="800" fill="#f8fafc">
        ${safeText}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const fallbackConfig = {
  columns: 7,
  rows: 12,
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

  setTextById('lastSaved', 'Modo GitHub/local: datos guardados en el navegador');
}

function fillSelectors() {
  const clientSelect = document.getElementById('clientSelect');
  const columnSelect = document.getElementById('columnSelect');
  const statusSelect = document.getElementById('statusSelect');
  const modalClientSelect = document.getElementById('modalClientSelect');
  const modalStatusSelect = document.getElementById('modalStatusSelect');
  const modalLeaderSelect = document.getElementById('modalLeaderSelect');

  if (clientSelect) {
    clientSelect.innerHTML =
      `<option value="">Selecciona cliente</option>` +
      config.clients
        .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`)
        .join('');
  }

  if (columnSelect) {
    columnSelect.innerHTML =
      Array.from({ length: config.columns }, (_, i) => {
        const n = String(i + 1).padStart(2, '0');
        return `<option value="${i}">Columna ${n}</option>`;
      }).join('');
  }

  if (statusSelect) {
    statusSelect.innerHTML =
      config.statusOptions
        .map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
        .join('');
  }

  if (modalClientSelect) {
    modalClientSelect.innerHTML =
      `<option value="">Sin asignar</option>` +
      config.clients
        .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`)
        .join('');
  }

  if (modalStatusSelect) {
    modalStatusSelect.innerHTML =
      config.statusOptions
        .map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
        .join('');
  }

  if (modalLeaderSelect) {
    modalLeaderSelect.innerHTML =
      `<option value="">Sin responsable</option>` +
      config.leaders
        .map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`)
        .join('');
  }
}

function getClientById(id) {
  return config.clients.find(c => c.id === id);
}

function getLeaderById(id) {
  return config.leaders.find(l => l.id === id);
}

function isColumnOccupied(colIndex) {
  return Array.isArray(state[colIndex]) && state[colIndex].some(cell => cell.clientId);
}

function assignClient() {
  const clientSelect = document.getElementById('clientSelect');
  const statusSelect = document.getElementById('statusSelect');
  const columnSelect = document.getElementById('columnSelect');
  const fullColumnMode = document.getElementById('fullColumnMode');

  if (!clientSelect || !statusSelect || !columnSelect) {
    setStatus('Faltan controles HTML para asignar cliente.');
    return;
  }

  const clientId = clientSelect.value;
  const status = statusSelect.value || 'PENDIENTE';
  const colIndex = Number(columnSelect.value);
  const fullColumn = fullColumnMode ? fullColumnMode.checked : false;

  if (!clientId) {
    setStatus('Selecciona un cliente.');
    return;
  }

  if (!Number.isInteger(colIndex) || colIndex < 0 || colIndex >= config.columns) {
    setStatus('Selecciona una columna válida.');
    return;
  }

  if (fullColumn) {
    if (isColumnOccupied(colIndex)) {
      const ok = confirm('La columna ya contiene datos. ¿Deseas reemplazarla completa?');
      if (!ok) return;
    }

    for (let r = 0; r < config.rows; r++) {
      state[colIndex][r] = { clientId, status, leaderId: '' };
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

  state[colIndex][rowIndex] = { clientId, status, leaderId: '' };

  render();
  init3DEffects();

  setStatus(
    `Asignación realizada en columna ${String(colIndex + 1).padStart(2, '0')}, posición ${String(rowIndex + 1).padStart(2, '0')}.`
  );
}

function statusClass(status) {
  if (status === 'PICKING') return 'picking';
  if (status === 'ARMADO') return 'armado';
  if (status === 'PENDIENTE') return 'pendiente';
  if (status === 'REALIZADO') return 'realizado';
  return 'empty';
}

function renderMetrics() {
  const container = document.getElementById('metrics');
  if (!container) return;

  const cells = state.flat();

  const total = config.rows * config.columns;
  const occupied = cells.filter(cell => cell.clientId).length;
  const available = total - occupied;

  const picking = cells.filter(cell => cell.clientId && cell.status === 'PICKING').length;
  const armado = cells.filter
