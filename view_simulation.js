/**
 * view_simulation.js
 * 担当: ルート検索UI（トグルボタンの動的表示制御版）
 */

const STORAGE_KEY = 'nrolls_custom_weights_v2';

/**
 * スタイル付き要素を生成する共通関数
 */
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
    
    // レイアウト: [ルート検索] -> [テキスト表示トグル(初期非表示)] -> [条件(所持数)] -> [スコア設定]
    extraControls.innerHTML = `
        <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; margin-left: 5px;">ルート検索</button>
        <button id="toggleSimTextBtn" style="display: none; background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; margin-left: 0px;">テキスト表示OFF</button>
        
        <div id="ticket-display-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; margin-left: 5px; user-select: none;" title="クリックで編集">
            <span style="font-size: 0.65rem; color: #888; line-height: 1; margin-bottom: 2px;">条件(所持数):</span>
            <div id="ticket-summary-container" style="padding: 0; font-size: 0.85rem; color: #007bff; text-decoration: underline; line-height: 1.2; display: inline; white-space: normal; background: transparent; border: none; box-shadow: none;">
                にゃんチケ:100、福引:100、福引G:100
            </div>
        </div>

        <div id="ticket-inputs-area" style="display: none; align-items: center; flex-wrap: wrap; gap: 8px; border: 1px solid #eee; padding: 5px; border-radius: 4px; margin-left: 10px; background: #fff;">
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold; color: #555;">にゃんチケ:</label>
                <input type="number" id="simTicketNyanko" value="100" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold; color: #555;">福引:</label>
                <input type="number" id="simTicketFukubiki" value="100" style="width: 60px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <label style="font-size: 0.8rem; font-weight: bold; color: #555;">福引G:</label>
                <input type="number" id="simTicketFukubikiG" value="100" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <button id="updateTicketBtn" style="background-color: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: bold; margin-left: 5px;">更新</button>
        </div>

        <div id="custom-display-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; cursor: pointer; margin-left: 10px; user-select: none;">
            <span style="font-size: 0.65rem; color: #888; line-height: 1; margin-bottom: 2px;">スコア設定:</span>
            <span id="toggleCustomBtn" style="color: #007bff; text-decoration: underline; font-size: 0.85rem; line-height: 1.2;">カスタム</span>
        </div>
    `;

    controlRow.appendChild(extraControls);
    simGroup.appendChild(controlRow);

    const customPanel = createStyledElement('div', {
        display: 'none', marginTop: '10px', padding: '10px',
        borderTop: '1px dashed #ccc', backgroundColor: '#fdfdfd'
    }, { id: 'custom-weight-panel' });

    const groupDefs = [
        { label: "闇猫目", key: "DARK_NEKOME", def: 1000000000 },
        { label: "トレレ", key: "TREASURE_RADAR", def: 100000000 },
        { label: "ビタンC", key: "VITAN_C", def: 10000000 },
        { label: "青玉", key: "BLUE_ORBS", def: 1000000 },
        { label: "ちびキャラ", key: "CHIBI", def: 100000 },
        { label: "アイテム", key: "BATTLE_ITEMS", def: 10000 },
        { label: "XP", key: "XP", def: 1000 },
        { label: "ビタン", key: "VITAN", def: 100 },
        { label: "基本キャラ", key: "BASIC", def: 10 },
        { label: "猫目", key: "NEKOME", def: 1 }
    ];

    let html = `<div style="font-size: 0.75rem; font-weight: bold; margin-bottom: 8px; color: #666;">スコア重みづけ設定</div>`;
    html += `<div style="display: flex; flex-direction: column; gap: 5px;">`;
    groupDefs.forEach(g => { html += createGroupRowHtml(g.label, g.key, g.def); });
    html += `</div>`;
    
    customPanel.innerHTML = html;
    simGroup.appendChild(customPanel);
    simContainer.appendChild(simGroup);

    const resultDisplay = createStyledElement('div', {
        marginTop: '10px', padding: '15px', border: '1px solid #28a745',
        backgroundColor: '#f9fff9', whiteSpace: 'pre-wrap', fontFamily: 'monospace',
        fontSize: '0.85rem', display: 'none', borderRadius: '8px', lineHeight: '1.4'
    }, { id: 'sim-result-text' });

    simContainer.appendChild(resultDisplay);

    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('toggleSimTextBtn').onclick = toggleSimTextMode;
    document.getElementById('custom-display-wrapper').onclick = toggleCustomMode;

    const displayWrapper = document.getElementById('ticket-display-wrapper');
    const summaryContainer = document.getElementById('ticket-summary-container');
    const inputsArea = document.getElementById('ticket-inputs-area');
    const updateBtn = document.getElementById('updateTicketBtn');

    const updateTicketSummary = () => {
        const nyanko = document.getElementById('simTicketNyanko').value;
        const fukubiki = document.getElementById('simTicketFukubiki').value;
        const fukubikiG = document.getElementById('simTicketFukubikiG').value;
        summaryContainer.textContent = `にゃんチケ:${nyanko}、福引:${fukubiki}、福引G:${fukubikiG}`;
    };

    displayWrapper.onclick = () => {
        displayWrapper.style.display = 'none';
        inputsArea.style.display = 'flex';
    };

    updateBtn.onclick = () => {
        inputsArea.style.display = 'none';
        displayWrapper.style.display = 'flex';
    };
    
    displayWrapper.onmouseover = () => { 
        summaryContainer.style.color = '#0056b3';
    };
    displayWrapper.onmouseout = () => { 
        summaryContainer.style.color = '#007bff';
    };

    ['simTicketNyanko', 'simTicketFukubiki', 'simTicketFukubikiG'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateTicketSummary);
    });

    customPanel.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', saveSettingsToStorage);
    });

    loadSettingsFromStorage();
    updateCustomButtonText();
    updateSimTextButtonState();
    updateTicketSummary();
    injectSimStyles();

    if (window.viewData.lastSimResult) {
        // すでに結果がある場合はボタンを表示
        const btn = document.getElementById('toggleSimTextBtn');
        if (btn) btn.style.display = 'inline-block';
        displaySimulationResult(window.viewData.lastSimResult);
    }
}

