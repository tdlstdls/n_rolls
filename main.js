/**
 * main.js
 * 役割: 全体の状態管理、テーブル描画、イベント制御の統合
 */

// 全ガチャIDの定義
const TARGET_GACHA_IDS = ["0", "64", "62", "63", "65"];

// グローバル状態管理 (Single Source of Truth)
// すべての表示設定や検索結果をこのオブジェクトに集約します
window.viewData = {
    gachaIds: TARGET_GACHA_IDS,
    displayIds: ["64", "62", "63"], // 初期表示: にゃんこ、福引、福引G
    displayRollCount: 100,           // 初期表示行数
    isFourColumnMode: false,        // 4列表示モードフラグ
    highlightedRoute: new Map(),    // 検索ルートのハイライト座標管理
    showSimHighlight: true,         // ルート強調の表示/非表示
    lastSimResult: null,            // 直近のルート検索結果
    ticketLimits: { nyanko: 100, fukubiki: 300, fukubikiG: 200 }, // 所持数
    checkedCount: 0,                // 消し込み進捗（何番目まで完了したか）
    isTableCheckMode: false,        // 消し込みモードフラグ
    showSimText: false              // テキストエリア表示フラグ
};

/**
 * SEED入力欄の数値を要約表示に反映する
 */
function updateSeedSummary() {
    const seedInput = document.getElementById('seed');
    const seedSummaryText = document.getElementById('seed-summary-text');
    if (seedInput && seedSummaryText) {
        seedSummaryText.textContent = seedInput.value;
    }
}

/**
 * カラムのガチャ種類を切り替える (にゃんこA/B、福引G/福引のトグル)
 */
window.toggleGacha = function(currentId) {
    // 4列表示モード時は、後半2列(63, 65)は固定のためトグルを無効化
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
        // 4列モード: [にゃんこ, 福引, 福引G, 福引(ノーマル)] をすべて表示
        const firstId = window.viewData.displayIds.includes("0") ? "0" : "64";
        window.viewData.displayIds = [firstId, "62", "63", "65"];
    } else {
        // 3列モードに戻す: [にゃんこ, 福引, 福引G/福引のいずれか]
        window.viewData.displayIds = window.viewData.displayIds.filter(id => id !== "65");
        if (!window.viewData.displayIds.includes("63") && !window.viewData.displayIds.includes("65")) {
             window.viewData.displayIds.push("63");
        }
    }
    generateTable();
};

/**
 * セルクリック時の統合ハンドラ
 */
window.handleCellClick = function(finalSeed, addr, gachaId) {
    // 消し込みモードかどうかの判定
    if (window.viewData.isTableCheckMode) {
        const highlightKey = `${addr}_${gachaId}`;
        const routeIdx = window.viewData.highlightedRoute.get(highlightKey);

        if (routeIdx !== undefined) {
            // ルート上のセルの場合、その地点まで消し込む
            window.viewData.checkedCount = routeIdx + 1;
            // URLやテキスト表示も同期
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrlParam('p', window.viewData.checkedCount);
            if (typeof displaySimulationResult === 'function' && window.viewData.lastSimResult) {
                displaySimulationResult(window.viewData.lastSimResult);
            }
            generateTable();
        }
    } else {
        // 通常モード：クリックしたセルのSEEDを反映してリセット
        window.updateSeedAndRefresh(finalSeed, addr, gachaId);
    }
};

/**
 * SEED更新とテーブル再描画
 */
