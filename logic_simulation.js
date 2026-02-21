/**
 * logic_simulation.js
 * 担当: 多機能・多ガチャ対応 最適ルート探索（超軽量・iPhoneフリーズ対策版）
 */

const DEFAULT_ITEM_SCORES = {
    groups: {
        DARK_NEKOME: 1000000000, TREASURE_RADAR: 100000000, VITAN_C: 10000000
    },
    items: {
        "2002": 12000, "2005": 11000, "2003": 10000, "2000": 9000, "2004": 8000,
        "2012": 9000, "2011": 8000, "2017": 1000, "2019": 150, "2010": 120, "2078": 100, "2014": 100,
        "1000": 1000000, "1001": 1000000, "1002": 1000000, "1003": 1000000, "1004": 1000000, "1005": 1000000, "1006": 1000000, "1007": 1000000, "1008": 1000000,
        "209": 100000, "210": 100000, "211": 100000, "245": 100000, "246": 100000, "247": 100000, "311": 100000, "312": 100000, "313": 100000, "643": 100000,
        "2056": 110, "2055": 90,
        "0": 10, "1": 10, "2": 10, "3": 10, "4": 10, "5": 10, "6": 10, "7": 10, "8": 10,
        "2053": 1.6, "2051": 1.2, "2050": 0.8, "2052": 0.4
    },
    costs: { nyanko: 300, fukubikiG: 200, fukubiki: 100 }
};

const GACHA_TICKET_TYPES = {
    "0": "nyanko", "64": "nyanko", "65": "nyanko", "62": "fukubiki", "63": "fukubikiG"
};

/**
 * グループキャッシュ（計算負荷軽減用）
 */
let ITEM_GROUP_CACHE = null;
function buildGroupCache() {
    const cache = {};
    const chibiIds = ["209", "210", "211", "245", "246", "247", "311", "312", "313", "643"];
    const battleIds = ["2000", "2002", "2003", "2004", "2005"];
    const xpIds = ["2010", "2011", "2012", "2014", "2017", "2019", "2078"];
    const vitanIds = ["2055", "2056"];
    const basicIds = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];
    const nekomeIds = ["2050", "2051", "2052", "2053"];

    Object.keys(itemMaster).forEach(id => {
        if (id === "2058") cache[id] = "DARK_NEKOME";
        else if (id === "2001") cache[id] = "TREASURE_RADAR";
        else if (id === "2057") cache[id] = "VITAN_C";
        else {
            const idInt = parseInt(id);
            if (idInt >= 1000 && idInt <= 1008) cache[id] = "BLUE_ORBS";
            else if (chibiIds.includes(id)) cache[id] = "CHIBI";
            else if (battleIds.includes(id)) cache[id] = "BATTLE_ITEMS";
            else if (xpIds.includes(id)) cache[id] = "XP";
            else if (vitanIds.includes(id)) cache[id] = "VITAN";
            else if (basicIds.includes(id)) cache[id] = "BASIC";
            else if (nekomeIds.includes(id)) cache[id] = "NEKOME";
            else cache[id] = null;
        }
    });
    return cache;
}

function getSimAddress(idx) {
    const row = (idx >> 1) + 1;
    const side = (idx % 2 === 0) ? 'A' : 'B';
    return side + row;
}

function simulateRollInternal(nodeIdx, gachaId, lastItemId, seedsCache) {
    const gacha = gachaMaster[gachaId];
    if (!gacha) return null;

    const rng = new Xorshift32(seedsCache[nodeIdx]);
    let consumed = 0;

    const s1 = rng.next(); consumed++;
    const r = s1 % 10000;
    let targetRarity = 1;
    let sum = 0;
    const rates = gacha.rarityRates;
    const sortedKeys = Object.keys(rates).sort((a, b) => a - b);
    for (let k of sortedKeys) {
        sum += rates[k];
        if (r < sum) { targetRarity = parseInt(k); break; }
    }
    
    let pool = gacha.pool.filter(id => itemMaster[id].rarity === targetRarity);
    if (pool.length === 0) pool = gacha.pool;

    const s2 = rng.next(); consumed++;
    const charIndex = s2 % pool.length;
    const originalId = String(pool[charIndex]);

    let finalId = originalId;
    let isReroll = false;

    if (itemMaster[originalId].rarity === 1 && originalId === String(lastItemId) && pool.length > 1) {
        isReroll = true;
        let excluded = [charIndex];
        while (true) {
            const divisor = pool.length - excluded.length;
            if (divisor <= 0) break;
            const sNext = rng.next(); consumed++;
            const tempSlot = sNext % divisor;
            let finalSlot = tempSlot;
            let sortedEx = [...excluded].sort((a, b) => a - b);
            for (let ex of sortedEx) { if (finalSlot >= ex) finalSlot++; else break; }
            const nextId = String(pool[finalSlot]);
            if (nextId !== String(lastItemId)) { finalId = nextId; break; }
            excluded.push(finalSlot);
            if (excluded.length >= 15) break;
        }
    }
    return { itemId: finalId, consumed, isReroll, addr: getSimAddress(nodeIdx) };
}

