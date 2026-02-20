/**
 * view_simulation.js
 * 担当: ルート検索UI（初期表示OFF・iPhone負荷軽減版）
 */

const STORAGE_KEY = 'nrolls_custom_weights_v2';
const TICKET_STORAGE_KEY = 'nrolls_ticket_limits_v1';

const WEIGHT_KEY_MAP = {
    DARK_NEKOME: 'd', TREASURE_RADAR: 't', VITAN_C: 'c', BLUE_ORBS: 'b',
    CHIBI: 'h', BATTLE_ITEMS: 'i', XP: 'x', VITAN: 'v', BASIC: 's', NEKOME: 'n'
};
const REVERSE_KEY_MAP = Object.fromEntries(Object.entries(WEIGHT_KEY_MAP).map(([k, v]) => [v, k]));

function createStyledElement(tag, styles = {}, properties = {}) {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    Object.assign(element, properties);
    return element;
}

/**
 * シミュレーション表示エリアの初期化
 */
function initializeSimulationView() {
    // 【修正】初期状態を強制的に false (OFF) に設定
    if (window.viewData.showSimText === undefined) {
        window.viewData.showSimText = false;
    }

    let simContainer = document.getElementById('sim-ui-container');
    
    if (!simContainer) {
        simContainer = document.createElement('div');
        simContainer.id = 'sim-ui-container';
        simContainer.style.marginBottom = '15px';
        const resultDiv = document.getElementById('result');
        if (resultDiv) resultDiv.insertBefore(simContainer, resultDiv.firstChild);
    }

    simContainer.innerHTML = '';

    const limits = window.viewData.ticketLimits || { nyanko: 100, fukubiki: 100, fukubikiG: 100 };

    const simGroup = createStyledElement('div', {
        padding: '10px 15px', background: '#fff', borderRadius: '8px',
        border: '1px solid #ddd', marginTop: '5px'
    });

    const controlRow = createStyledElement('div', {
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '15px'
    });

    const headerInputGroup = document.querySelector('header .input-group');
    if (headerInputGroup) controlRow.appendChild(headerInputGroup);

    const extraControls = document.createElement('div');
    extraControls.style.display = 'flex'; extraControls.style.alignItems = 'center';
    extraControls.style.flexWrap = 'wrap'; extraControls.style.gap = '10px';
    
    extraControls.innerHTML = `
        <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; margin-left: 5px;">ルート検索</button>
        <button id="toggleRouteHighlightBtn" style="display: none; background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">ルート表示ON</button>
        <button id="toggleSimTextBtn" style="display: none; background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">テキスト表示</button>
        <button id="toggleTableCheckBtn" style="display: none; background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">消し込み</button>
        
        <div id="ticket-display-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; margin-left: 5px; user-select: none;">
            <span style="font-size: 0.65rem; color: #888; line-height: 1; margin-bottom: 2px;">条件(所持数):</span>
            <div id="ticket-summary-container" style="padding: 0; font-size: 0.85rem; color: #007bff; text-decoration: underline; line-height: 1.2;">
                にゃんチケ:${limits.nyanko}、福引:${limits.fukubiki}、福引G:${limits.fukubikiG}
            </div>
        </div>

        <div id="ticket-inputs-area" style="display: none; align-items: center; flex-wrap: wrap; gap: 8px; border: 1px solid #eee; padding: 5px; border-radius: 4px; margin-left: 10px; background: #fff;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold;">にゃん:</label>
                <input type="number" id="simTicketNyanko" value="${limits.nyanko}" style="width: 50px; padding: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold;">福引:</label>
                <input type="number" id="simTicketFukubiki" value="${limits.fukubiki}" style="width: 60px; padding: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold;">福引G:</label>
                <input type="number" id="simTicketFukubikiG" value="${limits.fukubikiG}" style="width: 50px; padding: 4px;">
            </div>
            <button id="updateTicketBtn" style="padding: 4px 8px; font-size: 0.75rem;">更新</button>
        </div>

        <div id="custom-display-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; margin-left: 10px; user-select: none;">
            <span style="font-size: 0.65rem; color: #888; line-height: 1; margin-bottom: 2px;">スコア設定:</span>
            <span id="toggleCustomBtn" style="color: #007bff; text-decoration: underline; font-size: 0.85rem;">カスタム</span>
        </div>
    `;

    controlRow.appendChild(extraControls);
    simGroup.appendChild(controlRow);

    const customPanel = createStyledElement('div', {
        display: 'none', marginTop: '10px', padding: '10px',
        borderTop: '1px dashed #ccc', backgroundColor: '#fdfdfd'
    }, { id: 'custom-weight-panel' });

    customPanel.innerHTML = `<div style="display: flex; gap: 10px; margin-bottom: 8px;"><div style="font-size: 0.75rem; font-weight: bold; color: #666;">スコア重みづけ設定</div><div id="reset-weights-btn" style="font-size: 0.7rem; color: #007bff; text-decoration: underline; cursor: pointer;">リセット</div></div>`;
    simGroup.appendChild(customPanel);
    simContainer.appendChild(simGroup);

    // 【重要】テキスト表示エリア：初期状態 showSimText (false) に基づいて style.display を設定
    const resultDisplay = createStyledElement('div', {
        marginTop: '10px', padding: '15px', border: '1px solid #28a745',
        backgroundColor: '#f9fff9', whiteSpace: 'pre-wrap', fontFamily: 'monospace',
        fontSize: '0.85rem', borderRadius: '8px', lineHeight: '1.4',
        display: window.viewData.showSimText ? 'block' : 'none'
    }, { id: 'sim-result-text' });

    simContainer.appendChild(resultDisplay);

    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('toggleRouteHighlightBtn').onclick = toggleRouteHighlight;
    document.getElementById('toggleSimTextBtn').onclick = toggleSimTextMode;
    document.getElementById('toggleTableCheckBtn').onclick = toggleTableCheckMode;
    document.getElementById('custom-display-wrapper').onclick = toggleCustomMode;

    const displayWrapper = document.getElementById('ticket-display-wrapper');
    const inputsArea = document.getElementById('ticket-inputs-area');
    const updateBtn = document.getElementById('updateTicketBtn');

    displayWrapper.onclick = () => { displayWrapper.style.display = 'none'; inputsArea.style.display = 'flex'; };
    updateBtn.onclick = () => {
        inputsArea.style.display = 'none'; displayWrapper.style.display = 'flex';
        window.viewData.ticketLimits = {
            nyanko: parseInt(document.getElementById('simTicketNyanko').value) || 0,
            fukubiki: parseInt(document.getElementById('simTicketFukubiki').value) || 0,
            fukubikiG: parseInt(document.getElementById('simTicketFukubikiG').value) || 0
        };
        window.saveTicketSettingsToStorage();
    };

    loadSettingsFromStorage();
    updateCustomButtonText();
    updateSimTextButtonState();
    updateRouteHighlightButtonState();
    updateTableCheckButtonState();
    
    if (window.viewData.lastSimResult) {
        ['toggleRouteHighlightBtn', 'toggleSimTextBtn', 'toggleTableCheckBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'inline-block';
        });
        displaySimulationResult(window.viewData.lastSimResult);
    }
}

