/**
 * main.js
 */

const TARGET_GACHA_IDS = ["0", "64", "62", "63", "65"];

window.viewData = {
    gachaIds: TARGET_GACHA_IDS,
    displayIds: ["64", "62", "63"],
    displayRollCount: 100,
    isFourColumnMode: false,
    highlightedRoute: new Map(),
    showSimHighlight: true,
    lastSimResult: null,
    ticketLimits: { nyanko: 100, fukubiki: 300, fukubikiG: 200 },
    checkedCount: 0,
    isTableCheckMode: false,
    showSimText: false
};

function updateSeedSummary() {
    const seedInput = document.getElementById('seed');
    const seedSummaryText = document.getElementById('seed-summary-text');
    if (seedInput && seedSummaryText) seedSummaryText.textContent = seedInput.value;
}

window.toggleGacha = function(currentId) {
    if (window.viewData.isFourColumnMode && (currentId === "63" || currentId === "65")) return;
    const toggleMap = { "64": "0", "0": "64", "63": "65", "65": "63" };
    const targetId = toggleMap[currentId];
    if (targetId) {
        const idx = window.viewData.displayIds.indexOf(currentId);
        if (idx !== -1) { window.viewData.displayIds[idx] = targetId; generateTable(); }
    }
};

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

window.handleCellClick = function(finalSeed, addr, gachaId) {
    if (window.viewData.isTableCheckMode) {
        const routeIdx = window.viewData.highlightedRoute.get(`${addr}_${gachaId}`);
        if (routeIdx !== undefined) {
            window.viewData.checkedCount = routeIdx + 1;
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrlParam('p', window.viewData.checkedCount);
            if (typeof displaySimulationResult === 'function' && window.viewData.lastSimResult) displaySimulationResult(window.viewData.lastSimResult);
            generateTable();
        }
    } else {
        window.updateSeedAndRefresh(finalSeed, addr, gachaId);
    }
};

window.updateSeedAndRefresh = function(newSeed, clickedAddr, clickedGachaId) {
    const seedInput = document.getElementById('seed');
    if (seedInput) {
        seedInput.value = newSeed;
        updateSeedSummary();
        if (typeof UrlManager !== 'undefined') UrlManager.updateUrl(newSeed);
        generateTable();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const seedInput = document.getElementById('seed');
    if (typeof UrlManager !== 'undefined') UrlManager.init(seedInput);
    const seedDisplayWrapper = document.getElementById('seed-display-wrapper');
    const seedEditControls = document.getElementById('seed-edit-controls');
    if (seedDisplayWrapper) {
        seedDisplayWrapper.onclick = () => { seedDisplayWrapper.style.display = 'none'; seedEditControls.style.display = 'flex'; seedInput.focus(); seedInput.select(); };
        document.getElementById('update-seed-ui-btn').onclick = () => {
            updateSeedSummary();
            if (typeof UrlManager !== 'undefined') UrlManager.updateUrl(seedInput.value);
            seedEditControls.style.display = 'none'; seedDisplayWrapper.style.display = 'flex';
            generateTable();
        };
    }
    const bottomControls = document.getElementById('bottom-controls');
    if (bottomControls) {
        const addRowsBtn = document.createElement('button');
        addRowsBtn.textContent = '+100行追加'; addRowsBtn.style.backgroundColor = '#6c757d';
        addRowsBtn.onclick = () => { window.viewData.displayRollCount += 100; generateTable(); };
        bottomControls.appendChild(addRowsBtn);
    }
    updateSeedSummary();
    generateTable();
});

