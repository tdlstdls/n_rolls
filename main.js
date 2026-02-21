/**
 * main.js (状態管理統合・4列表示不具合修正版)
 */

const TARGET_GACHA_IDS = ["0", "64", "62", "63", "65"];

// シミュレーションおよび表示用の状態をすべてグローバルに集約
window.viewData = {
    calculatedData: null,
    gachaIds: TARGET_GACHA_IDS, 
    displayIds: ["64", "62", "63"], // 現在表示中のガチャID
    displayRollCount: 100,           // 表示行数
    isFourColumnMode: false,        // 4列表示モード
    highlightedRoute: new Map(),
    showSimHighlight: true,
    lastSimResult: null,
    ticketLimits: { nyanko: 100, fukubiki: 300, fukubikiG: 200 },
    checkedCount: 0, 
    isTableCheckMode: false,
    showSimText: false
};

/**
 * SEED要約表示の数値を更新
 */
function updateSeedSummary() {
    const seedInput = document.getElementById('seed');
    const seedSummaryText = document.getElementById('seed-summary-text');
    if (seedInput && seedSummaryText) {
        seedSummaryText.textContent = seedInput.value;
    }
}

/**
 * カラム切り替え（切替ボタン）
 */
window.toggleGacha = function(currentId) {
    if (window.viewData.isFourColumnMode && (currentId === "63" || currentId === "65")) return;

    const toggleMap = { "64": "0", "0": "64", "63": "65", "65": "63" };
    const targetId = toggleMap[currentId];
    if (targetId) {
        const idx = window.viewData.displayIds.indexOf(currentId);
        if (idx !== -1) {
            window.viewData.displayIds[idx] = targetId;
            generateTable(); 
        }
    }
};

/**
 * 4列表示モードの切り替え
 */
window.toggleFourColumnMode = function() {
    window.viewData.isFourColumnMode = !window.viewData.isFourColumnMode;
    
    if (window.viewData.isFourColumnMode) {
        const firstId = window.viewData.displayIds.includes("0") ? "0" : "64";
        window.viewData.displayIds = [firstId, "62", "63", "65"];
    } else {
        window.viewData.displayIds = window.viewData.displayIds.filter(id => id !== "65");
        if (!window.viewData.displayIds.includes("63")) {
            const idx = window.viewData.displayIds.indexOf("65");
            if (idx !== -1) window.viewData.displayIds[idx] = "63";
            else if (window.viewData.displayIds.length < 3) window.viewData.displayIds.push("63");
        }
    }
    generateTable();
};

/**
 * トースト通知
 */
function showSimToast(message) {
    const existing = document.querySelector('.sim-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'sim-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); } }, 2500);
}

/**
 * セルクリック統合ハンドラ
 */
window.handleCellClick = function(finalSeed, addr, gachaId) {
    const highlightKey = `${addr}_${gachaId}`;
    const routeIdx = window.viewData.highlightedRoute.get(highlightKey);

    if (window.viewData.isTableCheckMode) {
        if (routeIdx !== undefined) {
            window.viewData.checkedCount = routeIdx + 1;
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrlParam('p', window.viewData.checkedCount);
            if (typeof displaySimulationResult === 'function' && window.viewData.lastSimResult) {
                displaySimulationResult(window.viewData.lastSimResult);
            }
            generateTable();
        } else {
            showSimToast("消し込みモード：ルート外のセルはタップ無効です");
        }
    } else {
        window.updateSeedAndRefresh(finalSeed, addr, gachaId);
    }
};

/**
 * SEED更新とテーブル再描画
 */