function toggleSimTextMode() {
    window.viewData.showSimText = !window.viewData.showSimText;
    updateSimTextButtonState();
    const display = document.getElementById('sim-result-text');
    if (display) {
        display.style.display = window.viewData.showSimText ? 'block' : 'none';
    }
}

function updateSimTextButtonState() {
    const btn = document.getElementById('toggleSimTextBtn');
    if (!btn) return;
    const isActive = !!window.viewData.showSimText;
    // ONの時に「テキスト表示ON」と表示し、緑色にする
    btn.textContent = isActive ? 'テキスト表示ON' : 'テキスト表示OFF';
    btn.style.backgroundColor = isActive ? '#28a745' : '#6c757d';
}

function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    if (!display) return;
    
    // 再描画時も現在のステートに従う
    display.style.display = window.viewData.showSimText ? 'block' : 'none';
    display.innerHTML = "";

    if (!result || !result.path || result.path.length === 0) {
        display.textContent = "有効なルートが見つかりませんでした。";
        return;
    }

    const header = createStyledElement('div', {
        fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #28a745', paddingBottom: '4px'
    });
    header.textContent = `【ルート検索結果】(闇猫目:${result.counts.DARK_NEKOME} / トレレ:${result.counts.TREASURE_RADAR})`;
    display.appendChild(header);

    let i = 0;
    let globalItemIdx = 0;
    while (i < result.path.length) {
        const rowStartIdx = i;
        const currentGachaName = result.path[i].gachaName;
        const row = createStyledElement('div', {
            display: 'flex', gap: '8px', marginBottom: '4px', borderBottom: '1px solid #eee'
        });

        const cb = createStyledElement('input', { marginTop: '4px' }, { type: 'checkbox' });
        const spanContainer = createStyledElement('span', { lineHeight: '1.4', flex: '1' });
        
        const rowHeader = createStyledElement('span', { color: '#d9534f', fontWeight: 'bold' }, { textContent: `[${currentGachaName}] ` });
        spanContainer.appendChild(rowHeader);

        let j = i;
        while (j < result.path.length && result.path[j].gachaName === currentGachaName) {
            const currentIdx = globalItemIdx;
            const step = result.path[j];
            const isChecked = currentIdx < window.viewData.checkedCount;

            const itemSpan = createStyledElement('span', {
                cursor: 'pointer', textDecoration: isChecked ? 'line-through' : 'none',
                opacity: isChecked ? '0.4' : '1', padding: '0 2px'
            }, { className: 'sim-item-clickable' });

            itemSpan.innerHTML = getColoredItemHtml(step.item) + (step.isReroll ? " (被り)" : "") + `<small style="color:#888;">(${step.addr})</small>`;
            itemSpan.onclick = (e) => {
                e.stopPropagation();
                window.viewData.checkedCount = currentIdx + 1;
                if (typeof UrlManager !== 'undefined') UrlManager.updateUrlParam('p', window.viewData.checkedCount);
                if (typeof generateTable === 'function') generateTable();
            };
            spanContainer.appendChild(itemSpan);
            if (j < result.path.length - 1 && result.path[j+1].gachaName === currentGachaName) {
                spanContainer.appendChild(document.createTextNode('、'));
            }
            j++;
            globalItemIdx++;
        }

        cb.checked = globalItemIdx <= window.viewData.checkedCount;
        cb.onchange = () => {
            window.viewData.checkedCount = cb.checked ? globalItemIdx : rowStartIdx;
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrlParam('p', window.viewData.checkedCount);
            if (typeof generateTable === 'function') generateTable();
        };

        row.append(cb, spanContainer);
        display.appendChild(row);
        i = j;
    }
}