function runGachaSearch(initialSeed, initialLastId, limits, gachaIds, customWeights = null) {
    const BEAM_WIDTH = 120; // 負荷軽減のため削減
    const TOTAL_LIMIT = 1500; // 安全のため上限を少し抑制

    ITEM_GROUP_CACHE = buildGroupCache();
    let maxTotal = limits.nyanko + limits.fukubiki + limits.fukubikiG;
    if (maxTotal > TOTAL_LIMIT) maxTotal = TOTAL_LIMIT;

    const dp = new Array(maxTotal + 1).fill(null).map(() => new Map());
    const seedsCache = new Uint32Array(8000);
    seedsCache[0] = initialSeed >>> 0;
    for (let i = 1; i < seedsCache.length; i++) {
        let x = seedsCache[i - 1];
        x ^= (x << 13); x ^= (x >>> 17); x ^= (x << 15);
        seedsCache[i] = x >>> 0;
    }

    const weights = {
        groups: { ...DEFAULT_ITEM_SCORES.groups, ...(customWeights?.groups || {}) },
        items: { ...DEFAULT_ITEM_SCORES.items, ...(customWeights?.items || {}) },
        costs: { ...DEFAULT_ITEM_SCORES.costs, ...(customWeights?.costs || {}) }
    };

    let startLastId = (initialLastId === 'none' || !initialLastId) ? null : String(initialLastId);

    dp[0].set(`0_${startLastId}`, {
        nodeIdx: 0, lastItemId: startLastId, score: 0,
        usedN: 0, usedF: 0, usedFG: 0, prev: null, action: null
    });

    for (let t = 0; t < maxTotal; t++) {
        if (dp[t].size === 0) continue;
        let states = Array.from(dp[t].values());
        if (states.length > BEAM_WIDTH) {
            states.sort((a, b) => b.score - a.score);
            states = states.slice(0, BEAM_WIDTH);
        }

        for (const state of states) {
            for (const gId of gachaIds) {
                const type = GACHA_TICKET_TYPES[gId];
                if (!type) continue;
                if (type === "nyanko" && state.usedN >= limits.nyanko) continue;
                if (type === "fukubiki" && state.usedF >= limits.fukubiki) continue;
                if (type === "fukubikiG" && state.usedFG >= limits.fukubikiG) continue;

                const res = simulateRollInternal(state.nodeIdx, gId, state.lastItemId, seedsCache);
                if (!res) continue;

                const idStr = res.itemId;
                const point = weights.items[idStr] !== undefined ? weights.items[idStr] : (weights.groups[ITEM_GROUP_CACHE[idStr]] || 0);
                
                const nextState = {
                    nodeIdx: state.nodeIdx + res.consumed,
                    lastItemId: idStr,
                    score: state.score + point - (weights.costs[type] || 0),
                    usedN: state.usedN + (type === "nyanko" ? 1 : 0),
                    usedF: state.usedF + (type === "fukubiki" ? 1 : 0),
                    usedFG: state.usedFG + (type === "fukubikiG" ? 1 : 0),
                    prev: state,
                    action: {
                        gachaId: gId, gachaName: gachaMaster[gId].name,
                        item: itemMaster[idStr].name, itemId: idStr,
                        isReroll: res.isReroll, addr: res.addr
                    }
                };

                const key = `${nextState.nodeIdx}_${idStr}_${nextState.usedN}_${nextState.usedF}`;
                const existing = dp[t + 1].get(key);
                if (!existing || existing.score < nextState.score) {
                    dp[t + 1].set(key, nextState);
                }
            }
        }
    }
    
    let best = null;
    let maxScore = -Infinity;
    for (let t = maxTotal; t >= 0; t--) {
        for (const s of dp[t].values()) {
            if (s.score > maxScore) { maxScore = s.score; best = s; }
        }
    }

    if (best) {
        const path = [];
        let curr = best;
        while (curr && curr.action) { path.push(curr.action); curr = curr.prev; }
        best.path = path.reverse();
        best.counts = { DARK_NEKOME: 0, TREASURE_RADAR: 0, VITAN_C: 0, BLUE_ORBS: 0 };
        best.path.forEach(p => {
            const group = ITEM_GROUP_CACHE[p.itemId];
            if (best.counts[group] !== undefined) best.counts[group]++;
        });
    }
    return best;
}
