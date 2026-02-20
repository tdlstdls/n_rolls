/**
 * main.js (SEED UI統合・反映ボタン廃止・ヘッダー切替ボタン化版)
 */

const TARGET_GACHA_IDS = ["0", "64", "62", "63", "65"];
let displayIds = ["64", "62", "63"]; 
let displayRollCount = 100; 
let isFourColumnMode = false; 

// シミュレーション用のグローバルデータ
window.viewData = {
    calculatedData: null,
    gachaIds: TARGET_GACHA_IDS, 
    initialLastRollId: "none",
    highlightedRoute: new Map(),
    showSimHighlight: true,
    lastSimResult: null 
};

/**
 * SEED要約表示の数値を最新の状態に更新する
 */
function updateSeedSummary() {
    const seedInput = document.getElementById('seed');
    const seedSummaryText = document.getElementById('seed-summary-text');
    if (seedInput && seedSummaryText) {
        seedSummaryText.textContent = seedInput.value;
    }
}

/**
 * カラム切り替え用グローバル関数
 */
window.toggleGacha = function(currentId) {
    if (isFourColumnMode && (currentId === "63" || currentId === "65")) return;

    const toggleMap = { "64": "0", "0": "64", "63": "65", "65": "63" };
    const targetId = toggleMap[currentId];
    if (targetId) {
        const idx = displayIds.indexOf(currentId);
        if (idx !== -1) {
            displayIds[idx] = targetId;
            generateTable(); 
        }
    }
};

/**
 * 4列表示モードの切り替え
 */
window.toggleFourColumnMode = function() {
    isFourColumnMode = !isFourColumnMode;
    
    if (isFourColumnMode) {
        const firstId = displayIds.includes("0") ? "0" : "64";
        displayIds = [firstId, "62", "63", "65"];
    } else {
        displayIds = displayIds.filter(id => id !== "65");
        if (!displayIds.includes("63")) {
            const idx = displayIds.indexOf("65");
            if (idx !== -1) displayIds[idx] = "63";
            else if (displayIds.length < 3) displayIds.push("63");
        }
    }
    generateTable();
};

/**
 * シード値を更新してテーブルを再描画する
 */
window.updateSeedAndRefresh = function(newSeed) {
    const seedInput = document.getElementById('seed');
    if (seedInput) {
        seedInput.value = newSeed;
        updateSeedSummary(); 
        if (typeof UrlManager !== 'undefined') {
            UrlManager.updateUrl(newSeed);
        }
        generateTable();
    }
};

/**
 * 現在のSEED値をシステムに反映し、テーブルを更新する
 */
function applyCurrentSeed() {
    const seedInput = document.getElementById('seed');
    const seedDisplayWrapper = document.getElementById('seed-display-wrapper');
    const seedEditControls = document.getElementById('seed-edit-controls');

    updateSeedSummary();
    if (typeof UrlManager !== 'undefined') UrlManager.updateUrl(seedInput.value);
    
    // UIを要約モードに戻す
    if (seedEditControls) seedEditControls.style.display = 'none';
    if (seedDisplayWrapper) seedDisplayWrapper.style.display = 'flex';
    
    generateTable();
}

document.addEventListener('DOMContentLoaded', () => {
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = 'N_Rolls';

    const seedInput = document.getElementById('seed');
    if (typeof UrlManager !== 'undefined') UrlManager.init(seedInput);
    
    const seedDisplayWrapper = document.getElementById('seed-display-wrapper');
    const seedEditControls = document.getElementById('seed-edit-controls');
    const updateSeedUiBtn = document.getElementById('update-seed-ui-btn');

    if (seedDisplayWrapper && seedEditControls && updateSeedUiBtn) {
        // 表示クリックで編集開始
        seedDisplayWrapper.onclick = () => {
            seedDisplayWrapper.style.display = 'none';
            seedEditControls.style.display = 'flex';
            seedInput.focus();
            seedInput.select();
        };

        // 更新ボタンクリックで反映して終了
        updateSeedUiBtn.onclick = () => {
            applyCurrentSeed();
        };

        // Enterキーでも反映
        seedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyCurrentSeed();
            }
        });

        seedDisplayWrapper.onmouseover = () => {
            document.getElementById('seed-summary-text').style.color = '#0056b3';
        };
        seedDisplayWrapper.onmouseout = () => {
            document.getElementById('seed-summary-text').style.color = '#007bff';
        };
    }

    const bottomControls = document.getElementById('bottom-controls');
    if (bottomControls) {
        const addRowsBtn = document.createElement('button');
        addRowsBtn.id = 'add-rows-btn';
        addRowsBtn.textContent = '+100行追加';
        addRowsBtn.style.backgroundColor = '#6c757d';
        addRowsBtn.onclick = () => {
            displayRollCount += 100;
            generateTable();
        };
        bottomControls.appendChild(addRowsBtn);
    }

    if (typeof ConfirmManager !== 'undefined') ConfirmManager.init(() => generateTable());

    updateSeedSummary(); 
    generateTable();
});