// -------------------------------------------------------------------------
// 以下、補助関数 (ボタン状態更新など)
// -------------------------------------------------------------------------

function toggleRouteHighlight() {
    window.viewData.showSimHighlight = !window.viewData.showSimHighlight;
    if (!window.viewData.showSimHighlight) window.viewData.isTableCheckMode = false;
    updateRouteHighlightButtonState();
    updateTableCheckButtonState();
    if (typeof generateTable === 'function') generateTable();
}

function updateRouteHighlightButtonState() {
    const btn = document.getElementById('toggleRouteHighlightBtn');
    if (!btn) return;
    const isActive = !!window.viewData.showSimHighlight;
    btn.textContent = isActive ? 'ルート表示ON' : 'ルート表示OFF';
    btn.style.backgroundColor = isActive ? '#28a745' : '#6c757d';
}

function toggleTableCheckMode() {
    window.viewData.isTableCheckMode = !window.viewData.isTableCheckMode;
    if (window.viewData.isTableCheckMode) window.viewData.showSimHighlight = true;
    updateTableCheckButtonState();
    updateRouteHighlightButtonState();
    if (typeof generateTable === 'function') generateTable();
}

function updateTableCheckButtonState() {
    const btn = document.getElementById('toggleTableCheckBtn');
    if (!btn) return;
    const isActive = !!window.viewData.isTableCheckMode;
    btn.textContent = isActive ? '消し込みON' : '消し込みOFF';
    btn.style.backgroundColor = isActive ? '#28a745' : '#6c757d';
}