window.updateSeedAndRefresh = function(newSeed, clickedAddr, clickedGachaId) {
    if (window.viewData.lastSimResult && window.viewData.lastSimResult.path) {
        const path = window.viewData.lastSimResult.path;
        const clickedIndex = path.findIndex(p => p.addr === clickedAddr && p.gachaId === clickedGachaId);

        if (clickedIndex !== -1) {
            const consumed = { nyanko: 0, fukubiki: 0, fukubikiG: 0 };
            for (let i = 0; i <= clickedIndex; i++) {
                const type = GACHA_TICKET_TYPES[path[i].gachaId];
                if (type) consumed[type]++;
            }
            window.viewData.ticketLimits.nyanko = Math.max(0, window.viewData.ticketLimits.nyanko - consumed.nyanko);
            window.viewData.ticketLimits.fukubiki = Math.max(0, window.viewData.ticketLimits.fukubiki - consumed.fukubiki);
            window.viewData.ticketLimits.fukubikiG = Math.max(0, window.viewData.ticketLimits.fukubikiG - consumed.fukubikiG);

            if (typeof window.saveTicketSettingsToStorage === 'function') window.saveTicketSettingsToStorage();
            window.viewData.checkedCount = 0;
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrlParam('p', 0);
        }
    }

    const seedInput = document.getElementById('seed');
    if (seedInput) {
        seedInput.value = newSeed;
        updateSeedSummary(); 
        if (typeof UrlManager !== 'undefined') UrlManager.updateUrl(newSeed);
        generateTable();
    }
};

function applyCurrentSeed() {
    const seedInput = document.getElementById('seed');
    const seedDisplayWrapper = document.getElementById('seed-display-wrapper');
    const seedEditControls = document.getElementById('seed-edit-controls');

    updateSeedSummary();
    if (typeof UrlManager !== 'undefined') UrlManager.updateUrl(seedInput.value);
    if (seedEditControls) seedEditControls.style.display = 'none';
    if (seedDisplayWrapper) seedDisplayWrapper.style.display = 'flex';
    generateTable();
}

document.addEventListener('DOMContentLoaded', () => {
    const seedInput = document.getElementById('seed');
    if (typeof UrlManager !== 'undefined') UrlManager.init(seedInput);
    
    const seedDisplayWrapper = document.getElementById('seed-display-wrapper');
    const seedEditControls = document.getElementById('seed-edit-controls');
    const updateSeedUiBtn = document.getElementById('update-seed-ui-btn');

    if (seedDisplayWrapper) {
        seedDisplayWrapper.onclick = () => {
            seedDisplayWrapper.style.display = 'none';
            seedEditControls.style.display = 'flex';
            seedInput.focus();
            seedInput.select();
        };
        updateSeedUiBtn.onclick = () => applyCurrentSeed();
        seedInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyCurrentSeed(); });
    }

    const bottomControls = document.getElementById('bottom-controls');
    if (bottomControls) {
        const addRowsBtn = document.createElement('button');
        addRowsBtn.textContent = '+100行追加';
        addRowsBtn.style.backgroundColor = '#6c757d';
        addRowsBtn.onclick = () => { window.viewData.displayRollCount += 100; generateTable(); };
        bottomControls.appendChild(addRowsBtn);
    }

    if (typeof ConfirmManager !== 'undefined') ConfirmManager.init(() => generateTable());

    updateSeedSummary(); 
    generateTable();
});

function formatAddress(idx) {
    const row = (idx >> 1) + 1;
    const side = (idx % 2 === 0) ? 'A' : 'B';
    return side + row;
}