function formatAddress(idx) {
    if (idx === null || idx === undefined) return '';
    const row = Math.floor(idx / 2) + 1;
    const side = (idx % 2 === 0) ? 'A' : 'B';
    return `${side}${row}`;
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
    const allNodes = []; 

    let masterHtml = isModeActive ? ConfirmManager.generateMasterInfoHtml(displayIds, gachaMaster, itemMaster) : '';
    
    // 4列表示ボタン（小型化・スタイル調整）
    const fourColBtnText = isFourColumnMode ? '4列表示ON' : '4列表示OFF';
    const fourColBtnColor = isFourColumnMode ? '#28a745' : '#6c757d';
    const fourColBtnHtml = `
        <button onclick="toggleFourColumnMode()" style="
            margin-left: 10px;
            padding: 2px 5px;
            font-size: 0.6rem;
            background-color: ${fourColBtnColor};
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            vertical-align: middle;
            line-height: 1;
        ">${fourColBtnText}</button>
    `;

    let html = masterHtml + '<table>';
    const extraCols = isModeActive ? 2 : 0;
    const trackColSpan = displayIds.length + extraCols;
    
    html += `<tr>
        <th class="col-num" rowspan="2">NO.</th>
        <th colspan="${trackColSpan}" class="track-header track-a">Track A${fourColBtnHtml}</th>
        <th colspan="${trackColSpan}" class="track-header track-b">Track B</th>
    </tr>`;

    html += `<tr>`;
    for(let i=0; i<2; i++) {
        const trackClass = (i === 0) ? 'track-a' : 'track-b';
        if (isModeActive) {
            html += `<th class="col-seed ${trackClass}">S1</th>
                     <th class="col-seed ${trackClass}">S2</th>`;
        }
        displayIds.forEach(id => {
            const isClickable = ["0", "64", "63", "65"].includes(id);
            const isToggleDisabled = isFourColumnMode && (id === "63" || id === "65");
            const canClick = isClickable && !isToggleDisabled;

            // ▽から「切替」ボタンに変更
            const toggleBtnHtml = canClick ? `
                <button onclick="toggleGacha('${id}')" style="
                    margin-left: 4px;
                    padding: 1px 4px;
                    font-size: 0.55rem;
                    background-color: #718096;
                    color: white;
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    vertical-align: middle;
                    line-height: 1.2;
                ">切替</button>` : "";

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

    for (let i = 1; i <= displayRollCount; i++) {
        let currentIndexB = currentIndexA + 1;
        let currentSeedB = advanceSeed(currentSeedA);
        stateA.currentSeed = currentSeedA;
        stateB.currentSeed = currentSeedB;

        const allResultsA = TARGET_GACHA_IDS.map(id => calculateRoll(id, stateA, currentIndexA, rerollLinks));
        const allResultsB = TARGET_GACHA_IDS.map(id => calculateRoll(id, stateB, currentIndexB, rerollLinks));

        allNodes[currentIndexA] = {};
        allNodes[currentIndexB] = {};
        TARGET_GACHA_IDS.forEach((gId, idx) => {
            const resA = allResultsA[idx];
            const resB = allResultsB[idx];
            allNodes[currentIndexA][gId] = {
                address: formatAddress(currentIndexA),
                itemId: resA.itemId, rarityId: resA.rarity,
                poolSize: resA.poolSize, reRollItemId: resA.reRollItemId,
                seedsConsumed: resA.seedsConsumed 
            };
            allNodes[currentIndexB][gId] = {
                address: formatAddress(currentIndexB),
                itemId: resB.itemId, rarityId: resB.rarity,
                poolSize: resB.poolSize, reRollItemId: resB.reRollItemId,
                seedsConsumed: resB.seedsConsumed
            };
        });

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
    window.viewData.calculatedData = { Nodes: allNodes };
    
    if (typeof initializeSimulationView === 'function') initializeSimulationView();
}

function advanceSeed(seed) {
    const rng = new Xorshift32(seed);
    return rng.next();
}

function calculateRoll(gachaId, state, currentIndex, rerollLinks) {
    const gacha = gachaMaster[gachaId];
    const rng = new Xorshift32(state.currentSeed);
    
    const s1 = rng.next();
    const rRarity = s1 % 10000;
    const targetRarity = determineRarity(s1, gacha.rarityRates);
    
    let filteredPool = gacha.pool.filter(itemId => itemMaster[itemId].rarity === targetRarity);
    if (filteredPool.length === 0) filteredPool = gacha.pool;
    
    const s2 = rng.next();
    const totalChars = filteredPool.length;
    const charIndex = s2 % totalChars;
    
    let lastGeneratedSeed = s2; 
    const originalItemId = String(filteredPool[charIndex]);
    const originalItem = itemMaster[originalItemId];
    let itemId = originalItemId;
    let reRollItemId = undefined;
    
    const idSourceFinal = (rerollLinks[currentIndex] && rerollLinks[currentIndex][gachaId] !== undefined) ? String(rerollLinks[currentIndex][gachaId]) : null;
    const idAboveOriginal = state.lastAnyOriginalIds[gachaId] ? String(state.lastAnyOriginalIds[gachaId]) : null;

    let targetToAvoid = null;
    let isConsecutiveRerollTarget = false;
    if (idSourceFinal && originalItemId === idSourceFinal) {
        targetToAvoid = idSourceFinal;
        if (idAboveOriginal && originalItemId !== idAboveOriginal) isConsecutiveRerollTarget = true;
    } else if (idAboveOriginal && originalItemId === idAboveOriginal) {
        targetToAvoid = idAboveOriginal;
    }

    let isRerolled = false;
    let rerollHistory = [];
    if (originalItem.rarity === 1 && targetToAvoid !== null && totalChars > 1) {
        isRerolled = true;
        let excludedIndices = [charIndex]; 
        while (true) {
            const currentDivisor = totalChars - excludedIndices.length;
            if (currentDivisor <= 0) break; 
            const sNext = rng.next();
            lastGeneratedSeed = sNext; 
            const tempSlot = sNext % currentDivisor;
            const finalSlot = mapToActualSlot(tempSlot, excludedIndices);
            const nextItemId = String(filteredPool[finalSlot]);
            
            rerollHistory.push({
                seed: sNext,
                index: tempSlot,
                name: itemMaster[nextItemId]?.name || "不明"
            });
            
            if (nextItemId !== targetToAvoid) {
                itemId = nextItemId; reRollItemId = nextItemId;
                break;
            }
            excludedIndices.push(finalSlot);
            if (excludedIndices.length >= 15) break; 
        }
        const seedsConsumed = 2 + rerollHistory.length;
        if (!rerollLinks[currentIndex + seedsConsumed]) rerollLinks[currentIndex + seedsConsumed] = {};
        rerollLinks[currentIndex + seedsConsumed][gachaId] = itemId;
    }
    state.lastAnyIds[gachaId] = itemId;
    state.lastAnyOriginalIds[gachaId] = originalItemId;

    return {
        itemId: itemId, 
        reRollItemId: reRollItemId, 
        name: itemMaster[itemId].name, 
        originalName: originalItem.name,
        rarity: itemMaster[itemId].rarity, 
        isRerolled: isRerolled, 
        isConsecutiveRerollTarget: isConsecutiveRerollTarget,
        poolSize: totalChars, 
        seedsConsumed: 2 + (isRerolled ? rerollHistory.length : 0),
        finalSeed: lastGeneratedSeed, 
        gachaName: gacha.name,
        s1: s1,
        rRarity: rRarity,
        s2: s2,
        charIndex: charIndex,
        rerollHistory: rerollHistory
    };
}

function determineRarity(seed, rates) {
    const r = seed % 10000;
    let sum = 0;
    const sortedKeys = Object.keys(rates).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    for (let key of sortedKeys) {
        sum += rates[key];
        if (r < sum) return parseInt(key, 10);
    }
    return 1;
}

function renderCell(result, isModeActive, startIndex, isRowHighlighted = false, gachaId = null) {
    const displayRarity = isRowHighlighted ? 4 : result.rarity;
    const addr = formatAddress(startIndex);
    
    const highlightKey = `${addr}_${gachaId}`;
    const isSimHighlighted = (window.viewData.showSimHighlight && window.viewData.highlightedRoute.has(highlightKey));
    const simHighlightClass = isSimHighlighted ? 'sim-highlighted' : '';
    
    let extraAttrs = '';
    if (isModeActive && typeof ConfirmManager !== 'undefined') {
        extraAttrs = ConfirmManager.getCellAttributes(result);
    } else {
        extraAttrs = `onclick="updateSeedAndRefresh(${result.finalSeed})" title="シードを ${result.finalSeed} に更新して開始"`;
    }

    let content = result.isRerolled ? `${result.originalName}<br>${(result.isConsecutiveRerollTarget ? 'R' : '') + formatAddress(startIndex + result.seedsConsumed)})${result.name}` : result.name;
    if (isRowHighlighted && (gachaId === "0" || gachaId === "64")) content += '<br>(CE⇒闇猫目)';

    return `<td class="rarity-${displayRarity} ${result.isRerolled ? 'is-rerolled' : ''} ${simHighlightClass}" style="cursor:pointer;" ${extraAttrs}>${content}</td>`;
}

window.runSimulationAndDisplay = function() { generateTable(); };
