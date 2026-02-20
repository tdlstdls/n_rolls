/**
 * main.js (N_Rolls デザイン・構造調整版)
 */

const TARGET_GACHA_IDS = ["0", "64", "62", "63", "65"];
let displayIds = ["64", "62", "63"]; 
let displayRollCount = 100; // 初期表示を100行に変更
let isFourColumnMode = false; // 4列表示モードの状態

// シミュレーション用のグローバルデータ
window.viewData = {
    calculatedData: null,
    gachaIds: TARGET_GACHA_IDS, 
    initialLastRollId: "none",
    highlightedRoute: new Map(),
    showSimHighlight: true,
    lastSimResult: null // 最適ルートの結果を保持する用
};

/**
 * カラム切り替え用グローバル関数
 */
window.toggleGacha = function(currentId) {
    // 4列表示モードかつ福引G/猫目の場合は切り替えを無効化
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
 * 4列表示モードの更新
 */
function updateFourColumnMode() {
    const btn = document.getElementById('toggle-4col-btn');
    if (!btn) return;

    if (isFourColumnMode) {
        btn.textContent = '4列表示ON';
        btn.style.backgroundColor = '#28a745';
        
        // 4列表示構成に強制変更: [0or64, 62, 63, 65]
        const firstId = displayIds.includes("0") ? "0" : "64";
        displayIds = [firstId, "62", "63", "65"];
    } else {
        btn.textContent = '4列表示';
        btn.style.backgroundColor = '#6c757d';
        
        // 3列に戻す (65を除去し、なければ63を維持)
        displayIds = displayIds.filter(id => id !== "65");
        if (!displayIds.includes("63")) {
            // もし猫目(65)だけが表示されていた場合は福引G(63)に差し替える
            const idx = displayIds.indexOf("65");
            if (idx !== -1) displayIds[idx] = "63";
            else if (displayIds.length < 3) displayIds.push("63");
        }
    }
    generateTable();
}

/**
 * シード値を更新してテーブルを再描画する
 * (r_rolls からの移植機能)
 */
window.updateSeedAndRefresh = function(newSeed) {
    const seedInput = document.getElementById('seed');
    if (seedInput) {
        seedInput.value = newSeed;
        if (typeof UrlManager !== 'undefined') {
            UrlManager.updateUrl(newSeed);
        }
        generateTable();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // タイトルの変更
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = 'N_Rolls';

    const seedInput = document.getElementById('seed');
    if (typeof UrlManager !== 'undefined') UrlManager.init(seedInput);
    
    // ヘッダーの入力グループに4列表示ボタンを追加
    const inputGroup = document.querySelector('.input-group');
    if (inputGroup) {
        const modeBtn = document.createElement('button');
        modeBtn.id = 'toggle-4col-btn';
        modeBtn.textContent = '4列表示';
        modeBtn.style.backgroundColor = '#6c757d';
        modeBtn.style.marginLeft = '5px';
        modeBtn.onclick = () => {
            isFourColumnMode = !isFourColumnMode;
            updateFourColumnMode();
        };
        inputGroup.appendChild(modeBtn);
    }

    // 下部コントロールエリアへのボタン追加
    const bottomControls = document.getElementById('bottom-controls');
    if (bottomControls) {
        // 「+100行追加」ボタンの作成
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

    // 確認モードの初期化
    if (typeof ConfirmManager !== 'undefined') ConfirmManager.init(() => generateTable());

    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrl(seedInput.value);
            generateTable();
        });
    }
    generateTable();
});

/**
 * テーブル用アドレス（A1, B25等）のフォーマット
 */
function formatAddress(idx) {
    if (idx === null || idx === undefined) return '';
    const row = Math.floor(idx / 2) + 1;
    const side = (idx % 2 === 0) ? 'A' : 'B';
    return `${side}${row}`;
}

