/**
 * logic_simulation.js
 * 担当: 多機能・多ガチャ対応 最適ルート探索（グループ平均値一致・詳細スコア調整版）
 */

// デフォルトの重み設定
const DEFAULT_ITEM_SCORES = {
    groups: {
<<<<<<< HEAD
        DARK_NEKOME: 1000000000,
        TREASURE_RADAR: 100000000,
        VITAN_C: 10000000,
        BLUE_ORBS: 1000000,
        CHIBI: 100000,
        BATTLE_ITEMS: 10000,
        XP: 1000,
        VITAN: 100,
        BASIC: 10,
        NEKOME: 1
    },
    items: {
        // バトルアイテム (平均 10,000): ネコボン > スニャ > ニャンピュ > スピダ > おかめ
        "2002": 12000, "2005": 11000, "2003": 10000, "2000": 9000, "2004": 8000,
        
        // XP (平均 1,000): 100万 > 50万 > 10万(福引) > 3万 > 1万 > 5千 > 10万(福引G)
        "2017": 1300, "2019": 1200, "2014": 1100, "2012": 1000, "2011": 900, "2010": 800, "2078": 700,
        
        // 猫目 (平均 1): 超激 > レア > EX > 激レア
        "2053": 1.6, "2051": 1.2, "2050": 0.8, "2052": 0.4,
        
        // ビタン (平均 100): ビタンB > ビタンA
        "2056": 110, "2055": 90
    },
    // チケット別コスト（正の値。にゃんこチケットを温存するため重く設定）
    costs: {
        nyanko: 1000,
        fukubikiG: 100,
        fukubiki: 1
    }
=======
        DARK_NEKOME: 1000000000, TREASURE_RADAR: 100000000, VITAN_C: 10000000
    },
    items: {
        // バトルアイテム (個別管理)
        "2002": 12000, "2005": 11000, "2003": 10000, "2000": 9000, "2004": 8000,
        // XP (優先順位: 3万 > 1万 > 100万 > 50万 > 5千 > 10万G > 10万猫目)
        // チケットコスト(福引G:200)との比較で選好を制御
        "2012": 9000,  // 3万XP
        "2011": 8000,  // 1万XP
        "2017": 1000,  // 100万XP
        "2019": 150,   // 50万XP (コスト200を下回り、単体ではマイナス評価)
        "2010": 120,   // 5千XP
        "2078": 100,   // 10万XP (福引G)
        "2014": 100,   // 10万XP (猫目)
        // 青玉 (個別管理: デフォルト 1,000,000)
        "1000": 1000000, "1001": 1000000, "1002": 1000000, "1003": 1000000, "1004": 1000000, "1005": 1000000, "1006": 1000000, "1007": 1000000, "1008": 1000000,
        // ちびキャラ (個別管理: デフォルト 100,000)
        "209": 100000, "210": 100000, "211": 100000, "245": 100000, "246": 100000, "247": 100000, "311": 100000, "312": 100000, "313": 100000, "643": 100000,
        // ビタン (個別管理)
        "2056": 110, "2055": 90,
        // 基本キャラ (個別管理: デフォルト 10)
        "0": 10, "1": 10, "2": 10, "3": 10, "4": 10, "5": 10, "6": 10, "7": 10, "8": 10,
        // 猫目 (個別管理: デフォルト 1前後)
        "2053": 1.6, "2051": 1.2, "2050": 0.8, "2052": 0.4
    },
    // チケット消費コストの重み（傾斜: 福引 100 < 福引G 200 < にゃん 300）
    costs: { nyanko: 300, fukubikiG: 200, fukubiki: 100 }
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
};

/**
<<<<<<< HEAD
 * アイテムIDから所属グループを判定する
 */
=======
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

>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
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

<<<<<<< HEAD
const GACHA_TICKET_TYPES = {
    "0": "nyanko", "64": "nyanko", "65": "nyanko", "62": "fukubiki", "63": "fukubikiG"
};

function simulateSingleRollMulti(startIdx, lastIds, gachaId, Nodes) {
    const nodeSet = Nodes[startIdx];
    if (!nodeSet || !nodeSet[gachaId]) return null;
    const node = nodeSet[gachaId];
    const lastId = lastIds[gachaId] || null;
    const isMatch = (node.itemId === lastId);
    const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatch || window.forceRerollMode));
    let finalId = node.itemId;
    let useSeeds = 2; 
    if (isRR && node.reRollItemId !== undefined) {
        finalId = node.reRollItemId;
        useSeeds = 3; 
    }
    return { 
        itemId: finalId, rarity: itemMaster[finalId]?.rarity || 0,
        isReroll: isRR, useSeeds, nextLastId: finalId, cellAddr: node.address
    };
}

function findBestBeamSearchResult(dp, maxTotal, calculateScore) {
    let bestOverall = null;
    let bestScore = -Infinity;
    for (let t = maxTotal; t >= 0; t--) {
        const statesInTier = dp[t];
        if (!statesInTier || statesInTier.size === 0) continue;
        for (const state of statesInTier.values()) {
            const score = calculateScore(state);
            if (score > bestScore) {
                bestScore = score;
                bestOverall = state;
            }
        }
    }
    return bestOverall;
}