function generateTable() {
    const seedInput = document.getElementById('seed');
    let seed = parseInt(seedInput.value, 10) || 12345;
    const container = document.getElementById('rolls-table-container');
    const resultArea = document.getElementById('result');
    container.innerHTML = '<div class="loading">計算中...</div>';
    resultArea.style.display = 'block';

    const { displayIds, isFourColumnMode, displayRollCount } = window.viewData;
    const fourColBtnHtml = `<button onclick="toggleFourColumnMode()" style="margin-left:10px; padding:2px 5px; font-size:0.6rem; background:${isFourColumnMode?'#28a745':'#6c757d'}; color:#fff; border:none; border-radius:3px; cursor:pointer;">4列表示${isFourColumnMode?'ON':'OFF'}</button>`;

    let html = `<table><tr><th class="col-num" rowspan="2">NO.</th><th colspan="${displayIds.length}" class="track-header track-a">Track A${fourColBtnHtml}</th><th colspan="${displayIds.length}" class="track-header track-b">Track B</th></tr><tr>`;
    for(let i=0; i<2; i++) {
        displayIds.forEach(id => {
            const toggleBtn = (id==="0"||id==="64"||id==="63"||id==="65") && !(isFourColumnMode && (id==="63"||id==="65")) ? `<button onclick="toggleGacha('${id}')" style="margin-left:4px; padding:1px 4px; font-size:0.55rem; background:#718096; color:#fff; border:none; border-radius:2px;">切替</button>` : "";
            html += `<th class="col-gacha track-${i===0?'a':'b'}">${gachaMaster[id].name}${toggleBtn}</th>`;
        });
    }
    html += '</tr>';

    let currentSeedA = seed >>> 0, currentIndexA = 0;
    const stateA = { lastAnyOriginalIds: {} }, stateB = { lastAnyOriginalIds: {} }, rerollLinks = {};

    for (let i = 1; i <= displayRollCount; i++) {
        let currentSeedB = advanceSeed(currentSeedA);
        stateA.currentSeed = currentSeedA; stateB.currentSeed = currentSeedB;
        const resA = TARGET_GACHA_IDS.map(id => calculateRoll(id, stateA, currentIndexA, rerollLinks));
        const resB = TARGET_GACHA_IDS.map(id => calculateRoll(id, stateB, currentIndexA+1, rerollLinks));

        html += '<tr>' + `<td class="col-num">${i}</td>`;
        displayIds.forEach(id => html += renderCell(resA[TARGET_GACHA_IDS.indexOf(id)], currentIndexA, false, id));
        displayIds.forEach(id => html += renderCell(resB[TARGET_GACHA_IDS.indexOf(id)], currentIndexA+1, false, id));
        html += '</tr>';
        currentIndexA += 2; currentSeedA = advanceSeed(currentSeedB);
    }
    container.innerHTML = html + '</table>';
    if (typeof initializeSimulationView === 'function') initializeSimulationView();
}

function advanceSeed(s) { let x = s; x ^= (x << 13); x ^= (x >>> 17); x ^= (x << 15); return x >>> 0; }

function calculateRoll(gId, state, cIdx, links) {
    const g = gachaMaster[gId], rng = new Xorshift32(state.currentSeed);
    const s1 = rng.next(), r = s1 % 10000;
    let sum = 0, rarity = 1;
    const keys = Object.keys(g.rarityRates).sort((a,b)=>a-b);
    for(let k of keys){ sum += g.rarityRates[k]; if(r<sum){ rarity=parseInt(k); break; } }
    let pool = g.pool.filter(id => itemMaster[id].rarity === rarity);
    if(pool.length===0) pool = g.pool;
    const s2 = rng.next(), charIdx = s2 % pool.length, originalId = String(pool[charIdx]);
    let itemId = originalId, isReroll = false, finalS = s2;
    const targetToAvoid = (links[cIdx] && links[cIdx][gId]) ? String(links[cIdx][gId]) : (state.lastAnyOriginalIds[gId] ? String(state.lastAnyOriginalIds[gId]) : null);
    if(itemMaster[originalId].rarity===1 && targetToAvoid && pool.length>1){
        isReroll=true; let ex=[charIdx];
        while(true){
            const div=pool.length-ex.length; if(div<=0)break;
            const sn=rng.next(); finalS=sn; const ts=sn%div; let fs=ts;
            let sx=[...ex].sort((a,b)=>a-b); for(let e of sx){ if(fs>=e)fs++; else break; }
            const nid=String(pool[fs]); if(nid!==targetToAvoid){ itemId=nid; break; }
            ex.push(fs); if(ex.length>=15)break;
        }
        const consumed = 2+(finalS===s2?0:ex.length); if(!links[cIdx+consumed]) links[cIdx+consumed]={}; links[cIdx+consumed][gId]=itemId;
    }
    state.lastAnyOriginalIds[gId] = originalId;
    return { itemId, name: itemMaster[itemId].name, originalName: itemMaster[originalId].name, rarity, isReroll, finalSeed: finalS };
}

function renderCell(res, idx, isHigh, gId) {
    const addr = ((idx % 2 === 0) ? 'A' : 'B') + ((idx >> 1) + 1);
    const routeIdx = window.viewData.highlightedRoute.get(`${addr}_${gId}`);
    const highlight = (window.viewData.showSimHighlight && routeIdx !== undefined) ? (routeIdx < window.viewData.checkedCount ? 'sim-route-checked' : 'sim-route-remaining') : '';
    return `<td class="rarity-${res.rarity} ${res.isReroll?'is-rerolled':''} ${highlight}" style="cursor:pointer;" onclick="handleCellClick(${res.finalSeed},'${addr}','${gId}')">${res.isReroll?`${res.originalName}<br>®${res.name}`:res.name}</td>`;
}