function generateTable() {
    const seedInput = document.getElementById('seed');
    let seed = parseInt(seedInput.value, 10);
    if (isNaN(seed)) seed = 12345;

    const container = document.getElementById('rolls-table-container');
    const resultArea = document.getElementById('result');
    container.innerHTML = '<div class="loading">計算中...</div>';
    resultArea.style.display = 'block';

    const isModeActive = (typeof ConfirmManager !== 'undefined' && ConfirmManager.isActive);
    const displayIds = window.viewData.displayIds;
    const isFourColumnMode = window.viewData.isFourColumnMode;

    let masterHtml = isModeActive ? ConfirmManager.generateMasterInfoHtml(displayIds, gachaMaster, itemMaster) : '';
    const fourColBtnText = isFourColumnMode ? '4列表示ON' : '4列表示OFF';
    const fourColBtnColor = isFourColumnMode ? '#28a745' : '#6c757d';
    const fourColBtnHtml = `<button onclick="toggleFourColumnMode()" style="margin-left:10px; padding:2px 5px; font-size:0.6rem; background:${fourColBtnColor}; color:#fff; border:none; border-radius:3px; cursor:pointer; vertical-align:middle;">${fourColBtnText}</button>`;

    let html = masterHtml + '<table>';
    const extraCols = isModeActive ? 2 : 0;
    const trackColSpan = displayIds.length + extraCols;
    
    html += `<tr><th class="col-num" rowspan="2">NO.</th><th colspan="${trackColSpan}" class="track-header track-a">Track A${fourColBtnHtml}</th><th colspan="${trackColSpan}" class="track-header track-b">Track B</th></tr>`;
    html += `<tr>`;
    for(let i=0; i<2; i++) {
        const trackClass = (i === 0) ? 'track-a' : 'track-b';
        if (isModeActive) html += `<th class="col-seed ${trackClass}">S1</th><th class="col-seed ${trackClass}">S2</th>`;
        displayIds.forEach(id => {
            const canClick = ["0", "64", "63", "65"].includes(id) && !(isFourColumnMode && (id === "63" || id === "65"));
            const toggleBtnHtml = canClick ? `<button onclick="toggleGacha('${id}')" style="margin-left:4px; padding:1px 4px; font-size:0.55rem; background:#718096; color:#fff; border:none; border-radius:2px; cursor:pointer;">切替</button>` : "";
            html += `<th class="col-gacha ${trackClass}">${gachaMaster[id].name}${toggleBtnHtml}</th>`;
        });
    }
    html += '</tr>';

    let currentSeedA = seed >>> 0;
    let currentIndexA = 0; 
    const stateA = { lastAnyIds: {}, lastAnyOriginalIds: {} };
    const stateB = { lastAnyIds: {}, lastAnyOriginalIds: {} };
    const rerollLinks = {};

    const nekomeIdx = TARGET_GACHA_IDS.indexOf("65");

    for (let i = 1; i <= window.viewData.displayRollCount; i++) {
        let currentIndexB = currentIndexA + 1;
        let currentSeedB = advanceSeed(currentSeedA);
        stateA.currentSeed = currentSeedA;
        stateB.currentSeed = currentSeedB;

        const allResultsA = TARGET_GACHA_IDS.map(id => calculateRoll(id, stateA, currentIndexA, rerollLinks));
        const allResultsB = TARGET_GACHA_IDS.map(id => calculateRoll(id, stateB, currentIndexB, rerollLinks));

        html += '<tr>';
        html += `<td class="col-num">${i}</td>`;
        if (isModeActive) html += ConfirmManager.renderSeedCells(allResultsA[0]);
        displayIds.forEach(id => {
            const res = allResultsA[TARGET_GACHA_IDS.indexOf(id)];
            html += renderCell(res, isModeActive, currentIndexA, (nekomeIdx !== -1 && allResultsA[nekomeIdx].rarity === 4), id);
        });
        if (isModeActive) html += ConfirmManager.renderSeedCells(allResultsB[0]);
        displayIds.forEach(id => {
            const res = allResultsB[TARGET_GACHA_IDS.indexOf(id)];
            html += renderCell(res, isModeActive, currentIndexB, (nekomeIdx !== -1 && allResultsB[nekomeIdx].rarity === 4), id);
        });
        html += '</tr>';
        currentIndexA += 2;
        currentSeedA = advanceSeed(currentSeedB);
    }

    html += '</table>';
    container.innerHTML = html;
    if (typeof initializeSimulationView === 'function') initializeSimulationView();
}

function advanceSeed(seed) {
    let x = seed;
    x ^= (x << 13); x ^= (x >>> 17); x ^= (x << 15);
    return x >>> 0;
}

