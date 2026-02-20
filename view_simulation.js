/**
 * view_simulation.js
<<<<<<< HEAD
 * 担当: ルート検索UI・詳細カスタム設定（チケット別コスト・表示制御・LocalStorage対応版）
=======
 * 担当: ルート検索UI（URL同期・進捗保持・アイテム単位消し込み機能付）
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
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
    let simContainer = document.getElementById('sim-ui-container');
    
    const existingGroup = document.querySelector('#sim-ui-container .input-group');
    if (existingGroup) {
        const header = document.querySelector('header');
        if (header) header.appendChild(existingGroup);
    }

    if (!simContainer) {
        simContainer = document.createElement('div');
        simContainer.id = 'sim-ui-container';
        simContainer.style.marginBottom = '15px';
        const resultDiv = document.getElementById('result');
        if (resultDiv) resultDiv.insertBefore(simContainer, resultDiv.firstChild);
    }

    simContainer.innerHTML = '';

    const urlTickets = typeof UrlManager !== 'undefined' ? UrlManager.getParam('t') : null;
    const urlProgress = typeof UrlManager !== 'undefined' ? UrlManager.getParam('p') : null;

    if (urlTickets) {
        const [n, f, fg] = urlTickets.split('.').map(v => parseInt(v) || 0);
        window.viewData.ticketLimits = { nyanko: n, fukubiki: f, fukubikiG: fg };
    } else {
        const savedTickets = localStorage.getItem(TICKET_STORAGE_KEY);
        if (savedTickets) {
            try { window.viewData.ticketLimits = JSON.parse(savedTickets); } catch(e) {}
        }
    }
    
    if (urlProgress !== null) {
        window.viewData.checkedCount = parseInt(urlProgress) || 0;
    }

    const limits = window.viewData.ticketLimits;

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
<<<<<<< HEAD
    extraControls.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px; border-left: 1px solid #eee; padding-left: 10px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">にゃんこ:</label>
            <input type="number" id="simTicketNyanko" value="100" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">福引:</label>
            <input type="number" id="simTicketFukubiki" value="100" style="width: 60px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
=======
    
    extraControls.innerHTML = `
        <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; margin-left: 5px;">ルート検索</button>
        <button id="toggleRouteHighlightBtn" style="display: none; background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; margin-left: 0px;">ルート表示ON</button>
        <button id="toggleSimTextBtn" style="display: none; background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; margin-left: 0px;">テキスト表示OFF</button>
        <button id="toggleTableCheckBtn" style="display: none; background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; margin-left: 0px;">テーブル消し込みOFF</button>
        
        <div id="ticket-display-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; margin-left: 5px; user-select: none;" title="クリックで編集">
            <span style="font-size: 0.65rem; color: #888; line-height: 1; margin-bottom: 2px;">条件(所持数):</span>
            <div id="ticket-summary-container" style="padding: 0; font-size: 0.85rem; color: #007bff; text-decoration: underline; line-height: 1.2; display: inline; white-space: normal; background: transparent; border: none; box-shadow: none;">
                にゃんチケ:${limits.nyanko}、福引:${limits.fukubiki}、福引G:${limits.fukubikiG}
            </div>
        </div>

        <div id="ticket-inputs-area" style="display: none; align-items: center; flex-wrap: wrap; gap: 8px; border: 1px solid #eee; padding: 5px; border-radius: 4px; margin-left: 10px; background: #fff;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold; color: #555;">にゃんチケ:</label>
                <input type="number" id="simTicketNyanko" value="${limits.nyanko}" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold; color: #555;">福引:</label>
                <input type="number" id="simTicketFukubiki" value="${limits.fukubiki}" style="width: 60px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold; color: #555;">福引G:</label>
                <input type="number" id="simTicketFukubikiG" value="${limits.fukubikiG}" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <button id="updateTicketBtn" style="background-color: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold; margin-left: 5px;">更新</button>
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">福引G:</label>
            <input type="number" id="simTicketFukubikiG" value="100" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="display: flex; gap: 5px; margin-left: 5px;">
            <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">ルート検索</button>
            <button id="copySimResultBtn" style="background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">コピー</button>
            <button id="toggleHighlightBtn" style="background-color: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">ハイライト: ON</button>
            <button id="toggleCustomBtn" style="background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">カスタム</button>
        </div>
    `;

    controlRow.appendChild(extraControls);
    simGroup.appendChild(controlRow);

    const customPanel = createStyledElement('div', {
        display: 'none', marginTop: '10px', padding: '10px',
        borderTop: '1px dashed #ccc', backgroundColor: '#fdfdfd'
    }, { id: 'custom-weight-panel' });

    // チケットコスト設定セクション
    const ticketCostHtml = `
        <div style="background: #f0f0f0; padding: 8px; border-radius: 4px; margin-bottom: 12px;">
            <div style="font-size: 0.75rem; font-weight: bold; color: #444; margin-bottom: 5px;">チケット消費の重み (低いほど優先的に使用)</div>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <label style="font-size: 0.7rem;">にゃん:</label>
                    <input type="number" class="custom-cost-input" data-type="nyanko" value="${DEFAULT_ITEM_SCORES.costs.nyanko}" style="width: 45px; padding: 2px; font-size: 0.75rem;">
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <label style="font-size: 0.7rem;">福引G:</label>
                    <input type="number" class="custom-cost-input" data-type="fukubikiG" value="${DEFAULT_ITEM_SCORES.costs.fukubikiG}" style="width: 45px; padding: 2px; font-size: 0.75rem;">
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <label style="font-size: 0.7rem;">福引:</label>
                    <input type="number" class="custom-cost-input" data-type="fukubiki" value="${DEFAULT_ITEM_SCORES.costs.fukubiki}" style="width: 45px; padding: 2px; font-size: 0.75rem;">
                </div>
            </div>
        </div>
    `;

    const groupDefs = [
        { label: "闇猫目", key: "DARK_NEKOME", def: 1000000000 },
        { label: "トレレ", key: "TREASURE_RADAR", def: 100000000 },
        { label: "ビタンC", key: "VITAN_C", def: 10000000 },
        { label: "青玉", key: "BLUE_ORBS", isIndividualOnly: true },
        { label: "ちびキャラ", key: "CHIBI", isIndividualOnly: true },
        { label: "アイテム", key: "BATTLE_ITEMS", isIndividualOnly: true },
        { label: "XP", key: "XP", isIndividualOnly: true },
        { label: "ビタン", key: "VITAN", isIndividualOnly: true },
        { label: "基本キャラ", key: "BASIC", isIndividualOnly: true },
        { label: "猫目", key: "NEKOME", isIndividualOnly: true }
    ];

<<<<<<< HEAD
    let html = `<div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 8px; color: #666;">スコア重みづけ設定</div>`;
    html += `<div style="display: flex; flex-direction: column; gap: 5px;">`;
    groupDefs.forEach(g => { html += createGroupRowHtml(g.label, g.key, g.def); });

    html += `<div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
                <div style="font-size: 0.7rem; font-weight: bold; color: #888; margin-bottom: 5px;">チケット消費コスト (温存したいものを大きく減点)</div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <label style="font-size: 0.65rem;">にゃんこ:</label>
                        <input type="number" id="cost-nyanko" value="-1000" style="width: 70px; padding:2px; font-size:0.7rem; border:1px solid #ccc; border-radius:3px;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <label style="font-size: 0.65rem;">福引G:</label>
                        <input type="number" id="cost-fukubikiG" value="-100" style="width: 70px; padding:2px; font-size:0.7rem; border:1px solid #ccc; border-radius:3px;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <label style="font-size: 0.65rem;">福引:</label>
                        <input type="number" id="cost-fukubiki" value="-1" style="width: 70px; padding:2px; font-size:0.7rem; border:1px solid #ccc; border-radius:3px;">
                    </div>
                </div>
            </div>`;
    html += `</div>`;
    
    customPanel.innerHTML = html;
=======
    let headerHtml = `<div style="display: flex; justify-content: flex-start; align-items: center; gap: 10px; margin-bottom: 8px;"><div style="font-size: 0.75rem; font-weight: bold; color: #666;">スコア重みづけ設定</div><div id="reset-weights-btn" style="font-size: 0.7rem; color: #007bff; text-decoration: underline; cursor: pointer; user-select: none; display: inline-block;">リセット</div></div>`;
    let listHtml = `<div style="display: flex; flex-direction: column; gap: 5px;">`;
    groupDefs.forEach(g => { listHtml += createGroupRowHtml(g.label, g.key, g.def, g.isIndividualOnly); });
    listHtml += `</div>`;
    customPanel.innerHTML = headerHtml + ticketCostHtml + listHtml;
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
    simGroup.appendChild(customPanel);
    simContainer.appendChild(simGroup);

    document.getElementById('runSimBtn').onclick = runSimulation;
<<<<<<< HEAD
    document.getElementById('copySimResultBtn').onclick = copySimResult;
    document.getElementById('toggleHighlightBtn').onclick = toggleHighlightMode;
    document.getElementById('toggleCustomBtn').onclick = toggleCustomMode;
=======
    document.getElementById('toggleRouteHighlightBtn').onclick = toggleRouteHighlight;
    document.getElementById('toggleSimTextBtn').onclick = toggleSimTextMode;
    document.getElementById('toggleTableCheckBtn').onclick = toggleTableCheckMode;
    document.getElementById('custom-display-wrapper').onclick = toggleCustomMode;
    
    document.getElementById('reset-weights-btn').onclick = (e) => {
        e.stopPropagation();
        if (!confirm('スコア設定をすべてデフォルトに戻しますか？')) return;
        document.querySelectorAll('.custom-group-weight-input').forEach(input => {
            const key = input.dataset.key;
            input.value = DEFAULT_ITEM_SCORES.groups[key] || 0;
        });
        document.querySelectorAll('.custom-item-weight-input').forEach(input => { input.value = ""; });
        document.querySelectorAll('.custom-cost-input').forEach(input => {
            input.value = DEFAULT_ITEM_SCORES.costs[input.dataset.type];
        });
        saveSettingsToStorage();
    };

    const displayWrapper = document.getElementById('ticket-display-wrapper');
    const inputsArea = document.getElementById('ticket-inputs-area');
    const updateBtn = document.getElementById('updateTicketBtn');

    window.updateTicketSummary = () => {
        const nyanko = document.getElementById('simTicketNyanko').value;
        const fukubiki = document.getElementById('simTicketFukubiki').value;
        const fukubikiG = document.getElementById('simTicketFukubikiG').value;
        const summary = document.getElementById('ticket-summary-container');
        if (summary) summary.textContent = `にゃんチケ:${nyanko}、福引:${fukubiki}、福引G:${fukubikiG}`;
    };

    window.saveTicketSettingsToStorage = function() {
        const limits = window.viewData.ticketLimits;
        const elNyanko = document.getElementById('simTicketNyanko');
        const elFukubiki = document.getElementById('simTicketFukubiki');
        const elFukubikiG = document.getElementById('simTicketFukubikiG');

        if (elNyanko) elNyanko.value = limits.nyanko;
        if (elFukubiki) elFukubiki.value = limits.fukubiki;
        if (elFukubikiG) elFukubikiG.value = limits.fukubikiG;

        window.updateTicketSummary();
        localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(limits));
        
        if (typeof UrlManager !== 'undefined') {
            UrlManager.updateUrlParam('t', `${limits.nyanko}.${limits.fukubiki}.${limits.fukubikiG}`);
        }
    };

    const handleTicketInputChange = () => {
        window.viewData.ticketLimits = {
            nyanko: parseInt(document.getElementById('simTicketNyanko').value) || 0,
            fukubiki: parseInt(document.getElementById('simTicketFukubiki').value) || 0,
            fukubikiG: parseInt(document.getElementById('simTicketFukubikiG').value) || 0
        };
        window.saveTicketSettingsToStorage();
    };

    displayWrapper.onclick = () => { displayWrapper.style.display = 'none'; inputsArea.style.display = 'flex'; };
    updateBtn.onclick = () => { inputsArea.style.display = 'none'; displayWrapper.style.display = 'flex'; handleTicketInputChange(); };

    ['simTicketNyanko', 'simTicketFukubiki', 'simTicketFukubikiG'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', window.updateTicketSummary);
    });
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050

    customPanel.querySelectorAll('input').forEach(input => { input.addEventListener('change', saveSettingsToStorage); });

    loadSettingsFromStorage();
    updateHighlightButtonText();
    updateCustomButtonText();
<<<<<<< HEAD
    injectSimStyles();

    if (window.viewData.lastSimResult) displaySimulationResult(window.viewData.lastSimResult);
=======
    updateSimTextButtonState();
    updateRouteHighlightButtonState(); 
    updateTableCheckButtonState(); 
    window.updateTicketSummary();
    injectSimStyles();

    if (window.viewData.lastSimResult) {
        const hBtn = document.getElementById('toggleRouteHighlightBtn');
        const textBtn = document.getElementById('toggleSimTextBtn');
        const tableBtn = document.getElementById('toggleTableCheckBtn');
        if (hBtn) hBtn.style.display = 'inline-block';
        if (textBtn) textBtn.style.display = 'inline-block';
        if (tableBtn) tableBtn.style.display = 'inline-block';
        displaySimulationResult(window.viewData.lastSimResult);
    }
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
}

function createGroupRowHtml(label, key, defaultValue, isIndividualOnly = false) {
    const items = Object.keys(itemMaster).filter(id => getItemGroup(id) === key);
    const hasMultiple = items.length > 1;
    let itemsHtml = `<div id="items-panel-${key}" style="display:none; margin-left: 20px; padding: 5px; border-left: 2px solid #eee; background: #fafafa; margin-bottom: 5px;">`;
    items.forEach(id => {
        // デフォルト個別スコアがあれば表示
        const defItemScore = DEFAULT_ITEM_SCORES.items[id] || "";
        itemsHtml += `<div style="display: flex; align-items: center; gap: 5px; margin-bottom: 2px;"><label style="font-size: 0.65rem; width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemMaster[id].name}:</label><input type="number" class="custom-item-weight-input" data-itemid="${id}" placeholder="${defItemScore || 'グループ値'}" style="width: 80px; padding:1px; font-size:0.7rem; border:1px solid #ddd; border-radius:2px;"></div>`;
    });
    itemsHtml += `</div>`;
    const toggleBtn = hasMultiple ? `<button onclick="toggleItemPanel('${key}')" style="padding: 0 4px; min-width: 20px; font-size: 0.7rem; background: #eee; color: #333; border: 1px solid #ccc;">+</button>` : `<div style="min-width: 20px;"></div>`;
    
    const inputHtml = isIndividualOnly ? '' : `<input type="number" class="custom-group-weight-input" data-key="${key}" value="${defaultValue}" style="width: 80px; padding:2px; font-size:0.75rem; border:1px solid #ccc; border-radius:3px;">`;
    
    return `<div style="display: flex; align-items: center; gap: 5px;">${toggleBtn}<label style="font-size: 0.7rem; width: 80px;">${label}:</label>${inputHtml}</div>${itemsHtml}`;
}

window.toggleItemPanel = function(key) {
    const panel = document.getElementById(`items-panel-${key}`);
    const btn = event.target;
    if (!panel) return;
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    btn.textContent = isHidden ? '-' : '+';
};

function saveSettingsToStorage() {
<<<<<<< HEAD
    const settings = {
        isCustomMode: window.isCustomMode,
        costs: {
            nyanko: parseFloat(document.getElementById('cost-nyanko').value),
            fukubikiG: parseFloat(document.getElementById('cost-fukubikiG').value),
            fukubiki: parseFloat(document.getElementById('cost-fukubiki').value)
        },
        groups: {},
        items: {}
    };
    document.querySelectorAll('.custom-group-weight-input').forEach(input => {
        settings.groups[input.dataset.key] = parseFloat(input.value);
    });
    document.querySelectorAll('.custom-item-weight-input').forEach(input => {
        if (input.value !== "") settings.items[input.dataset.itemid] = parseFloat(input.value);
    });
=======
    const settings = { isCustomMode: window.isCustomMode, groups: {}, items: {}, costs: {} };
    document.querySelectorAll('.custom-group-weight-input').forEach(input => { settings.groups[input.dataset.key] = parseFloat(input.value); });
    document.querySelectorAll('.custom-item-weight-input').forEach(input => { if (input.value !== "") settings.items[input.dataset.itemid] = parseFloat(input.value); });
    document.querySelectorAll('.custom-cost-input').forEach(input => { settings.costs[input.dataset.type] = parseFloat(input.value); });
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (typeof UrlManager !== 'undefined') { UrlManager.updateUrlParam('w', compressWeights(settings)); }
}

function compressWeights(settings) {
    if (!window.isCustomMode) return '';
    const groupParts = [];
    document.querySelectorAll('.custom-group-weight-input').forEach(input => {
        const key = input.dataset.key;
        const val = parseFloat(input.value);
        const def = DEFAULT_ITEM_SCORES.groups[key] || 0;
        if (val !== def) { groupParts.push(`${WEIGHT_KEY_MAP[key] || key}.${val.toString(36)}`); }
    });
    const itemParts = [];
    document.querySelectorAll('.custom-item-weight-input').forEach(input => {
        const id = input.dataset.itemid;
        const val = parseFloat(input.value);
        if (!isNaN(val)) { const def = DEFAULT_ITEM_SCORES.items[id]; if (val !== def) itemParts.push(`${id}.${val.toString(36)}`); }
    });
    const costParts = [];
    document.querySelectorAll('.custom-cost-input').forEach(input => {
        const type = input.dataset.type;
        const val = parseFloat(input.value);
        const def = DEFAULT_ITEM_SCORES.costs[type] || 0;
        if (val !== def) {
            const short = type === 'nyanko' ? 'cn' : (type === 'fukubiki' ? 'cf' : 'cg');
            costParts.push(`${short}.${val.toString(36)}`);
        }
    });

    if (groupParts.length === 0 && itemParts.length === 0 && costParts.length === 0) return '';
    let res = groupParts.join('_');
    res += '|' + itemParts.join('_');
    if (costParts.length > 0) res += '|' + costParts.join('_');
    return res;
}

function decompressWeights(str) {
    if (!str) return null;
    const settings = { groups: {}, items: {}, costs: {} };
    const [gStr, iStr, cStr] = str.split('|');
    if (gStr) {
        gStr.split('_').forEach(part => {
            if (!part) return;
            const [shortKey, b36Val] = part.split('.');
            const fullKey = REVERSE_KEY_MAP[shortKey] || shortKey;
            const val = parseInt(b36Val, 36);
            if (!isNaN(val)) settings.groups[fullKey] = val;
        });
    }
    if (iStr) {
        iStr.split('_').forEach(part => {
            if (!part) return;
            const [id, b36Val] = part.split('.');
            const val = parseInt(b36Val, 36);
            if (!isNaN(val)) settings.items[id] = val;
        });
    }
    if (cStr) {
        cStr.split('_').forEach(part => {
            if (!part) return;
            const [short, b36Val] = part.split('.');
            const type = short === 'cn' ? 'nyanko' : (short === 'cf' ? 'fukubiki' : 'fukubikiG');
            const val = parseInt(b36Val, 36);
            if (!isNaN(val)) settings.costs[type] = val;
        });
    }
    return settings;
}

function loadSettingsFromStorage() {
<<<<<<< HEAD
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const settings = JSON.parse(saved);
        window.isCustomMode = !!settings.isCustomMode;
        if (settings.costs) {
            if (settings.costs.nyanko !== undefined) document.getElementById('cost-nyanko').value = settings.costs.nyanko;
            if (settings.costs.fukubikiG !== undefined) document.getElementById('cost-fukubikiG').value = settings.costs.fukubikiG;
            if (settings.costs.fukubiki !== undefined) document.getElementById('cost-fukubiki').value = settings.costs.fukubiki;
        }
        if (settings.groups) {
            document.querySelectorAll('.custom-group-weight-input').forEach(input => {
                if (settings.groups[input.dataset.key] !== undefined) input.value = settings.groups[input.dataset.key];
            });
        }
        if (settings.items) {
            document.querySelectorAll('.custom-item-weight-input').forEach(input => {
                if (settings.items[input.dataset.itemid] !== undefined) input.value = settings.items[input.dataset.itemid];
            });
        }
        const panel = document.getElementById('custom-weight-panel');
        if (panel) panel.style.display = window.isCustomMode ? 'block' : 'none';
    } catch (e) { console.error("Load failed", e); }
}

function toggleCustomMode() {
    window.isCustomMode = !window.isCustomMode;
=======
    let settings = null;
    const urlWeights = typeof UrlManager !== 'undefined' ? UrlManager.getParam('w') : null;
    if (urlWeights) { settings = decompressWeights(urlWeights); window.isCustomMode = true; }
    if (!settings) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { try { const parsed = JSON.parse(saved); settings = parsed; window.isCustomMode = !!parsed.isCustomMode; } catch (e) {} }
    }
    if (settings) {
        if (settings.groups) { document.querySelectorAll('.custom-group-weight-input').forEach(input => { if (settings.groups[input.dataset.key] !== undefined) input.value = settings.groups[input.dataset.key]; }); }
        if (settings.items) { document.querySelectorAll('.custom-item-weight-input').forEach(input => { if (settings.items[input.dataset.itemid] !== undefined) input.value = settings.items[input.dataset.itemid]; }); }
        if (settings.costs) { document.querySelectorAll('.custom-cost-input').forEach(input => { if (settings.costs[input.dataset.type] !== undefined) input.value = settings.costs[input.dataset.type]; }); }
    }
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
    const panel = document.getElementById('custom-weight-panel');
    if (panel) panel.style.display = window.isCustomMode ? 'block' : 'none';
    updateCustomButtonText();
}

<<<<<<< HEAD
function updateCustomButtonText() {
    const btn = document.getElementById('toggleCustomBtn');
    if (!btn) return;
    btn.textContent = window.isCustomMode ? 'カスタムON' : 'カスタム';
    btn.style.backgroundColor = window.isCustomMode ? '#28a745' : '#6c757d';
}

function runSimulation() {
    if (!viewData.calculatedData || !viewData.calculatedData.Nodes) {
        alert("データが計算されていません。先に「更新」ボタンを押してください。");
        return;
    }

    const limits = {
        nyanko: parseInt(document.getElementById('simTicketNyanko').value) || 0,
        fukubiki: parseInt(document.getElementById('simTicketFukubiki').value) || 0,
        fukubikiG: parseInt(document.getElementById('simTicketFukubikiG').value) || 0
=======
function toggleCustomMode() { window.isCustomMode = !window.isCustomMode; const panel = document.getElementById('custom-weight-panel'); if (panel) panel.style.display = window.isCustomMode ? 'block' : 'none'; updateCustomButtonText(); saveSettingsToStorage(); }
function updateCustomButtonText() { const btn = document.getElementById('toggleCustomBtn'); if (btn) btn.textContent = window.isCustomMode ? 'カスタムON' : 'カスタム'; }
function toggleSimTextMode() { window.viewData.showSimText = !window.viewData.showSimText; updateSimTextButtonState(); const display = document.getElementById('sim-result-text'); if (display) display.style.display = window.viewData.showSimText ? 'block' : 'none'; }
function updateSimTextButtonState() { const btn = document.getElementById('toggleSimTextBtn'); if (!btn) return; const isActive = !!window.viewData.showSimText; btn.textContent = isActive ? 'テキスト表示ON' : 'テキスト表示OFF'; btn.style.backgroundColor = isActive ? '#28a745' : '#6c757d'; }

/**
 * ルート表示ON/OFF（連動制限：アイディア1）
 */