/**
 * テーブル生成メイン関数
 */
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
    const headerTopBase = isModeActive ? 80 : 0; 
    let html = masterHtml + '<table>';
    const extraCols = isModeActive ? 2 : 0;
    const trackColSpan = displayIds.length + extraCols;
    
    // ヘッダー1行目
    html += `<tr class="sticky-header" style="top: ${headerTopBase}px;">
        <th class="col-num" rowspan="2">NO.</th>
        <th colspan="${trackColSpan}" class="track-header track-a">Track A</th>
        <th colspan="${trackColSpan}" class="track-header track-b">Track B</th>
    </tr>`;

    // ヘッダー2行目
    html += `<tr class="sticky-header" style="top: ${headerTopBase + 25}px;">`;
    for(let i=0; i<2; i++) {
        const trackClass = (i === 0) ? 'track-a' : 'track-b';
        if (isModeActive) {
            html += `<th class="col-seed ${trackClass}" style="width:100px;">S1</th>
                     <th class="col-seed ${trackClass}" style="width:100px;">S2</th>`;
        }
        displayIds.forEach(id => {
            const isClickable = ["0", "64", "63", "65"].includes(id);
            // 4列表示モード中は63/65のクリックイベントを抑制するスタイルにする
            const canClickNow = isClickable && !(isFourColumnMode && (id === "63" || id === "65"));
            const clickAttr = canClickNow ? `onclick="toggleGacha('${id}')" title="クリックで切り替え"` : "";
            const extraClass = canClickNow ? "clickable-header" : "";
            const indicator = canClickNow ? '<span class="fill-down-icon">▼</span>' : "";
            html += `<th class="col-gacha ${trackClass} ${extraClass}" ${clickAttr}>${gachaMaster[id].name}${indicator}</th>`;
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
                poolSize: resA.poolSize, reRollItemId: resA.reRollItemId
            };
            allNodes[currentIndexB][gId] = {
                address: formatAddress(currentIndexB),
                itemId: resB.itemId, rarityId: resB.rarity,
                poolSize: resB.poolSize, reRollItemId: resB.reRollItemId
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

function mapToActualSlot(tempSlot, excludedIndices) {
    let sortedEx = [...excludedIndices].sort((a, b) => a - b);
    let finalSlot = tempSlot;
    for (let ex of sortedEx) {
        if (finalSlot >= ex) finalSlot++;
        else break;
    }
    return finalSlot;
}

/**
 * 抽選ロジック: 確認モードに必要な詳細データも生成する
 */
function calculateRoll(gachaId, state, currentIndex, rerollLinks) {
    const gacha = gachaMaster[gachaId];
    const rng = new Xorshift32(state.currentSeed);
    
    // 1段階目：レアリティ
    const s1 = rng.next();
    const rRarity = s1 % 10000;
    const targetRarity = determineRarity(s1, gacha.rarityRates);
    
    let filteredPool = gacha.pool.filter(itemId => itemMaster[itemId].rarity === targetRarity);
    if (filteredPool.length === 0) filteredPool = gacha.pool;
    
    // 2段階目：スロット
    const s2 = rng.next();
    const totalChars = filteredPool.length;
    const charIndex = s2 % totalChars;
    
    let lastGeneratedSeed = s2; // キャラ決定に使用された直近のシード
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
            lastGeneratedSeed = sNext; // 再抽選が行われた場合はそのシードを「最終シード」とする
            const tempSlot = sNext % currentDivisor;
            const finalSlot = mapToActualSlot(tempSlot, excludedIndices);
            const nextItemId = String(filteredPool[finalSlot]);
            
            // 確認モード用に履歴を保存
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
        finalSeed: lastGeneratedSeed, // 移植機能用のプロパティ
        // 確認モード表示用の追加データ
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
        // 確認モード：詳細アラートを表示
        extraAttrs = ConfirmManager.getCellAttributes(result);
    } else {
        // 通常モード：クリックでシードを更新して再描画 (r_rolls からの移植機能)
        extraAttrs = `onclick="updateSeedAndRefresh(${result.finalSeed})" title="シードを ${result.finalSeed} に更新して開始"`;
    }

    let content = result.isRerolled ? `${result.originalName}<br>${(result.isConsecutiveRerollTarget ? 'R' : '') + formatAddress(startIndex + result.seedsConsumed)})${result.name}` : result.name;
    if (isRowHighlighted && (gachaId === "0" || gachaId === "64")) content += '<br>(CE⇒闇猫目)';

    return `<td class="rarity-${displayRarity} ${result.isRerolled ? 'is-rerolled' : ''} ${simHighlightClass}" style="cursor:pointer;" ${extraAttrs}>${content}</td>`;
}

window.runSimulationAndDisplay = function() { generateTable(); };
