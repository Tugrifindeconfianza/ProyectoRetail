(() => {
  "use strict";

  const STORAGE_KEY = "tablero_14_columnas_v1";

  const CLIENTES = [
    "PROMART",
    "SODIMAC",
    "CENCOSUD",
    "MAYORSA",
    "CORP. VEGA",
    "TOTTUS",
    "SSPP"
  ];

  const ESTADOS = [
    "ARMADO",
    "ETIQUETADO",
    "AUDITORIA",
    "REALIZADO"
  ];

  const COLUMNS = Array.from({ length: 14 }, (_, index) => {
    const number = index + 1;

    return {
      number,
      header: number <= 4 ? "ARMADO" : "DESPACHO",
      rows: getRowsByColumn(number)
    };
  });

  let boardState = {};
  let activeCell = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    injectDynamicStyles();
    ensureBoardContainer();
    ensureModal();

    boardState = loadBoard();

    populateAllSelects();
    renderLegend();
    renderBoard();
    bindEvents();

    setStatus(`Tablero listo con ${getTotalSlots()} posiciones.`);
  }

  function getRowsByColumn(column) {
    if (column >= 1 && column <= 6) return 12;
    if (column === 7) return 7;
    if (column === 8) return 12;
    return 11;
  }

  function getTotalSlots() {
    return COLUMNS.reduce((total, column) => total + column.rows, 0);
  }

  function getKey(column, row) {
    return `${column}-${row}`;
  }

  function isValidPosition(column, row) {
    const foundColumn = COLUMNS.find((item) => item.number === Number(column));
    return Boolean(foundColumn && row >= 1 && row <= foundColumn.rows);
  }

  function cssClass(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "&#039;");
  }

  function getInitials(client) {
    return String(client)
      .replace(/\./g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }

  function ensureBoardContainer() {
    let layout = document.querySelector(".layout");

    if (layout) return layout;

    let scene = document.querySelector(".scene");

    if (!scene) {
      scene = document.createElement("div");
      scene.className = "scene";

      const shell = document.querySelector(".dashboard-shell") || document.body;
      shell.appendChild(scene);
    }

    layout = document.createElement("div");
    layout.className = "layout";
    scene.appendChild(layout);

    return layout;
  }

  function renderBoard() {
    const layout = document.querySelector(".layout");
    if (!layout) return;

    layout.innerHTML = COLUMNS.map(renderColumn).join("");

    updateMetrics();
  }

  function renderColumn(column) {
    const occupied = countOccupiedByColumn(column.number);
    const percent = Math.round((occupied / column.rows) * 100);

    const cells = Array.from({ length: column.rows }, (_, index) => {
      return renderCell(column.number, index + 1);
    }).join("");

    return `
      <section class="column" data-column="${column.number}" data-type="${column.header}">
        <div class="column-header">
          <div class="column-top">
            <div>
              <div class="column-section">${column.header}</div>
              <div class="column-number">Columna ${column.number}</div>
            </div>

            <div class="column-count">${column.rows} filas</div>
          </div>

          <div class="progress-track">
            <div class="progress-fill" style="width: ${percent}%"></div>
          </div>
        </div>

        ${cells}
      </section>
    `;
  }

  function renderCell(column, row) {
    const data = boardState[getKey(column, row)];
    const isFilled = Boolean(data);

    const client = isFilled ? data.client : "Sin cliente";
    const status = isFilled ? data.status : "VACÍO";
    const statusClass = isFilled ? cssClass(status) : "empty";

    return `
      <div 
        class="cell ${isFilled ? statusClass : "empty"}" 
        data-column="${column}" 
        data-row="${row}"
        role="button"
        tabindex="0"
        aria-label="Columna ${column}, fila ${row}"
      >
        <div class="badge-row">
          <span class="badge ${statusClass}">${escapeHtml(status)}</span>
          <span class="slot-id">C${column}-F${row}</span>
        </div>

        <div class="logo-wrap">
          ${
            isFilled
              ? `<div class="client-initials">${escapeHtml(getInitials(client))}</div>`
              : `<span class="empty-text">Disponible</span>`
          }
        </div>

        <div class="client-name">${escapeHtml(client)}</div>
      </div>
    `;
  }

  function countOccupiedByColumn(column) {
    const columnConfig = COLUMNS.find((item) => item.number === Number(column));
    if (!columnConfig) return 0;

    let total = 0;

    for (let row = 1; row <= columnConfig.rows; row++) {
      if (boardState[getKey(column, row)]) total++;
    }

    return total;
  }

  function assignCell(column, row, client, status) {
    column = Number(column);
    row = Number(row);

    if (!isValidPosition(column, row)) {
      setStatus("Selecciona una columna y fila válidas.");
      return;
    }

    if (!CLIENTES.includes(client)) {
      setStatus("Selecciona un cliente válido.");
      return;
    }

    if (!ESTADOS.includes(status)) {
      setStatus("Selecciona un estado válido.");
      return;
    }

    boardState[getKey(column, row)] = {
      client,
      status,
      updatedAt: new Date().toISOString()
    };

    saveBoard();
    renderBoard();

    setStatus(`C${column}-F${row} actualizado: ${client} / ${status}.`);
  }

  function clearCell(column, row) {
    column = Number(column);
    row = Number(row);

    if (!isValidPosition(column, row)) {
      setStatus("Selecciona una posición válida para limpiar.");
      return;
    }

    delete boardState[getKey(column, row)];

    saveBoard();
    renderBoard();

    setStatus(`C${column}-F${row} quedó disponible.`);
  }

  function resetBoard() {
    const confirmed = window.confirm(
      "¿Deseas borrar todas las asignaciones del tablero?"
    );

    if (!confirmed) return;

    boardState = {};
    saveBoard();
    renderBoard();

    setStatus("Tablero reiniciado correctamente.");
  }

  function loadBoard() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      const cleanState = {};

      Object.entries(parsed).forEach(([key, value]) => {
        const [column, row] = key.split("-").map(Number);
        const client = value?.client || value?.cliente;
        const status = value?.status || value?.estado;

        if (
          isValidPosition(column, row) &&
          CLIENTES.includes(client) &&
          ESTADOS.includes(status)
        ) {
          cleanState[getKey(column, row)] = {
            client,
            status,
            updatedAt: value.updatedAt || null
          };
        }
      });

      return cleanState;
    } catch {
      return {};
    }
  }

  function saveBoard() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boardState));
  }

  function renderLegend() {
    const legend = document.querySelector(".legend");
    if (!legend) return;

    legend.innerHTML = [
      ...ESTADOS.map((estado) => {
        const className = cssClass(estado);

        return `
          <div class="legend-item">
            <span class="dot ${className}"></span>
            ${estado}
          </div>
        `;
      }),
      `
        <div class="legend-item">
          <span class="dot empty"></span>
          VACÍO
        </div>
      `
    ].join("");
  }

  function updateMetrics() {
    const total = getTotalSlots();
    const occupied = Object.keys(boardState).length;
    const empty = total - occupied;
    const percent = total ? Math.round((occupied / total) * 100) : 0;

    setMetricValue(["#metricTotal", "#totalSlots", "[data-metric='total']"], total, 0);
    setMetricValue(["#metricOccupied", "#occupiedSlots", "[data-metric='occupied']"], occupied, 1);
    setMetricValue(["#metricEmpty", "#emptySlots", "[data-metric='empty']"], empty, 2);
    setMetricValue(["#metricPercent", "#completionPercent", "[data-metric='percent']"], `${percent}%`, 3);
  }

  function setMetricValue(selectors, value, fallbackIndex) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        element.textContent = value;
        return;
      }
    }

    const metricValues = document.querySelectorAll(".metric-value");

    if (metricValues[fallbackIndex]) {
      metricValues[fallbackIndex].textContent = value;
    }
  }

  function populateAllSelects() {
    const columnValues = COLUMNS.map((column) => String(column.number));

    getAllSelects("client").forEach((select) => {
      fillOptions(select, CLIENTES);
    });

    getAllSelects("status").forEach((select) => {
      fillOptions(select, ESTADOS);
    });

    getAllSelects("column").forEach((select) => {
      fillOptions(select, columnValues, {
        label: (value) => `Columna ${value}`
      });
    });

    updateAllRowSelects();
  }

  function updateAllRowSelects() {
    getAllSelects("row").forEach((rowSelect) => {
      const modal = rowSelect.closest(".modal");
      const columnSelect = modal
        ? modal.querySelector("#modalColumn")
        : getMainSelect("column");

      populateRowSelect(rowSelect, Number(columnSelect?.value || 1));
    });
  }

  function populateRowSelect(rowSelect, column) {
    if (!rowSelect) return;

    const rows = getRowsByColumn(Number(column));
    const rowValues = Array.from({ length: rows }, (_, index) => String(index + 1));

    fillOptions(rowSelect, rowValues, {
      label: (value) => `Fila ${value}`
    });
  }

  function fillOptions(select, values, config = {}) {
    if (!select) return;

    const current = select.value;
    const label = config.label || ((value) => value);

    select.innerHTML = values
      .map((value) => {
        return `<option value="${escapeHtml(value)}">${escapeHtml(label(value))}</option>`;
      })
      .join("");

    if (values.map(String).includes(String(current))) {
      select.value = current;
    } else if (values.length) {
      select.value = values[0];
    }
  }

  function getAllSelects(type) {
    const selectors = getSelectorsByType(type);
    const elements = [];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (element instanceof HTMLSelectElement && !elements.includes(element)) {
          elements.push(element);
        }
      });
    });

    document.querySelectorAll("label").forEach((label) => {
      if (!labelMatchesType(label, type)) return;

      let select = null;

      if (label.htmlFor) {
        select = document.getElementById(label.htmlFor);
      }

      if (!select) {
        select = label.closest(".field")?.querySelector("select");
      }

      if (select instanceof HTMLSelectElement && !elements.includes(select)) {
        elements.push(select);
      }
    });

    return elements;
  }

  function getMainSelect(type) {
    const selectors = getSelectorsByType(type);

    for (const selector of selectors) {
      const element = [...document.querySelectorAll(selector)].find((item) => {
        return item instanceof HTMLSelectElement && !item.closest(".modal");
      });

      if (element) return element;
    }

    for (const label of document.querySelectorAll("label")) {
      if (!labelMatchesType(label, type)) continue;

      const select = label.htmlFor
        ? document.getElementById(label.htmlFor)
        : label.closest(".field")?.querySelector("select");

      if (select instanceof HTMLSelectElement && !select.closest(".modal")) {
        return select;
      }
    }

    return null;
  }

  function getSelectorsByType(type) {
    const selectors = {
      client: [
        "#cliente",
        "#client",
        "#clienteSelect",
        "#clientSelect",
        "#selectCliente",
        "#modalClient",
        "#modalCliente",
        "select[name='cliente']",
        "select[name='client']",
        "select[data-field='cliente']",
        "select[data-field='client']"
      ],
      status: [
        "#estado",
        "#status",
        "#estadoSelect",
        "#statusSelect",
        "#selectEstado",
        "#modalStatus",
        "#modalEstado",
        "select[name='estado']",
        "select[name='status']",
        "select[data-field='estado']",
        "select[data-field='status']"
      ],
      column: [
        "#columna",
        "#column",
        "#columnaSelect",
        "#columnSelect",
        "#selectColumna",
        "#modalColumn",
        "#modalColumna",
        "select[name='columna']",
        "select[name='column']",
        "select[data-field='columna']",
        "select[data-field='column']"
      ],
      row: [
        "#fila",
        "#row",
        "#filaSelect",
        "#rowSelect",
        "#selectFila",
        "#modalRow",
        "#modalFila",
        "select[name='fila']",
        "select[name='row']",
        "select[data-field='fila']",
        "select[data-field='row']"
      ]
    };

    return selectors[type] || [];
  }

  function labelMatchesType(label, type) {
    const text = normalizeText(label.textContent);

    const keywords = {
      client: ["CLIENTE"],
      status: ["ESTADO"],
      column: ["COLUMNA"],
      row: ["FILA"]
    };

    return keywords[type]?.some((keyword) => text.includes(keyword));
  }

  function normalizeText(value) {
    return String(value || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function bindEvents() {
    const layout = document.querySelector(".layout");

    if (layout) {
      layout.addEventListener("click", (event) => {
        const cell = event.target.closest(".cell");
        if (!cell) return;

        openCellModal(Number(cell.dataset.column), Number(cell.dataset.row));
      });

      layout.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;

        const cell = event.target.closest(".cell");
        if (!cell) return;

        openCellModal(Number(cell.dataset.column), Number(cell.dataset.row));
      });
    }

    document.addEventListener("change", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLSelectElement)) return;

      if (isSelectType(target, "column")) {
        const modal = target.closest(".modal");
        const rowSelect = modal
          ? modal.querySelector("#modalRow")
          : getMainSelect("row");

        populateRowSelect(rowSelect, Number(target.value));
      }
    });

    const assignButton =
      findButtonBySelectors([
        "#assignBtn",
        "#addBtn",
        "#saveBtn",
        "#btnAssign",
        "#btnAdd",
        "#btnGuardar"
      ]) || findActionButton(["ASIGNAR", "AGREGAR", "GUARDAR"]);

    if (assignButton) {
      assignButton.addEventListener("click", handleMainAssign);
    }

    const clearButton =
      findButtonBySelectors([
        "#clearBtn",
        "#clearCellBtn",
        "#btnClear",
        "#btnLimpiar"
      ]) || findActionButton(["LIMPIAR", "ELIMINAR CELDA"]);

    if (clearButton) {
      clearButton.addEventListener("click", handleMainClear);
    }

    const resetButton =
      findButtonBySelectors([
        "#resetBtn",
        "#clearAllBtn",
        "#btnReset",
        "#btnReiniciar"
      ]) || findActionButton(["REINICIAR", "BORRAR TODO", "LIMPIAR TODO"]);

    if (resetButton) {
      resetButton.addEventListener("click", resetBoard);
    }

    document.querySelector("#modalSave")?.addEventListener("click", handleModalSave);
    document.querySelector("#modalClear")?.addEventListener("click", handleModalClear);
    document.querySelector("#modalCancel")?.addEventListener("click", closeCellModal);

    document.querySelector("#cellModal")?.addEventListener("click", (event) => {
      if (event.target.id === "cellModal") closeCellModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCellModal();
    });
  }

  function isSelectType(select, type) {
    const selectors = getSelectorsByType(type);

    if (selectors.some((selector) => select.matches(selector))) return true;

    const label = select.id
      ? document.querySelector(`label[for="${select.id}"]`)
      : select.closest(".field")?.querySelector("label");

    return label ? labelMatchesType(label, type) : false;
  }

  function findButtonBySelectors(selectors) {
    for (const selector of selectors) {
      const button = [...document.querySelectorAll(selector)].find((item) => {
        return item instanceof HTMLButtonElement && !item.closest(".modal");
      });

      if (button) return button;
    }

    return null;
  }

  function findActionButton(texts) {
    const normalizedTexts = texts.map(normalizeText);
    const scopes = [
      document.querySelector(".actions"),
      document
    ].filter(Boolean);

    for (const scope of scopes) {
      const button = [...scope.querySelectorAll("button")].find((item) => {
        if (item.closest(".modal")) return false;

        const buttonText = normalizeText(item.textContent);

        return normalizedTexts.some((text) => buttonText.includes(text));
      });

      if (button) return button;
    }

    return null;
  }

  function handleMainAssign() {
    const column = getMainSelect("column")?.value;
    const row = getMainSelect("row")?.value;
    const client = getMainSelect("client")?.value;
    const status = getMainSelect("status")?.value;

    assignCell(column, row, client, status);
  }

  function handleMainClear() {
    const column = getMainSelect("column")?.value;
    const row = getMainSelect("row")?.value;

    clearCell(column, row);
  }

  function ensureModal() {
    let backdrop = document.querySelector("#cellModal");

    if (!backdrop) {
      backdrop = document.querySelector(".modal-backdrop");
    }

    if (!backdrop) {
      backdrop = document.createElement("div");
      document.body.appendChild(backdrop);
    }

    backdrop.id = "cellModal";
    backdrop.className = "modal-backdrop";

    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Editar posición</h3>
          <p id="modalPosition">Selecciona cliente y estado.</p>
        </div>

        <div class="modal-body">
          <div class="field">
            <label for="modalColumn">Columna</label>
            <select id="modalColumn"></select>
          </div>

          <div class="field">
            <label for="modalRow">Fila</label>
            <select id="modalRow"></select>
          </div>

          <div class="field">
            <label for="modalClient">Cliente</label>
            <select id="modalClient"></select>
          </div>

          <div class="field">
            <label for="modalStatus">Estado</label>
            <select id="modalStatus"></select>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="danger-btn" id="modalClear">Limpiar</button>
          <button type="button" class="btn-secondary" id="modalCancel">Cancelar</button>
          <button type="button" class="btn-primary" id="modalSave">Guardar</button>
        </div>
      </div>
    `;
  }

  function openCellModal(column, row) {
    if (!isValidPosition(column, row)) return;

    activeCell = { column, row };

    populateAllSelects();

    const data = boardState[getKey(column, row)];

    const columnSelect = document.querySelector("#modalColumn");
    const rowSelect = document.querySelector("#modalRow");
    const clientSelect = document.querySelector("#modalClient");
    const statusSelect = document.querySelector("#modalStatus");
    const positionText = document.querySelector("#modalPosition");

    columnSelect.value = String(column);
    populateRowSelect(rowSelect, column);
    rowSelect.value = String(row);

    clientSelect.value = data?.client || CLIENTES[0];
    statusSelect.value = data?.status || ESTADOS[0];

    if (positionText) {
      positionText.textContent = `Posición C${column}-F${row}`;
    }

    document.querySelector("#cellModal")?.classList.add("show");
  }

  function closeCellModal() {
    document.querySelector("#cellModal")?.classList.remove("show");
    activeCell = null;
  }

  function handleModalSave() {
    const column = document.querySelector("#modalColumn")?.value;
    const row = document.querySelector("#modalRow")?.value;
    const client = document.querySelector("#modalClient")?.value;
    const status = document.querySelector("#modalStatus")?.value;

    assignCell(column, row, client, status);
    closeCellModal();
  }

  function handleModalClear() {
    const column = document.querySelector("#modalColumn")?.value || activeCell?.column;
    const row = document.querySelector("#modalRow")?.value || activeCell?.row;

    clearCell(column, row);
    closeCellModal();
  }

  function setStatus(message) {
    const line = document.querySelector("#statusLine, .status-line");
    if (!line) return;

    const now = new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date());

    line.textContent = `${message} Última actualización: ${now}`;
  }

  function injectDynamicStyles() {
    if (document.querySelector("#dynamic-board-styles")) return;

    const style = document.createElement("style");
    style.id = "dynamic-board-styles";

    style.textContent = `
      .layout {
        grid-template-columns: repeat(14, minmax(185px, 1fr)) !important;
        min-width: 2800px !important;
      }

      @media (min-width: 1600px) {
        .layout {
          grid-template-columns: repeat(14, minmax(210px, 1fr)) !important;
          min-width: 3080px !important;
        }
      }

      .column-section {
        margin-bottom: 4px;
        font-size: 13px;
        font-weight: 950;
        letter-spacing: .7px;
        color: #dbeafe;
        text-transform: uppercase;
      }

      .column[data-type="ARMADO"] .column-header {
        background: linear-gradient(180deg, #f59e0b, #b45309);
      }

      .column[data-type="DESPACHO"] .column-header {
        background: linear-gradient(180deg, #3b82f6, #1d4ed8);
      }

      .client-initials {
        width: 70px;
        height: 46px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        background: linear-gradient(145deg, rgba(59,130,246,.95), rgba(29,78,216,.95));
        color: #ffffff;
        font-size: 18px;
        font-weight: 950;
        letter-spacing: .6px;
        box-shadow: 0 10px 22px rgba(37,99,235,.36);
      }

      .cell.armado {
        box-shadow: inset 0 0 0 1px rgba(245,158,11,.32), 0 12px 22px rgba(0,0,0,.25);
      }

      .cell.etiquetado {
        box-shadow: inset 0 0 0 1px rgba(59,130,246,.32), 0 12px 22px rgba(0,0,0,.25);
      }

      .cell.auditoria {
        box-shadow: inset 0 0 0 1px rgba(168,85,247,.32), 0 12px 22px rgba(0,0,0,.25);
      }

      .cell.realizado {
        box-shadow: inset 0 0 0 1px rgba(16,185,129,.32), 0 12px 22px rgba(0,0,0,.25);
      }

      .badge.armado,
      .dot.armado {
        background: rgba(245,158,11,.22);
        color: #fde68a;
      }

      .badge.etiquetado,
      .dot.etiquetado {
        background: rgba(59,130,246,.22);
        color: #bfdbfe;
      }

      .badge.auditoria,
      .dot.auditoria {
        background: rgba(168,85,247,.22);
        color: #e9d5ff;
      }

      .badge.realizado,
      .dot.realizado {
        background: rgba(16,185,129,.22);
        color: #a7f3d0;
      }

      .dot.armado {
        background: #f59e0b;
      }

      .dot.etiquetado {
        background: #3b82f6;
      }

      .dot.auditoria {
        background: #a855f7;
      }

      .dot.realizado {
        background: #10b981;
      }

      .dot.empty {
        background: #64748b;
      }
    `;

    document.head.appendChild(style);
  }

  window.TableroDespacho = {
    CLIENTES,
    ESTADOS,
    COLUMNS,
    assignCell,
    clearCell,
    resetBoard,
    renderBoard,
    getState: () => ({ ...boardState })
  };
})();
