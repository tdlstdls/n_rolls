/**
 * logic_simulation.js
 * 担当: 多機能・多ガチャ対応 最適ルート探索（グローバル一致判定・線形シード同期版）
 */

const DEFAULT_ITEM_SCORES = {
    groups: {
        DARK_NEKOME: 1000000000, TREASURE_RADAR: 100000000, VITAN_C: 10000000,
        BLUE_ORBS: 1000000, CHIBI: 100000, BATTLE_ITEMS: 10000, XP: 1000,
        VITAN: 100, BASIC: 10, NEKOME: 1
    },
    items: {
        "2002": 12000, "2005": 11000, "2003": 10000, "2000": 9000, "2004": 8000,
        "2017": 1300, "2019": 1200, "2014": 1100, "2012": 1000, "2011": 900, "2010": 800, "2078": 700,
        "2053": 1.6, "2051": 1.2, "2050": 0.8, "2052": 0.4, "2056": 110, "2055": 90
    },
    costs: { nyanko: 1000, fukubikiG: 100, fukubiki: 1 }
};

const GACHA_TICKET_TYPES = {
    "0": "nyanko", "64": "nyanko", "65": "nyanko", "62": "fukubiki", "63": "fukubikiG"
};

function getSimAddress(idx) {
    const row = Math.floor(idx / 2) + 1;
    const side = (idx % 2 === 0) ? 'A' : 'B';
    return `${side}${row}`;
}

/**
 * 内部抽選ロジック
 * @param {string} lastItemId 直前に「確定して排出された」アイテムID
 */
function simulateRollInternal(nodeIdx, gachaId, lastItemId, seedsCache) {
    const gacha = gachaMaster[gachaId];
    if (!gacha) return null;

    const rng = new Xorshift32(seedsCache[nodeIdx]);
    let consumed = 0;

    // 1段階目：レアリティ判定 (S1, S3, S5...)
    const s1 = rng.next(); consumed++;
    const targetRarity = determineRarity(s1, gacha.rarityRates);
    
    let filteredPool = gacha.pool.filter(id => itemMaster[id].rarity === targetRarity);
    if (filteredPool.length === 0) filteredPool = gacha.pool;

    // 2段階目：スロット判定 (S2, S4, S6...)
    const s2 = rng.next(); consumed++;
    const charIndex = s2 % filteredPool.length;
    const originalItemId = String(filteredPool[charIndex]);

    let finalItemId = originalItemId;
    let isReroll = false;

    // 一致判定: 直前に排出されたアイテムIDと比較。バナーに関わらず共通のIDを使用。
    // itemMaster[id].rarity
    if (itemMaster[originalItemId].rarity === 1 && originalItemId === String(lastItemId) && filteredPool.length > 1) {
        isReroll = true;
        let excluded = [charIndex];
        while (true) {
            const divisor = filteredPool.length - excluded.length;
            if (divisor <= 0) break;
            
            const sNext = rng.next(); consumed++;
            const tempSlot = sNext % divisor;
            const finalSlot = mapToActualSlot(tempSlot, excluded);
            const nextItemId = String(filteredPool[finalSlot]);

            // 再抽選結果が前回のアイテムと異なれば確定
            if (nextItemId !== String(lastItemId)) {
                finalItemId = nextItemId;
                break;
            }
            excluded.push(finalSlot);
            if (excluded.length >= 15) break;
        }
    }

    return { itemId: finalItemId, consumed, isReroll, addr: getSimAddress(nodeIdx) };
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

function mapToActualSlot(tempSlot, excludedIndices) {
    let sortedEx = [...excludedIndices].sort((a, b) => a - b);
    let finalSlot = tempSlot;
    for (let ex of sortedEx) {
        if (finalSlot >= ex) finalSlot++;
        else break;
    }
    return finalSlot;
}

function getItemGroup(itemId) {
    const id = String(itemId);
    if (id === "2058") return "DARK_NEKOME";
    if (id === "2001") return "TREASURE_RADAR";
    if (id === "2057") return "VITAN_C";
    const idInt = parseInt(id);
    if (idInt >= 1000 && idInt <= 1008) return "BLUE_ORBS";
    const chibiIds = ["209", "210", "211", "245", "246", "247", "311", "312", "313", "643"];
    if (chibiIds.includes(id)) return "CHIBI";
    const battleIds = ["2000", "2002", "2003", "2004", "2005"];
    if (battleIds.includes(id)) return "BATTLE_ITEMS";
    const xpIds = ["2010", "2011", "2012", "2014", "2017", "2019", "2078"];
    if (xpIds.includes(id)) return "XP";
    const vitanIds = ["2055", "2056"];
    if (vitanIds.includes(id)) return "VITAN";
    const basicIds = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];
    if (basicIds.includes(id)) return "BASIC";
    const nekomeIds = ["2050", "2051", "2052", "2053"];
    if (nekomeIds.includes(id)) return "NEKOME";
    return null;
}