window.updateSeedAndRefresh = function(newSeed, clickedAddr, clickedGachaId) {
    // 検索ルート実行中の場合、チケット消費を計算
    if (window.viewData.lastSimResult && window.viewData.lastSimResult.path) {
        const path = window.viewData.lastSimResult.path;
        const clickedIndex = path.findIndex(p => p.addr === clickedAddr && p.gachaId === clickedGachaId);

        if (clickedIndex !== -1) {
            const consumed = { nyanko: 0, fukubiki: 0, fukubikiG: 0 };
            for (let i = 0; i <= clickedIndex; i++) {
                const type = GACHA_TICKET_TYPES[path[i].gachaId];
                if (type) consumed[type]++;
            }
            // 所持数から減算
            window.viewData.ticketLimits.nyanko = Math.max(0, window.viewData.ticketLimits.nyanko - consumed.nyanko);
            window.viewData.ticketLimits.fukubiki = Math.max(0, window.viewData.ticketLimits.fukubiki - consumed.fukubiki);
            window.viewData.ticketLimits.fukubikiG = Math.max(0, window.viewData.ticketLimits.fukubikiG - consumed.fukubikiG);

            if (typeof window.saveTicketSettingsToStorage === 'function') window.saveTicketSettingsToStorage();
            window.viewData.checkedCount = 0; // 進捗リセット
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

/**
 * ページ読み込み時の初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    const seedInput = document.getElementById('seed');
    if (typeof UrlManager !== 'undefined') UrlManager.init(seedInput);
    
    // SEED入力欄のUI制御（表示/編集切り替え）
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
        updateSeedUiBtn.onclick = () => {
            updateSeedSummary();
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrl(seedInput.value);
            seedEditControls.style.display = 'none';
            seedDisplayWrapper.style.display = 'flex';
            generateTable();
        };
        seedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') updateSeedUiBtn.click();
        });
    }

    // 行追加ボタンの設定
    const bottomControls = document.getElementById('bottom-controls');
    if (bottomControls) {
        const addRowsBtn = document.createElement('button');
        addRowsBtn.textContent = '+100行追加';
        addRowsBtn.style.backgroundColor = '#6c757d';
        addRowsBtn.onclick = () => {
            window.viewData.displayRollCount += 100;
            generateTable();
        };
        bottomControls.appendChild(addRowsBtn);
    }

    updateSeedSummary(); 
    generateTable();
});

/**
 * テーブルのメイン描画関数
 */
function generateTable() {
    const seedInput = document.getElementById('seed');
    let seed = parseInt(seedInput.value, 10) || 12345;

    const container = document.getElementById('rolls-table-container');
    const resultArea = document.getElementById('result');
    container.innerHTML = '<div class="loading">計算中...</div>';
    resultArea.style.display = 'block';

    const { displayIds, isFourColumnMode, displayRollCount } = window.viewData;

    // テーブルヘッダーの構築
    const fourColBtnText = isFourColumnMode ? '4列表示ON' : '4列表示OFF';
    const fourColBtnColor = isFourColumnMode ? '#28a745' : '#6c757d';
    const fourColBtnHtml = `<button onclick="toggleFourColumnMode()" style="margin-left:10px; padding:2px 5px; font-size:0.6rem; background:${fourColBtnColor}; color:#fff; border:none; border-radius:3px; cursor:pointer; vertical-align:middle;">${fourColBtnText}</button>`;

    let html = '<table>';
    html += `<tr><th class="col-num" rowspan="2">NO.</th><th colspan="${displayIds.length}" class="track-header track-a">Track A${fourColBtnHtml}</th><th colspan="${displayIds.length}" class="track-header track-b">Track B</th></tr>`;
    html += `<tr>`;
    
    for(let i=0; i<2; i++) {
        const trackClass = (i === 0) ? 'track-a' : 'track-b';
        displayIds.forEach(id => {
            // 切替ボタンの表示条件
            const canToggle = (id === "0" || id === "64" || id === "63" || id === "65") && !(isFourColumnMode && (id === "63" || id === "65"));
            const toggleBtnHtml = canToggle ? `<button onclick="toggleGacha('${id}')" style="margin-left:4px; padding:1px 4px; font-size:0.55rem; background:#718096; color:#fff; border:none; border-radius:2px; cursor:pointer;">切替</button>` : "";
            html += `<th class="col-gacha ${trackClass}">${gachaMaster[id].name}${toggleBtnHtml}</th>`;
        });
    }
    html += '</tr>';

    // 抽選計算と行の生成
    let currentSeedA = seed >>> 0;
    let currentIndexA = 0; 
    const stateA = { lastAnyOriginalIds: {} };
    const stateB = { lastAnyOriginalIds: {} };
    const rerollLinks = {};

    for (let i = 1; i <= displayRollCount; i++) {
        let currentSeedB = advanceSeed(currentSeedA);
        stateA.currentSeed = currentSeedA;
        stateB.currentSeed = currentSeedB;

        const allResultsA = TARGET_GACHA_IDS.map(id => calculateRoll(id, stateA, currentIndexA, rerollLinks));
        const allResultsB = TARGET_GACHA_IDS.map(id => calculateRoll(id, stateB, currentIndexA + 1, rerollLinks));

        html += '<tr>';
        html += `<td class="col-num">${i}</td>`;
        
        // Track Aの表示
        displayIds.forEach(id => {
            const res = allResultsA[TARGET_GACHA_IDS.indexOf(id)];
            html += renderCell(res, currentIndexA, id);
        });
        
        // Track Bの表示
        displayIds.forEach(id => {
            const res = allResultsB[TARGET_GACHA_IDS.indexOf(id)];
            html += renderCell(res, currentIndexA + 1, id);
        });

        html += '</tr>';
        currentIndexA += 2;
        currentSeedA = advanceSeed(currentSeedB);
    }

    html += '</table>';
    container.innerHTML = html;

    // テーブル描画後にシミュレーターUIの表示を最新状態に同期
    if (typeof initializeSimulationView === 'function') {
        initializeSimulationView();
    }
}

/**
 * 次のSEEDを算出
 */
function advanceSeed(seed) {
    let x = seed;
    x ^= (x << 13); x ^= (x >>> 17); x ^= (x << 15);
    return x >>> 0;
}

/**
 * 個別のガチャ排出計算
 */
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

    // 再抽選（レア被り）判定
    const targetToAvoid = (rerollLinks[currentIndex] && rerollLinks[currentIndex][gachaId]) ? String(rerollLinks[currentIndex][gachaId]) : (state.lastAnyOriginalIds[gachaId] ? String(state.lastAnyOriginalIds[gachaId]) : null);

    let isReroll = false;
    if (itemMaster[originalItemId].rarity === 1 && targetToAvoid && pool.length > 1) {
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

    return { itemId, name: itemMaster[itemId].name, originalName: itemMaster[originalItemId].name, rarity: itemMaster[itemId].rarity, isReroll, finalSeed: lastGenSeed };
}

/**
 * レアリティ決定
 */
function determineRarity(seed, rates) {
    const r = seed % 10000;
    let sum = 0;
    const keys = Object.keys(rates).sort((a, b) => a - b);
    for (let k of keys) { sum += rates[k]; if (r < sum) return parseInt(k); }
    return 1;
}

/**
 * セルのHTMLレンダリング
 */
function renderCell(result, startIndex, gachaId) {
    const addr = ((startIndex % 2 === 0) ? 'A' : 'B') + (Math.floor(startIndex / 2) + 1);
    const highlightKey = `${addr}_${gachaId}`;
    const routeIdx = window.viewData.highlightedRoute.get(highlightKey);
    
    // ルート強調のクラス決定
    let highlightClass = (window.viewData.showSimHighlight && routeIdx !== undefined) ? (routeIdx < window.viewData.checkedCount ? 'sim-route-checked' : 'sim-route-remaining') : '';

    const clickFn = `handleCellClick(${result.finalSeed}, '${addr}', '${gachaId}')`;
    let content = result.isReroll ? `${result.originalName}<br>®${result.name}` : result.name;
    
    return `<td class="rarity-${result.rarity} ${result.isReroll ? 'is-rerolled' : ''} ${highlightClass}" style="cursor:pointer;" onclick="${clickFn}">${content}</td>`;
}