function runSimulation() {
    const seedInput = document.getElementById('seed');
    const initialSeed = parseInt(seedInput.value, 10);
    if (isNaN(initialSeed)) return;
    const limits = window.viewData.ticketLimits || { nyanko: 100, fukubiki: 100, fukubikiG: 100 };
    
    let weights = null;
    if (window.isCustomMode) {
        weights = { groups: {}, items: {}, costs: {} };
        document.querySelectorAll('.custom-group-weight-input').forEach(input => { weights.groups[input.dataset.key] = parseFloat(input.value) || 0; });
        document.querySelectorAll('.custom-item-weight-input').forEach(input => { if (input.value !== "") weights.items[input.dataset.itemid] = parseFloat(input.value); });
        document.querySelectorAll('.custom-cost-input').forEach(input => { weights.costs[input.dataset.type] = parseFloat(input.value); });
    }

    const activeGachaIds = viewData.gachaIds.filter(id => {
        if (id === "0" && !displayIds.includes("0") && displayIds.includes("64")) return false;
        if (id === "64" && !displayIds.includes("64") && displayIds.includes("0")) return false;
        return true;
    });

    const result = runGachaSearch(initialSeed, 'none', limits, activeGachaIds, weights);
    window.viewData.lastSimResult = result;

    if (result) {
        viewData.highlightedRoute = new Map();
        result.path.forEach((p, idx) => { viewData.highlightedRoute.set(`${p.addr}_${p.gachaId}`, idx); });
        
        ['toggleRouteHighlightBtn', 'toggleSimTextBtn', 'toggleTableCheckBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'inline-block';
        });
        
        if (typeof generateTable === 'function') generateTable();
    }
}

function getColoredItemHtml(name) {
    const item = Object.values(itemMaster).find(it => it.name === name);
    if (!item) return name;
    if (item.name === "闇猫目") return `<span style="color:#00f; font-weight:bold; background:#ff0;">${name}</span>`;
    if (item.rarity === 4) return `<span style="color:#00f; font-weight:bold;">${name}</span>`;
    if (item.rarity === 3) return `<span style="color:#d9534f; font-weight:bold;">${name}</span>`;
    if (item.rarity === 2) return `<span style="color:#c0a000; font-weight:bold;">${name}</span>`;
    return name;
}

function toggleCustomMode() { window.isCustomMode = !window.isCustomMode; const panel = document.getElementById('custom-weight-panel'); if (panel) panel.style.display = window.isCustomMode ? 'block' : 'none'; updateCustomButtonText(); saveSettingsToStorage(); }
function updateCustomButtonText() { const btn = document.getElementById('toggleCustomBtn'); if (btn) btn.textContent = window.isCustomMode ? 'カスタムON' : 'カスタム'; }

function saveSettingsToStorage() {
    const settings = { isCustomMode: window.isCustomMode, groups: {}, items: {}, costs: {} };
    document.querySelectorAll('.custom-group-weight-input').forEach(input => { settings.groups[input.dataset.key] = parseFloat(input.value); });
    document.querySelectorAll('.custom-item-weight-input').forEach(input => { if (input.value !== "") settings.items[input.dataset.itemid] = parseFloat(input.value); });
    document.querySelectorAll('.custom-cost-input').forEach(input => { settings.costs[input.dataset.type] = parseFloat(input.value); });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadSettingsFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { const parsed = JSON.parse(saved); window.isCustomMode = !!parsed.isCustomMode; } catch(e){} }
}
