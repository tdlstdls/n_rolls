/**
 * logic_simulation.js
 * 担当: 多機能・多ガチャ対応 最適ルート探索（軽量化・高速化版）
 */

const DEFAULT_ITEM_SCORES = {
    groups: {
        DARK_NEKOME: 1000000000, TREASURE_RADAR: 100000000, VITAN_C: 10000000
    },
    items: {
        // バトルアイテム (個別管理)
        "2002": 12000, "2005": 11000, "2003": 10000, "2000": 9000, "2004": 8000,
        // XP (優先順位: 3万 > 1万 > 100万 > 50万 > 5千 > 10万G > 10万猫目)
        "2012": 9000, "2011": 8000, "2017": 1000, "2019": 150, "2010": 120, "2078": 100, "2014": 100,
        // 青玉
        "1000": 1000000, "1001": 1000000, "1002": 1000000, "1003": 1000000, "1004": 1000000, "1005": 1000000, "1006": 1000000, "1007": 1000000, "1008": 1000000,
        // ちびキャラ
        "209": 100000, "210": 100000, "211": 100000, "245": 100000, "246": 100000, "247": 100000, "311": 100000, "312": 100000, "313": 100000, "643": 100000,
        // ビタン
        "2056": 110, "2055": 90,
        // 基本キャラ
        "0": 10, "1": 10, "2": 10, "3": 10, "4": 10, "5": 10, "6": 10, "7": 10, "8": 10,
        // 猫目
        "2053": 1.6, "2051": 1.2, "2050": 0.8, "2052": 0.4
    },
    costs: { nyanko: 300, fukubikiG: 200, fukubiki: 100 }
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
 */
function simulateRollInternal(nodeIdx, gachaId, lastItemId, seedsCache) {
    const gacha = gachaMaster[gachaId];
    if (!gacha) return null;

    const rng = new Xorshift32(seedsCache[nodeIdx]);
    let consumed = 0;

    const s1 = rng.next(); consumed++;
    const targetRarity = determineRarity(s1, gacha.rarityRates);
    
    let filteredPool = gacha.pool.filter(id => itemMaster[id].rarity === targetRarity);
    if (filteredPool.length === 0) filteredPool = gacha.pool;

    const s2 = rng.next(); consumed++;
    const charIndex = s2 % filteredPool.length;
    const originalItemId = String(filteredPool[charIndex]);

    let finalItemId = originalItemId;
    let isReroll = false;

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

/**
 * 最適ルート検索実行 (軽量・高速化版)
 */
function runGachaSearch(initialSeed, initialLastId, limits, gachaIds, customWeights = null) {
    const BEAM_WIDTH = 150;      // 候補保持数を削減して高速化
    const SOFT_ROLL_LIMIT = 300; // 最大探索ロール数を制限

    // 探索上限をチケット合計とソフトリミットの小さい方に設定
    let maxTotal = limits.nyanko + limits.fukubiki + limits.fukubikiG;
    if (maxTotal > SOFT_ROLL_LIMIT) {
        maxTotal = SOFT_ROLL_LIMIT;
    }

    const dp = new Array(maxTotal + 1).fill(null).map(() => new Map());

    const seedsCache = new Array(10000);
    seedsCache[0] = initialSeed >>> 0;
    for (let i = 1; i < seedsCache.length; i++) {
        const rng = new Xorshift32(seedsCache[i - 1]);
        seedsCache[i] = rng.next();
    }

    const weights = {
        groups: { ...DEFAULT_ITEM_SCORES.groups, ...(customWeights?.groups || {}) },
        items: { ...DEFAULT_ITEM_SCORES.items, ...(customWeights?.items || {}) },
        costs: { ...DEFAULT_ITEM_SCORES.costs, ...(customWeights?.costs || {}) }
    };

    let startLastId = (initialLastId === 'none' || !initialLastId) ? null : String(initialLastId);

    // 初期状態
    dp[0].set(`0_${startLastId}_0_0_0`, {
        nodeIdx: 0,
        lastItemId: startLastId,
        score: 0,
        dnCount: 0, // 闇猫目カウントを追加
        usedNyanko: 0, usedFukubiki: 0, usedFukubikiG: 0,
        historyNode: null
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
        
        // 枝刈り：3つ以上の闇猫目が見つかっている場合、それ以外のルートを大幅に制限
        const hasHighQualityRoute = states.some(s => s.dnCount >= 3);
        
        if (states.length > BEAM_WIDTH) {
            states.sort((a, b) => b.score - a.score);
            states = states.slice(0, BEAM_WIDTH);
        }

        for (const state of states) {
            // 3つ目以降の闇猫目を目指す際、1つ目も取れていないルートはスキップ（簡易FIX）
            if (hasHighQualityRoute && state.dnCount < 1) continue;

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
                const isDN = (getItemGroup(res.itemId) === "DARK_NEKOME");
                const ticketCost = weights.costs[ticketType] || 0;

                const nextState = {
                    nodeIdx: state.nodeIdx + res.consumed,
                    lastItemId: res.itemId,
                    score: state.score + point - ticketCost,
                    dnCount: state.dnCount + (isDN ? 1 : 0),
                    usedNyanko: state.usedNyanko + (ticketType === "nyanko" ? 1 : 0),
                    usedFukubiki: state.usedFukubiki + (ticketType === "fukubiki" ? 1 : 0),
                    usedFukubikiG: state.usedFukubikiG + (ticketType === "fukubikiG" ? 1 : 0),
                    historyNode: {
                        parent: state.historyNode,
                        data: { 
                            gachaId: gId,
                            gachaName: gachaMaster[gId]?.name || gId,
                            item: getItemName(res.itemId), 
                            itemId: res.itemId,
                            isReroll: res.isReroll,
                            addr: res.addr,
                            nodeIdx: state.nodeIdx,
                            consumed: res.consumed
                        }
                    }
                };

                const key = `${nextState.nodeIdx}_${nextState.lastItemId}_${nextState.usedNyanko}_${nextState.usedFukubiki}_${nextState.usedFukubikiG}`;
                const existing = dp[t + 1].get(key);
                if (!existing || existing.score < nextState.score) {
                    dp[t + 1].set(key, nextState);
                }
            }
        }
    }
    
    let bestFinalState = null;
    let bestScore = -Infinity;
    for (let t = maxTotal; t >= 0; t--) {
        for (const state of dp[t].values()) {
            if (state.score > bestScore) {
                bestScore = state.score;
                bestFinalState = state;
            }
        }
    }

    if (!bestFinalState) return null;

    // ルートの復元
    const path = [];
    let curr = bestFinalState.historyNode;
    while (curr) {
        path.push(curr.data);
        curr = curr.parent;
    }
    path.reverse();

    const bestOverall = {
        ...bestFinalState,
        path: path,
        counts: { DARK_NEKOME: 0, TREASURE_RADAR: 0, VITAN_C: 0, BLUE_ORBS: 0 }
    };

    bestOverall.path.forEach(p => {
        const group = getItemGroup(p.itemId);
        if (bestOverall.counts[group] !== undefined) bestOverall.counts[group]++;
    });

    delete bestOverall.historyNode;
    return bestOverall;
}
