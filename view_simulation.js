/**
 * view_simulation.js
<<<<<<< HEAD
 * 担当: ルート検索UI（初期表示OFF・iPhone負荷軽減版）
=======
 * 役割: シミュレーターUIの生成、表示ステートの同期、検索結果の描画
>>>>>>> 733956e7beef91e325f5359323172e7d06c529f7
 */

const TICKET_STORAGE_KEY = 'nrolls_ticket_limits_v1';

/**
 * ユーティリティ: スタイル付き要素の作成
 */
function createStyledElement(tag, styles = {}, props = {}) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    Object.assign(el, props);
    return el;
}

/**
 * シミュレーターUI全体の初期化・同期
 * 冪等性を確保し、何度呼ばれてもUIが重複したり入力が消えたりしないようにします。
 */
function initializeSimulationView() {
<<<<<<< HEAD
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
    } else {
        // 【修正】SEED表示の退避ロジック
        // simContainerをクリアする前に、中に移動している .input-group を header に戻す
        const inputGroup = document.querySelector('.input-group');
        const header = document.querySelector('header');
        if (inputGroup && header && !header.contains(inputGroup)) {
            header.appendChild(inputGroup);
        }
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
=======
    let container = document.getElementById('sim-ui-container');
    
    // 1. コンテナがない場合のみ基本構造を作成
    if (!container) {
        container = document.createElement('div');
        container.id = 'sim-ui-container';
        container.style.marginBottom = '15px';
        const resultDiv = document.getElementById('result');
        if (resultDiv) resultDiv.insertBefore(container, resultDiv.firstChild);

        // 操作パネルの作成
        const simGroup = createStyledElement('div', {
            padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd'
        });

        const controlRow = createStyledElement('div', {
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
        });
>>>>>>> 733956e7beef91e325f5359323172e7d06c529f7

        // ボタンエリア
        const btnArea = document.createElement('div');
        btnArea.id = 'sim-button-area';
        btnArea.style.display = 'flex';
        btnArea.style.gap = '8px';
        btnArea.style.flexWrap = 'wrap';
        btnArea.innerHTML = `
            <button id="runSimBtn" style="background:#28a745; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; font-size:0.8rem; cursor:pointer;">ルート検索</button>
            <button id="toggleRouteHighlightBtn" style="display:none; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.8rem; cursor:pointer;"></button>
            <button id="toggleSimTextBtn" style="display:none; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.8rem; cursor:pointer;"></button>
            <button id="toggleTableCheckBtn" style="display:none; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.8rem; cursor:pointer;"></button>
        `;

<<<<<<< HEAD
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
=======
        // チケット情報表示エリア
        const ticketInfo = createStyledElement('div', {
            display: 'flex', flexDirection: 'column', cursor: 'pointer', userSelect: 'none'
        }, { id: 'ticket-display-wrapper' });

        // チケット入力エリア
        const ticketInArea = createStyledElement('div', {
            display: 'none', gap: '5px', border: '1px solid #eee', padding: '5px', borderRadius: '4px', background: '#f9f9f9'
        }, { id: 'ticket-inputs-area' });
        
        controlRow.append(btnArea, ticketInfo, ticketInArea);
        simGroup.appendChild(controlRow);

        // 結果テキスト表示エリア
        const resultText = createStyledElement('div', {
            marginTop: '10px', padding: '10px', border: '1px solid #28a745', backgroundColor: '#f9fff9', borderRadius: '8px', fontSize: '0.85rem'
        }, { id: 'sim-result-text' });

        container.append(simGroup, resultText);

        // 初回のみのイベント紐付け
        document.getElementById('runSimBtn').onclick = runSimulation;
        document.getElementById('toggleRouteHighlightBtn').onclick = toggleRouteHighlight;
        document.getElementById('toggleSimTextBtn').onclick = toggleSimTextMode;
        document.getElementById('toggleTableCheckBtn').onclick = toggleTableCheckMode;
        
        ticketInfo.onclick = () => {
            ticketInfo.style.display = 'none';
            ticketInArea.style.display = 'flex';
        };
>>>>>>> 733956e7beef91e325f5359323172e7d06c529f7
    }

    // 2. 状態（window.viewData）をUIに同期
    syncSimulationUI();
}

<<<<<<< HEAD
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
=======
/**
 * 状態に基づいたUI表示の更新
 */