function runGachaSearch(Nodes, initialLastIds, limits, gachaIds, customWeights = null) {
    const BEAM_WIDTH = 1000; 
    const maxTotal = limits.nyanko + limits.fukubiki + limits.fukubikiG;
    const dp = new Array(maxTotal + 1).fill(null).map(() => new Map());
    
=======
function runGachaSearch(initialSeed, initialLastId, limits, gachaIds, customWeights = null) {
    const BEAM_WIDTH = 1000;
    const TOTAL_LIMIT = 2000;

    let maxTotal = limits.nyanko + limits.fukubiki + limits.fukubikiG;
    if (maxTotal > TOTAL_LIMIT) {
        console.warn(`Total roll requested (${maxTotal}) exceeds safety limit. Capping at ${TOTAL_LIMIT}.`);
        maxTotal = TOTAL_LIMIT;
    }

    const dp = new Array(maxTotal + 1).fill(null).map(() => new Map());

    const seedsCache = new Array(10000);
    seedsCache[0] = initialSeed >>> 0;
    for (let i = 1; i < seedsCache.length; i++) {
        const rng = new Xorshift32(seedsCache[i - 1]);
        seedsCache[i] = rng.next();
    }

>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
    const weights = {
        groups: { ...DEFAULT_ITEM_SCORES.groups, ...(customWeights?.groups || {}) },
        items: { ...DEFAULT_ITEM_SCORES.items, ...(customWeights?.items || {}) },
        costs: { ...DEFAULT_ITEM_SCORES.costs, ...(customWeights?.costs || {}) }
    };
    
    let startLastIds = {};
    if (typeof initialLastIds === 'string' && initialLastIds !== 'none') {
        gachaIds.forEach(id => startLastIds[id] = initialLastIds);
    } else if (typeof initialLastIds === 'object' && initialLastIds !== null) {
        startLastIds = { ...initialLastIds };
    }

<<<<<<< HEAD
    dp[0].set(`0_${JSON.stringify(startLastIds)}_0_0_0`, {
=======
    let startLastId = (initialLastId === 'none' || !initialLastId) ? null : String(initialLastId);

    dp[0].set(`0_${startLastId}_0_0_0`, {
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
        nodeIdx: 0,
        lastIds: startLastIds,
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
                let ticketCost = 0;
                if (ticketType === "nyanko" && state.usedNyanko < limits.nyanko) {
                    canRoll = true; ticketCost = weights.costs.nyanko;
                } else if (ticketType === "fukubiki" && state.usedFukubiki < limits.fukubiki) {
                    canRoll = true; ticketCost = weights.costs.fukubiki;
                } else if (ticketType === "fukubikiG" && state.usedFukubikiG < limits.fukubikiG) {
                    canRoll = true; ticketCost = weights.costs.fukubikiG;
                }

                if (!canRoll) continue;

                const res = simulateSingleRollMulti(state.nodeIdx, state.lastIds, gId, Nodes);
                if (!res) continue;

                const itemId = res.itemId;
                const point = getPoint(itemId);
                
                const nextLastIds = { ...state.lastIds };
                nextLastIds[gId] = res.nextLastId;

                const nextState = {
<<<<<<< HEAD
                    nodeIdx: state.nodeIdx + res.useSeeds,
                    lastIds: nextLastIds,
=======
                    nodeIdx: state.nodeIdx + res.consumed,
                    lastItemId: res.itemId,
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
                    score: state.score + point - ticketCost,
                    usedNyanko: state.usedNyanko + (ticketType === "nyanko" ? 1 : 0),
                    usedFukubiki: state.usedFukubiki + (ticketType === "fukubiki" ? 1 : 0),
                    usedFukubikiG: state.usedFukubikiG + (ticketType === "fukubikiG" ? 1 : 0),
                    path: state.path.concat({ 
                        gachaId: gId,
                        gachaName: gachaMaster[gId]?.name || gId,
                        item: getItemName(itemId), 
                        itemId: itemId,
                        isReroll: res.isReroll,
<<<<<<< HEAD
                        addr: Nodes[state.nodeIdx][gId]?.address || '?', 
                        targetCell: { addr: res.cellAddr, gachaId: gId }
=======
                        addr: res.addr,
                        nextAddr: getSimAddress(state.nodeIdx + res.consumed),
                        nodeIdx: state.nodeIdx,
                        consumed: res.consumed
>>>>>>> 65259f60a539484cc64e2aef5527042699c5c050
                    })
                };

                const key = `${nextState.nodeIdx}_${JSON.stringify(nextState.lastIds)}_${nextState.usedNyanko}_${nextState.usedFukubiki}_${nextState.usedFukubikiG}`;
                const existing = dp[t + 1].get(key);
                if (!existing || existing.score < nextState.score) {
                    dp[t + 1].set(key, nextState);
                }
            }
        }
    }
    
    const best = findBestBeamSearchResult(dp, maxTotal, (s) => s.score);
    if (best) {
        best.counts = { DARK_NEKOME: 0, TREASURE_RADAR: 0, VITAN_C: 0, BLUE_ORBS: 0 };
        best.path.forEach(p => {
            const group = getItemGroup(p.itemId);
            if (best.counts[group] !== undefined) best.counts[group]++;
        });
    }
    return best;
}
