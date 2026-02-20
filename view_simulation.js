/**
 * view_simulation.js
 * 担当: ルート検索UI・詳細カスタム設定（チケット別コスト・表示制御・LocalStorage対応版）
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
    extraControls.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px; border-left: 1px solid #eee; padding-left: 10px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">にゃんこ:</label>
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
    simGroup.appendChild(customPanel);
    simContainer.appendChild(simGroup);

    const resultDisplay = createStyledElement('div', {
        marginTop: '10px', padding: '15px', border: '1px solid #28a745',
        backgroundColor: '#f9fff9', whiteSpace: 'pre-wrap', fontFamily: 'monospace',
        fontSize: '0.85rem', display: 'none', borderRadius: '8px', lineHeight: '1.4'
    }, { id: 'sim-result-text' });

    simContainer.appendChild(resultDisplay);

    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('copySimResultBtn').onclick = copySimResult;
    document.getElementById('toggleHighlightBtn').onclick = toggleHighlightMode;
    document.getElementById('toggleCustomBtn').onclick = toggleCustomMode;

    customPanel.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', saveSettingsToStorage);
    });

    loadSettingsFromStorage();
    updateHighlightButtonText();
    updateCustomButtonText();
    injectSimStyles();

    if (window.viewData.lastSimResult) displaySimulationResult(window.viewData.lastSimResult);
}

function createGroupRowHtml(label, key, defaultValue) {
    const items = Object.keys(itemMaster).filter(id => getItemGroup(id) === key);
    const hasMultiple = items.length > 1;
    
    let itemsHtml = `<div id="items-panel-${key}" style="display:none; margin-left: 20px; padding: 5px; border-left: 2px solid #eee; background: #fafafa; margin-bottom: 5px;">`;
    items.forEach(id => {
        // デフォルト個別スコアがあれば表示
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadSettingsFromStorage() {
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
    const panel = document.getElementById('custom-weight-panel');
    if (panel) panel.style.display = window.isCustomMode ? 'block' : 'none';
    updateCustomButtonText();
    saveSettingsToStorage();
}

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
    };

    let weights = null;
    if (window.isCustomMode) {
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
    }

    const { Nodes } = viewData.calculatedData;
    const activeGachaIds = viewData.gachaIds.filter(id => {
        if (id === "0" && !displayIds.includes("0") && displayIds.includes("64")) return false;
        if (id === "64" && !displayIds.includes("64") && displayIds.includes("0")) return false;
        return true;
    });
    
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
    }
    displaySimulationResult(result);
}

function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    if (!display) return;
    display.style.display = 'block';
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
    header.textContent = `【ルート検索結果】(闇猫目:${result.counts.DARK_NEKOME} / トレレ:${result.counts.TREASURE_RADAR} / ビタンC:${result.counts.VITAN_C} / 青玉:${result.counts.BLUE_ORBS})`;
    display.appendChild(header);

    let plainText = `【ルート検索シミュレーション結果】\n(闇猫目:${result.counts.DARK_NEKOME}, トレレ:${result.counts.TREASURE_RADAR}, ビタンC:${result.counts.VITAN_C}, 青玉:${result.counts.BLUE_ORBS})\n\n`;
    
    let i = 0;
    while (i < result.path.length) {
        let j = i;
        const currentGachaId = result.path[i].gachaId;
        const currentGachaName = result.path[i].gachaName;
        const itemsHtml = [], itemsPlain = [];
        while (j < result.path.length && result.path[j].gachaId === currentGachaId) {
            const step = result.path[j];
            let label = step.isReroll ? " (被り)" : "";
            itemsHtml.push(getColoredItemHtml(step.item) + label);
            itemsPlain.push(step.item + label);
            j++;
        }
        const count = j - i;
        const addr = result.path[i].addr;
        const rowHeader = `<span style="color: #d9534f; font-weight: bold;">[${currentGachaName}]</span> ${count}回 (${addr}～):<br>`;
        const html = "　=> " + itemsHtml.join('、');
        const plain = `[${currentGachaName}] ${count}回 (${addr}～) => ` + itemsPlain.join('、');
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
        .sim-highlighted { background-color: #c8e6c9 !important; }
        .custom-item-weight-input::-webkit-inner-spin-button, 
        .custom-item-weight-input::-webkit-outer-spin-button { opacity: 1; }
    `;
    document.head.appendChild(style);
}