function createGroupRowHtml(label, key, defaultValue) {
    const items = Object.keys(itemMaster).filter(id => getItemGroup(id) === key);
    const hasMultiple = items.length > 1;
    
    let itemsHtml = `<div id="items-panel-${key}" style="display:none; margin-left: 20px; padding: 5px; border-left: 2px solid #eee; background: #fafafa; margin-bottom: 5px;">`;
    items.forEach(id => {
        const defItemScore = DEFAULT_ITEM_SCORES.items[id] || "";
        itemsHtml += `
            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
                <label style="font-size: 0.65rem; width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemMaster[id].name}:</label>
                <input type="number" class="custom-item-weight-input" data-itemid="${id}" placeholder="${defItemScore || 'グループ値'}" style="width: 80px; padding:1px; font-size:0.7rem; border:1px solid #ddd; border-radius:2px;">
            </div>`;
    });
    itemsHtml += `</div>`;

    const toggleBtn = hasMultiple 
        ? `<button onclick="toggleItemPanel('${key}')" style="padding: 0 4px; min-width: 20px; font-size: 0.7rem; background: #eee; color: #333; border: 1px solid #ccc;">+</button>`
        : `<div style="min-width: 20px;"></div>`;

    return `
        <div style="display: flex; align-items: center; gap: 5px;">
            ${toggleBtn}
            <label style="font-size: 0.7rem; width: 80px;">${label}:</label>
            <input type="number" class="custom-group-weight-input" data-key="${key}" value="${defaultValue}" style="width: 80px; padding:2px; font-size:0.75rem; border:1px solid #ccc; border-radius:3px;">
        </div>
        ${itemsHtml}
    `;
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
    const settings = {
        isCustomMode: window.isCustomMode,
        groups: {},
        items: {}
    };
    document.querySelectorAll('.custom-group-weight-input').forEach(input => {
        settings.groups[input.dataset.key] = parseFloat(input.value);
    });
    document.querySelectorAll('.custom-item-weight-input').forEach(input => {
        if (input.value !== "") settings.items[input.dataset.itemid] = parseFloat(input.value);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadSettingsFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const settings = JSON.parse(saved);
        window.isCustomMode = !!settings.isCustomMode;
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
        updateCustomButtonText();
    } catch (e) { console.error("Load failed", e); }
}

function toggleCustomMode() {
    window.isCustomMode = !window.isCustomMode;
    const panel = document.getElementById('custom-weight-panel');
    if (panel) panel.style.display = window.isCustomMode ? 'block' : 'none';
    updateCustomButtonText();
    saveSettingsToStorage();
}

function updateCustomButtonText() {
    const btn = document.getElementById('toggleCustomBtn');
    if (!btn) return;
    btn.textContent = window.isCustomMode ? 'カスタムON' : 'カスタム';
}

/**
 * テキスト表示モードの切り替え
 */
function toggleSimTextMode() {
    window.viewData.showSimText = !window.viewData.showSimText;
    updateSimTextButtonState();
    
    const display = document.getElementById('sim-result-text');
    if (display) {
        display.style.display = window.viewData.showSimText ? 'block' : 'none';
    }
}

/**
 * テキスト表示ボタンのスタイル更新
 */
function updateSimTextButtonState() {
    const btn = document.getElementById('toggleSimTextBtn');
    if (!btn) return;
    const isActive = !!window.viewData.showSimText;
    btn.textContent = isActive ? 'テキスト表示ON' : 'テキスト表示OFF';
    btn.style.backgroundColor = isActive ? '#28a745' : '#6c757d';
}

function runSimulation() {
    const seedInput = document.getElementById('seed');
    const initialSeed = parseInt(seedInput.value, 10);
    if (isNaN(initialSeed)) {
        alert("有効なシード値を入力してください。");
        return;
    }

    const limits = {
        nyanko: parseInt(document.getElementById('simTicketNyanko').value) || 0,
        fukubiki: parseInt(document.getElementById('simTicketFukubiki').value) || 0,
        fukubikiG: parseInt(document.getElementById('simTicketFukubikiG').value) || 0
    };

    let weights = null;
    if (window.isCustomMode) {
        weights = { 
            groups: {}, items: {}, 
            costs: { nyanko: 1000, fukubikiG: 100, fukubiki: 1 } 
        };
        document.querySelectorAll('.custom-group-weight-input').forEach(input => {
            weights.groups[input.dataset.key] = parseFloat(input.value) || 0;
        });
        document.querySelectorAll('.custom-item-weight-input').forEach(input => {
            if (input.value !== "") weights.items[input.dataset.itemid] = parseFloat(input.value);
        });
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
        result.path.forEach(p => {
            const key = `${p.addr}_${p.gachaId}`;
            viewData.highlightedRoute.set(key, true);
        });
        viewData.showSimHighlight = true;
        if (typeof generateTable === 'function') generateTable();
        
        // 検索実行後にボタンを表示
        const toggleBtn = document.getElementById('toggleSimTextBtn');
        if (toggleBtn) toggleBtn.style.display = 'inline-block';
    }
    displaySimulationResult(result);
}

function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    if (!display) return;
    
    display.style.display = window.viewData.showSimText ? 'block' : 'none';
    display.innerHTML = "";

    if (!result) {
        display.textContent = "指定された枚数内で有効なルートが見つかりませんでした。";
        window.lastSimText = "";
        return;
    }

    const header = createStyledElement('div', {
        fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #28a745',
        paddingBottom: '4px', fontSize: '0.95rem', color: '#155724'
    });
    header.textContent = `【ルート検索結果】(闇猫目:${result.counts.DARK_NEKOME} / トレレ:${result.counts.TREASURE_RADAR})`;
    display.appendChild(header);

    let plainText = `【ルート検索シミュレーション結果】\n(闇猫目:${result.counts.DARK_NEKOME}, トレレ:${result.counts.TREASURE_RADAR})\n\n`;
    
    let i = 0;
    while (i < result.path.length) {
        let j = i;
        const currentGachaId = result.path[i].gachaId;
        const currentGachaName = result.path[i].gachaName;
        const itemsHtml = [], itemsPlain = [];
        while (j < result.path.length && result.path[j].gachaName === currentGachaName) {
            const step = result.path[j];
            let label = step.isReroll ? " (被り)" : "";
            itemsHtml.push(getColoredItemHtml(step.item) + label + `<small style="color:#888; margin-left:2px;">(${step.addr})</small>`);
            itemsPlain.push(`${step.item}${label}(${step.addr})`);
            j++;
        }
        const count = j - i;
        const startAddr = result.path[i].addr;
        const rowHeader = `<span style="color: #d9534f; font-weight: bold;">[${currentGachaName}]</span> ${count}回 (${startAddr}～):<br>`;
        const html = "　=> " + itemsHtml.join('、');
        const plain = `[${currentGachaName}] ${count}回 (${startAddr}～) => ` + itemsPlain.join('、');
        display.appendChild(createResultRow(rowHeader + html));
        plainText += plain + "\n";
        i = j;
    }
    window.lastSimText = plainText;
}

function createResultRow(innerHTML) {
    const row = createStyledElement('div', {
        display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '3px'
    });
    const cb = createStyledElement('input', { marginTop: '3px', cursor: 'pointer' }, { type: 'checkbox' });
    const span = createStyledElement('span', { lineHeight: '1.4', flex: '1' }, { innerHTML });
    cb.onchange = () => {
        span.style.color = cb.checked ? '#aaa' : '#333';
        span.style.textDecoration = cb.checked ? 'line-through' : 'none';
    };
    row.append(cb, span);
    return row;
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

function injectSimStyles() {
    if (document.getElementById('sim-styles')) return;
    const style = document.createElement('style');
    style.id = 'sim-styles';
    style.textContent = `
        .sim-highlighted { background-color: #c8e6c9 !important; }
        .custom-item-weight-input::-webkit-inner-spin-button, 
        .custom-item-weight-input::-webkit-outer-spin-button { opacity: 1; }
    `;
    document.head.appendChild(style);
}