function runGachaSearch(initialSeed, initialLastId, limits, gachaIds, customWeights = null) {
    const BEAM_WIDTH = 1000;
    const maxTotal = limits.nyanko + limits.fukubiki + limits.fukubikiG;
    const dp = new Array(maxTotal + 1).fill(null).map(() => new Map());

    const seedsCache = new Array(2000);
    seedsCache[0] = initialSeed >>> 0;
    for (let i = 1; i < seedsCache.length; i++) {
        const rng = new Xorshift32(seedsCache[i - 1]);
        seedsCache[i] = rng.next();
    }

    const weights = {
        groups: (customWeights && customWeights.groups) ? customWeights.groups : DEFAULT_ITEM_SCORES.groups,
        items: (customWeights && customWeights.items) ? customWeights.items : DEFAULT_ITEM_SCORES.items,
        costs: (customWeights && customWeights.costs) ? customWeights.costs : DEFAULT_ITEM_SCORES.costs
    };

    // 初期状態の lastItemId (単一の変数として管理)
    let startLastId = (initialLastId === 'none' || !initialLastId) ? null : String(initialLastId);

    dp[0].set(`0_${startLastId}_0_0_0`, {
        nodeIdx: 0,
        lastItemId: startLastId,
        score: 0,
        usedNyanko: 0, usedFukubiki: 0, usedFukubikiG: 0,
        path: []
    });

    const getPoint = (itemId) => {
        const idStr = String(itemId);
        if (weights.items[idStr] !== undefined) return weights.items[idStr];
        const group = getItemGroup(idStr);
        return weights.groups[group] || 0;
    };

    const getItemName = (id) => itemMaster[id]?.name || "不明";

    for (let t = 0; t < maxTotal; t++) {
        if (!dp[t] || dp[t].size === 0) continue;
        let states = Array.from(dp[t].values());
        if (states.length > BEAM_WIDTH) {
            states.sort((a, b) => b.score - a.score);
            states = states.slice(0, BEAM_WIDTH);
        }

        for (const state of states) {
            for (const gId of gachaIds) {
                const ticketType = GACHA_TICKET_TYPES[gId];
                if (!ticketType) continue;

                let canRoll = false;
                if (ticketType === "nyanko" && state.usedNyanko < limits.nyanko) canRoll = true;
                else if (ticketType === "fukubiki" && state.usedFukubiki < limits.fukubiki) canRoll = true;
                else if (ticketType === "fukubikiG" && state.usedFukubikiG < limits.fukubikiG) canRoll = true;

                if (!canRoll) continue;

                const res = simulateRollInternal(state.nodeIdx, gId, state.lastItemId, seedsCache);
                if (!res) continue;

                const point = getPoint(res.itemId);
                const ticketCost = weights.costs[ticketType] || 0;

                const nextState = {
                    nodeIdx: state.nodeIdx + res.consumed,
                    lastItemId: res.itemId, // 今回の結果を「確定結果」として次回へ引き継ぐ
                    score: state.score + point - ticketCost,
                    usedNyanko: state.usedNyanko + (ticketType === "nyanko" ? 1 : 0),
                    usedFukubiki: state.usedFukubiki + (ticketType === "fukubiki" ? 1 : 0),
                    usedFukubikiG: state.usedFukubikiG + (ticketType === "fukubikiG" ? 1 : 0),
                    path: state.path.concat({ 
                        gachaId: gId,
                        gachaName: gachaMaster[gId]?.name || gId,
                        item: getItemName(res.itemId), 
                        itemId: res.itemId,
                        isReroll: res.isReroll,
                        addr: res.addr,
                        nextAddr: getSimAddress(state.nodeIdx + res.consumed)
                    })
                };

                const key = `${nextState.nodeIdx}_${nextState.lastItemId}_${nextState.usedNyanko}_${nextState.usedFukubiki}_${nextState.usedFukubikiG}`;
                const existing = dp[t + 1].get(key);
                if (!existing || existing.score < nextState.score) {
                    dp[t + 1].set(key, nextState);
                }
            }
        }
    }
    
    let bestOverall = null;
    let bestScore = -Infinity;
    for (let t = maxTotal; t >= 0; t--) {
        for (const state of dp[t].values()) {
            if (state.score > bestScore) {
                bestScore = state.score;
                bestOverall = state;
            }
        }
    }

    if (bestOverall) {
        bestOverall.counts = { DARK_NEKOME: 0, TREASURE_RADAR: 0, VITAN_C: 0, BLUE_ORBS: 0 };
        bestOverall.path.forEach(p => {
            const group = getItemGroup(p.itemId);
            if (bestOverall.counts[group] !== undefined) bestOverall.counts[group]++;
        });
    }
    return bestOverall;
}
