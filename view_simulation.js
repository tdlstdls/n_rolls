/**
 * view_simulation.js
 * 役割: シミュレーターUIの生成、表示ステートの同期、検索結果の描画
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
    }

    // 2. 状態（window.viewData）をUIに同期
    syncSimulationUI();
}

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

/**
 * ルート検索実行
 */
function runSimulation() {
    const seedInput = document.getElementById('seed');
    const initialSeed = parseInt(seedInput.value, 10);
    if (isNaN(initialSeed)) return;

    const { ticketLimits, displayIds, gachaIds } = window.viewData;
    
    // 表示されていないガチャ（にゃんこ等）を検索対象から外す判定
    const activeGachaIds = gachaIds.filter(id => {
        if (id === "0" && !displayIds.includes("0") && displayIds.includes("64")) return false;
        if (id === "64" && !displayIds.includes("64") && displayIds.includes("0")) return false;
        return true;
    });

    const result = runGachaSearch(initialSeed, 'none', ticketLimits, activeGachaIds, null);
    window.viewData.lastSimResult = result;

    if (result) {
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