function syncSimulationUI() {
    const data = window.viewData;
    
    // チケット情報の更新
    const ticketInfo = document.getElementById('ticket-display-wrapper');
    if (ticketInfo) {
        ticketInfo.innerHTML = `
            <span style="font-size:0.65rem; color:#888;">所持数(タップで編集):</span>
            <div id="ticket-summary-container" style="font-size:0.8rem; color:#007bff; text-decoration:underline;">
                に:${data.ticketLimits.nyanko}、福:${data.ticketLimits.fukubiki}、G:${data.ticketLimits.fukubikiG}
            </div>
        `;
    }

    const ticketInArea = document.getElementById('ticket-inputs-area');
    if (ticketInArea && ticketInArea.style.display === 'none') {
        ticketInArea.innerHTML = `
            <input type="number" id="simTicketNyanko" value="${data.ticketLimits.nyanko}" style="width:40px;">
            <input type="number" id="simTicketFukubiki" value="${data.ticketLimits.fukubiki}" style="width:50px;">
            <input type="number" id="simTicketFukubikiG" value="${data.ticketLimits.fukubikiG}" style="width:40px;">
            <button onclick="applyTicketInputs()">更新</button>
        `;
    }

    // 検索後のみ表示されるボタンの制御
    if (data.lastSimResult) {
        const btnIds = ['toggleRouteHighlightBtn', 'toggleSimTextBtn', 'toggleTableCheckBtn'];
        btnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'inline-block';
        });

        updateButtonUI('toggleRouteHighlightBtn', data.showSimHighlight, '表示');
        updateButtonUI('toggleSimTextBtn', data.showSimText, 'テキスト');
        updateButtonUI('toggleTableCheckBtn', data.isTableCheckMode, '消し込み');
        
        // 結果テキストの表示同期
        const resultDisplay = document.getElementById('sim-result-text');
        if (resultDisplay) {
            resultDisplay.style.display = data.showSimText ? 'block' : 'none';
            if (data.showSimText) displaySimulationResult(data.lastSimResult);
        }
    }
>>>>>>> 733956e7beef91e325f5359323172e7d06c529f7
}

/**
 * ボタンの見た目（ON/OFF）を同期
 */
function updateButtonUI(id, isActive, label) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.textContent = `${label}${isActive ? 'ON' : 'OFF'}`;
    btn.style.background = isActive ? '#28a745' : '#6c757d';
}

<<<<<<< HEAD
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
=======
/**
 * チケット入力の反映
 */
window.applyTicketInputs = function() {
    window.viewData.ticketLimits = {
        nyanko: parseInt(document.getElementById('simTicketNyanko').value) || 0,
        fukubiki: parseInt(document.getElementById('simTicketFukubiki').value) || 0,
        fukubikiG: parseInt(document.getElementById('simTicketFukubikiG').value) || 0
    };
    window.saveTicketSettingsToStorage();
    document.getElementById('ticket-inputs-area').style.display = 'none';
    document.getElementById('ticket-display-wrapper').style.display = 'flex';
    syncSimulationUI();
};
>>>>>>> 733956e7beef91e325f5359323172e7d06c529f7

/**
 * ルート検索実行
 */