function toggleRouteHighlight() {
    window.viewData.showSimHighlight = !window.viewData.showSimHighlight;
    if (!window.viewData.showSimHighlight) { window.viewData.isTableCheckMode = false; }
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
    if (window.viewData.isTableCheckMode) { window.viewData.showSimHighlight = true; }
    updateTableCheckButtonState();
    updateRouteHighlightButtonState();
    if (typeof generateTable === 'function') generateTable();
}

function updateTableCheckButtonState() {
    const btn = document.getElementById('toggleTableCheckBtn');
    if (!btn) return;
    const isActive = !!window.viewData.isTableCheckMode;
    btn.textContent = isActive ? 'テーブル消し込みON' : 'テーブル消し込みOFF';
    btn.style.backgroundColor = isActive ? '#28a745' : '#6c757d';
}

function runSimulation() {
    const seedInput = document.getElementById('seed');
    const initialSeed = parseInt(seedInput.value, 10);
    if (isNaN(initialSeed)) return;
    const limits = window.viewData.ticketLimits;
    
    // UI上の入力値を優先的に取得
    let weights = {
        groups: {},
        items: {},
        costs: {
            nyanko: parseFloat(document.querySelector('.custom-cost-input[data-type="nyanko"]')?.value) || DEFAULT_ITEM_SCORES.costs.nyanko,
            fukubikiG: parseFloat(document.querySelector('.custom-cost-input[data-type="fukubikiG"]')?.value) || DEFAULT_ITEM_SCORES.costs.fukubikiG,
            fukubiki: parseFloat(document.querySelector('.custom-cost-input[data-type="fukubiki"]')?.value) || DEFAULT_ITEM_SCORES.costs.fukubiki
        }
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
    };

    if (window.isCustomMode) {
<<<<<<< HEAD
        // UI上のマイナス値を正のコスト（減点値）に変換して渡す
        weights = { 
            groups: {}, items: {}, 
            costs: {
                nyanko: Math.abs(parseFloat(document.getElementById('cost-nyanko').value)) || 0,
                fukubikiG: Math.abs(parseFloat(document.getElementById('cost-fukubikiG').value)) || 0,
                fukubiki: Math.abs(parseFloat(document.getElementById('cost-fukubiki').value)) || 0
            }
        };
        document.querySelectorAll('.custom-group-weight-input').forEach(input => {
            weights.groups[input.dataset.key] = parseFloat(input.value) || 0;
        });
        document.querySelectorAll('.custom-item-weight-input').forEach(input => {
            if (input.value !== "") weights.items[input.dataset.itemid] = parseFloat(input.value);
        });
=======
        document.querySelectorAll('.custom-group-weight-input').forEach(input => { weights.groups[input.dataset.key] = parseFloat(input.value) || 0; });
        document.querySelectorAll('.custom-item-weight-input').forEach(input => { if (input.value !== "") weights.items[input.dataset.itemid] = parseFloat(input.value); });
    } else {
        weights = null; // カスタムモードOFF時はデフォルト値を使用
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
    }

    const { Nodes } = viewData.calculatedData;
    const activeGachaIds = viewData.gachaIds.filter(id => {
        if (id === "0" && !displayIds.includes("0") && displayIds.includes("64")) return false;
        if (id === "64" && !displayIds.includes("64") && displayIds.includes("0")) return false;
        return true;
    });
<<<<<<< HEAD
    
    const initialLastIds = {};
    activeGachaIds.forEach(id => { initialLastIds[id] = 'none'; });

    const result = runGachaSearch(Nodes, initialLastIds, limits, activeGachaIds, weights);
    window.viewData.lastSimResult = result;

    if (viewData) {
        viewData.highlightedRoute = new Map();
        if (result) {
            result.path.forEach(p => {
                const key = `${p.targetCell.addr}_${p.targetCell.gachaId}`;
                viewData.highlightedRoute.set(key, true);
            });
            viewData.showSimHighlight = true;
        }
        updateHighlightButtonText();
        if (typeof runSimulationAndDisplay === 'function') runSimulationAndDisplay();
=======

    const result = runGachaSearch(initialSeed, 'none', limits, activeGachaIds, weights);
    window.viewData.lastSimResult = result;
    if (result) {
        viewData.highlightedRoute = new Map();
        result.path.forEach((p, idx) => { viewData.highlightedRoute.set(`${p.addr}_${p.gachaId}`, idx); });
        viewData.showSimHighlight = true; 
        updateRouteHighlightButtonState();
        if (typeof generateTable === 'function') generateTable();
        const hBtn = document.getElementById('toggleRouteHighlightBtn');
        const textBtn = document.getElementById('toggleSimTextBtn');
        const tableBtn = document.getElementById('toggleTableCheckBtn');
        if (hBtn) hBtn.style.display = 'inline-block';
        if (textBtn) textBtn.style.display = 'inline-block';
        if (tableBtn) tableBtn.style.display = 'inline-block';
        const urlTickets = typeof UrlManager !== 'undefined' ? UrlManager.getParam('t') : null;
        if (!urlTickets) window.saveTicketSettingsToStorage();
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
    }
    displaySimulationResult(result);
}

/**
 * シミュレーション結果の表示
 */
function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    if (!display) return;
<<<<<<< HEAD
    display.style.display = 'block';
=======
    display.style.display = window.viewData.showSimText ? 'block' : 'none';
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
    display.innerHTML = "";
    if (!result || !result.path || result.path.length === 0) {
        display.textContent = result ? "完了、または有効なルートがありません。" : "ルートが見つかりませんでした。";
        window.lastSimText = "";
        return;
    }

    const header = createStyledElement('div', {
        fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #28a745',
        paddingBottom: '4px', fontSize: '0.95rem', color: '#155724'
    });
    header.textContent = `【ルート検索結果】(闇猫目:${result.counts.DARK_NEKOME} / トレレ:${result.counts.TREASURE_RADAR} / ビタンC:${result.counts.VITAN_C} / 青玉:${result.counts.BLUE_ORBS})`;
    display.appendChild(header);

    let plainText = `【ルート検索シミュレーション結果】\n(闇猫目:${result.counts.DARK_NEKOME}, トレレ:${result.counts.TREASURE_RADAR}, ビタンC:${result.counts.VITAN_C}, 青玉:${result.counts.BLUE_ORBS})\n\n`;
    
    let i = 0;
    let globalItemIdx = 0;

    while (i < result.path.length) {
        const rowStartIdx = i; 
        const currentGachaName = result.path[i].gachaName;
<<<<<<< HEAD
        const itemsHtml = [], itemsPlain = [];
        while (j < result.path.length && result.path[j].gachaId === currentGachaId) {
            const step = result.path[j];
            let label = step.isReroll ? " (被り)" : "";
            itemsHtml.push(getColoredItemHtml(step.item) + label);
            itemsPlain.push(step.item + label);
=======
        const row = createStyledElement('div', {
            display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '3px'
        });

        const cb = createStyledElement('input', { marginTop: '3px', cursor: 'pointer' }, { type: 'checkbox' });
        const spanContainer = createStyledElement('span', { lineHeight: '1.4', flex: '1' });
        
        const rowHeader = createStyledElement('span', { color: '#d9534f', fontWeight: 'bold' }, { textContent: `[${currentGachaName}] ` });
        spanContainer.appendChild(rowHeader);

        const itemsInGroup = [];
        let j = i;
        while (j < result.path.length && result.path[j].gachaName === currentGachaName) {
            const currentIdx = globalItemIdx; 
            const step = result.path[j];
            const isChecked = currentIdx < window.viewData.checkedCount;

            const itemSpan = createStyledElement('span', {
                cursor: 'pointer', transition: 'all 0.1s',
                textDecoration: isChecked ? 'line-through' : 'none',
                opacity: isChecked ? '0.4' : '1', padding: '0 2px', borderRadius: '2px'
            }, { className: 'sim-item-clickable' });

            itemSpan.innerHTML = getColoredItemHtml(step.item) + (step.isReroll ? " (被り)" : "") + `<small style="color:#888; margin-left:2px;">(${step.addr})</small>`;
            
            itemSpan.onclick = (e) => {
                e.stopPropagation();
                window.viewData.checkedCount = currentIdx + 1;
                if (typeof UrlManager !== 'undefined') UrlManager.updateUrlParam('p', window.viewData.checkedCount);
                if (typeof generateTable === 'function') generateTable();
                displaySimulationResult(result);
            };

            itemsInGroup.push(itemSpan);
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
            j++;
            globalItemIdx++;
        }
<<<<<<< HEAD
        const count = j - i;
        const addr = result.path[i].addr;
        const rowHeader = `<span style="color: #d9534f; font-weight: bold;">[${currentGachaName}]</span> ${count}回 (${addr}～):<br>`;
        const html = "　=> " + itemsHtml.join('、');
        const plain = `[${currentGachaName}] ${count}回 (${addr}～) => ` + itemsPlain.join('、');
        display.appendChild(createResultRow(rowHeader + html));
        plainText += plain + "\n";
=======

        const lastIdxInRow = globalItemIdx;
        cb.checked = lastIdxInRow <= window.viewData.checkedCount;
        cb.onchange = () => {
            window.viewData.checkedCount = cb.checked ? lastIdxInRow : rowStartIdx;
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrlParam('p', window.viewData.checkedCount);
            if (typeof generateTable === 'function') generateTable();
            displaySimulationResult(result);
        };

        const countText = document.createTextNode(`${itemsInGroup.length}回 (${result.path[i].addr}～) => `);
        spanContainer.appendChild(countText);
        
        itemsInGroup.forEach((it, idx) => {
            spanContainer.appendChild(it);
            if (idx < itemsInGroup.length - 1) spanContainer.appendChild(document.createTextNode('、'));
        });

        row.append(cb, spanContainer);
        display.appendChild(row);
        
        plainText += `[${currentGachaName}] ${itemsInGroup.length}回 (${result.path[i].addr}～) => ` + 
                     result.path.slice(i, j).map(p => `${p.item}${p.isReroll ? '(被り)' : ''}(${p.addr})`).join('、') + "\n";
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
        i = j;
    }
    window.lastSimText = plainText;
}

function getColoredItemHtml(name) {
    const item = Object.values(itemMaster).find(it => it.name === name);
    if (!item) return name;
    if (item.name === "闇猫目") return `<span style="color: #0000ff; font-weight: bold; background-color: #ffff00;">${name}</span>`;
    if (item.name === "トレレ") return `<span style="color: #0000ff; font-weight: bold;">${name}</span>`;
    if (item.name === "ビタンC") return `<span style="color: #d9534f; font-weight: bold;">${name}</span>`;
    const itemId = Object.keys(itemMaster).find(key => itemMaster[key].name === name);
    if (parseInt(itemId) >= 1000 && parseInt(itemId) <= 1008) return `<span style="color: #c0a000; font-weight: bold;">${name}</span>`;
    if (item.rarity === 4) return `<span style="color: #0000ff; font-weight: bold;">${name}</span>`;
    if (item.rarity === 3) return `<span style="color: #d9534f; font-weight: bold;">${name}</span>`;
    if (item.rarity === 2) return `<span style="color: #c0a000; font-weight: bold;">${name}</span>`;
    return name;
}

function toggleHighlightMode() {
    viewData.showSimHighlight = !viewData.showSimHighlight;
    updateHighlightButtonText();
    if (typeof runSimulationAndDisplay === 'function') runSimulationAndDisplay();
}

function updateHighlightButtonText() {
    const btn = document.getElementById('toggleHighlightBtn');
    if (!btn) return;
    btn.textContent = viewData.showSimHighlight ? 'ハイライト: ON' : 'ハイライト: OFF';
    btn.style.backgroundColor = viewData.showSimHighlight ? '#007bff' : '#6c757d';
}

function copySimResult() {
    if (!window.lastSimText) return;
    navigator.clipboard.writeText(window.lastSimText).then(() => {
        const btn = document.getElementById('copySimResultBtn');
        const old = btn.textContent;
        btn.textContent = '完了';
        btn.style.backgroundColor = '#28a745';
        setTimeout(() => { btn.textContent = old; btn.style.backgroundColor = '#6c757d'; }, 1000);
    });
}

function injectSimStyles() {
    if (document.getElementById('sim-styles')) return;
    const style = document.createElement('style');
    style.id = 'sim-styles';
    style.textContent = `
        .sim-route-remaining { background-color: #00e676 !important; }
        .sim-route-checked { background-color: #c8e6c9 !important; }
        .sim-item-clickable:hover { background-color: #e2e8f0; }
        .custom-item-weight-input::-webkit-inner-spin-button, 
        .custom-item-weight-input::-webkit-outer-spin-button { opacity: 1; }
    `;
    document.head.appendChild(style);
}