function calculateRoll(gachaId, state, currentIndex, rerollLinks) {
    const gacha = gachaMaster[gachaId];
    const rng = new Xorshift32(state.currentSeed);
    const s1 = rng.next();
    const targetRarity = determineRarity(s1, gacha.rarityRates);
    let pool = gacha.pool.filter(itemId => itemMaster[itemId].rarity === targetRarity);
    if (pool.length === 0) pool = gacha.pool;
    
    const s2 = rng.next();
    const charIndex = s2 % pool.length;
    let lastGenSeed = s2; 
    const originalItemId = String(pool[charIndex]);
    let itemId = originalItemId;

    const idSourceFinal = (rerollLinks[currentIndex] && rerollLinks[currentIndex][gachaId] !== undefined) ? String(rerollLinks[currentIndex][gachaId]) : null;
    const idAboveOriginal = state.lastAnyOriginalIds[gachaId] ? String(state.lastAnyOriginalIds[gachaId]) : null;
    let targetToAvoid = (idSourceFinal && originalItemId === idSourceFinal) ? idSourceFinal : (idAboveOriginal && originalItemId === idAboveOriginal ? idAboveOriginal : null);

    let isReroll = false;
    if (itemMaster[originalItemId].rarity === 1 && targetToAvoid !== null && pool.length > 1) {
        isReroll = true;
        let excluded = [charIndex];
        while (true) {
            const div = pool.length - excluded.length;
            if (div <= 0) break;
            const sNext = rng.next(); lastGenSeed = sNext;
            const tempSlot = sNext % div;
            let finalSlot = tempSlot;
            let sortedEx = [...excluded].sort((a, b) => a - b);
            for (let ex of sortedEx) { if (finalSlot >= ex) finalSlot++; else break; }
            const nextId = String(pool[finalSlot]);
            if (nextId !== targetToAvoid) { itemId = nextId; break; }
            excluded.push(finalSlot);
            if (excluded.length >= 15) break;
        }
        const consumed = 2 + (lastGenSeed === s2 ? 0 : excluded.length); 
        if (!rerollLinks[currentIndex + consumed]) rerollLinks[currentIndex + consumed] = {};
        rerollLinks[currentIndex + consumed][gachaId] = itemId;
    }
    state.lastAnyOriginalIds[gachaId] = originalItemId;

    return { itemId, name: itemMaster[itemId].name, originalName: itemMaster[originalItemId].name, rarity: itemMaster[itemId].rarity, isReroll, finalSeed: lastGenSeed, gachaName: gacha.name, s1, s2, poolSize: pool.length, charIndex };
}

function determineRarity(seed, rates) {
    const r = seed % 10000;
    let sum = 0;
    const keys = Object.keys(rates).sort((a, b) => a - b);
    for (let k of keys) { sum += rates[k]; if (r < sum) return parseInt(k); }
    return 1;
}

function renderCell(result, isModeActive, startIndex, isRowHigh = false, gachaId = null) {
    const rarity = isRowHigh ? 4 : result.rarity;
    const addr = formatAddress(startIndex);
    const highlightKey = `${addr}_${gachaId}`;
    const routeIdx = window.viewData.highlightedRoute.get(highlightKey);
    let highlightClass = (window.viewData.showSimHighlight && routeIdx !== undefined) ? (routeIdx < window.viewData.checkedCount ? 'sim-route-checked' : 'sim-route-remaining') : '';

    const clickFn = `handleCellClick(${result.finalSeed}, '${addr}', '${gachaId}')`;
    let attrs = isModeActive ? ConfirmManager.getCellAttributes(result) : `onclick="${clickFn}" title="シードを更新"`;

    let content = result.isReroll ? `${result.originalName}<br>®${result.name}` : result.name;
    if (isRowHigh && (gachaId === "0" || gachaId === "64")) content += '<br>(CE⇒闇猫目)';
    return `<td class="rarity-${rarity} ${result.isReroll ? 'is-rerolled' : ''} ${highlightClass}" style="cursor:pointer;" ${attrs}>${content}</td>`;
}