function runSimulation() {
    const seedInput = document.getElementById('seed');
    const initialSeed = parseInt(seedInput.value, 10);
    if (isNaN(initialSeed)) return;
<<<<<<< HEAD
    const limits = window.viewData.ticketLimits || { nyanko: 100, fukubiki: 100, fukubikiG: 100 };
    
    let weights = null;
    if (window.isCustomMode) {
        weights = { groups: {}, items: {}, costs: {} };
        document.querySelectorAll('.custom-group-weight-input').forEach(input => { weights.groups[input.dataset.key] = parseFloat(input.value) || 0; });
        document.querySelectorAll('.custom-item-weight-input').forEach(input => { if (input.value !== "") weights.items[input.dataset.itemid] = parseFloat(input.value); });
        document.querySelectorAll('.custom-cost-input').forEach(input => { weights.costs[input.dataset.type] = parseFloat(input.value); });
    }

    const activeGachaIds = viewData.gachaIds.filter(id => {
=======

    const { ticketLimits, displayIds, gachaIds } = window.viewData;
    
    // 表示されていないガチャ（にゃんこ等）を検索対象から外す判定
    const activeGachaIds = gachaIds.filter(id => {
>>>>>>> 733956e7beef91e325f5359323172e7d06c529f7
        if (id === "0" && !displayIds.includes("0") && displayIds.includes("64")) return false;
        if (id === "64" && !displayIds.includes("64") && displayIds.includes("0")) return false;
        return true;
    });

    const result = runGachaSearch(initialSeed, 'none', ticketLimits, activeGachaIds, null);
    window.viewData.lastSimResult = result;

    if (result) {
<<<<<<< HEAD
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
=======
        window.viewData.highlightedRoute = new Map();
        result.path.forEach((p, idx) => {
            window.viewData.highlightedRoute.set(`${p.addr}_${p.gachaId}`, idx);
        });
        // 検索後は結果を自動で表示ステートにする
        window.viewData.showSimHighlight = true;
        if (typeof generateTable === 'function') generateTable();
    }
}

/**
 * 検索結果テキストの描画 (iPhone負荷軽減: DOMビルド方式)
 */
function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    if (!display || !result || !result.path) return;

    display.innerHTML = '';
    const header = createStyledElement('div', {
        fontWeight: 'bold', borderBottom: '1px solid #28a745', marginBottom: '8px', paddingBottom: '4px'
    }, { textContent: `【ルート検索結果】(闇猫目:${result.counts.DARK_NEKOME || 0})` });
    display.appendChild(header);

    let globalIdx = 0;
    for (let i = 0; i < result.path.length; ) {
        const startIdx = i;
        const gName = result.path[i].gachaName;
        
        const row = createStyledElement('div', { display: 'flex', gap: '8px', marginBottom: '4px', borderBottom: '1px solid #eee' });
        const cb = createStyledElement('input', { marginTop: '4px' }, { type: 'checkbox' });
        const spanContainer = createStyledElement('span', { lineHeight: '1.4', flex: '1' });
        
        spanContainer.appendChild(createStyledElement('span', { color: '#d9534f', fontWeight: 'bold' }, { textContent: `[${gName}] ` }));

        let j = i;
        while (j < result.path.length && result.path[j].gachaName === gName) {
            const currIdx = globalIdx;
            const step = result.path[j];
            const isChecked = currIdx < window.viewData.checkedCount;

            const itemSpan = createStyledElement('span', {
                cursor: 'pointer', textDecoration: isChecked ? 'line-through' : 'none', opacity: isChecked ? '0.4' : '1'
            });
            itemSpan.innerHTML = `${step.item}${step.isReroll ? '(R)' : ''}<small style="color:#888;">(${step.addr})</small>`;
            
            itemSpan.onclick = () => {
                window.viewData.checkedCount = currIdx + 1;
                generateTable();
            };

            spanContainer.appendChild(itemSpan);
            if (j < result.path.length - 1 && result.path[j + 1].gachaName === gName) {
                spanContainer.appendChild(document.createTextNode('、'));
            }
            j++;
            globalIdx++;
        }

        cb.checked = globalIdx <= window.viewData.checkedCount;
        cb.onchange = () => {
            window.viewData.checkedCount = cb.checked ? globalIdx : startIdx;
            generateTable();
        };

        row.append(cb, spanContainer);
        display.appendChild(row);
        i = j;
    }
}

// 各種トグル処理
function toggleSimTextMode() {
    window.viewData.showSimText = !window.viewData.showSimText;
    syncSimulationUI();
}

function toggleRouteHighlight() {
    window.viewData.showSimHighlight = !window.viewData.showSimHighlight;
    if (!window.viewData.showSimHighlight) window.viewData.isTableCheckMode = false;
    generateTable();
>>>>>>> 733956e7beef91e325f5359323172e7d06c529f7
}

function toggleTableCheckMode() {
    window.viewData.isTableCheckMode = !window.viewData.isTableCheckMode;
    if (window.viewData.isTableCheckMode) window.viewData.showSimHighlight = true;
    generateTable();
}

/**
 * 設定の保存
 */
window.saveTicketSettingsToStorage = function() {
    const limits = window.viewData.ticketLimits;
    localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(limits));
    if (typeof UrlManager !== 'undefined') {
        UrlManager.updateUrlParam('t', `${limits.nyanko}.${limits.fukubiki}.${limits.fukubikiG}`);
    }
};
