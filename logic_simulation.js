/**
 * logic_simulation.js
 * 役割: 高精度・低負荷なルート探索エンジン（ABバランス維持 & 独立判定ステート）
 */

// 内部用Xorshiftクラス（外部依存を排除）
class Xorshift32 {
    constructor(seed) { this.x = seed >>> 0; }
    next() {
        this.x ^= (this.x << 13); this.x ^= (this.x >>> 17); this.x ^= (this.x << 15);
        return (this.x >>> 0);
    }
}

// アイテムのスコア定義（闇猫目を絶対最優先）
const DEFAULT_ITEM_SCORES = {
    groups: { 
        DARK_NEKOME: 1000000000,   // 最優先
        TREASURE_RADAR: 100000000, 
        VITAN_C: 10000000 
    },
    items: {
        "2002": 12000, "2005": 11000, "2003": 10000, "2000": 9000, "2004": 8000, // バトルアイテム
        "1000": 1000000, "1001": 1000000, "1002": 1000000, // 青玉
        "2012": 9000, "2011": 8000, "2017": 1000, // XP
        "2053": 1.6, "2051": 1.2, "2050": 0.8, "2052": 0.4 // 猫目
    },
    costs: { nyanko: 300, fukubikiG: 200, fukubiki: 100 }
};

const GACHA_TICKET_TYPES = { "0": "nyanko", "64": "nyanko", "65": "nyanko", "62": "fukubiki", "63": "fukubikiG" };

// 高速計算用グループキャッシュ
let ITEM_GROUP_CACHE = null;
function buildGroupCache() {
    const cache = {};
    const groups = {
        DARK_NEKOME: ["2058"],
        TREASURE_RADAR: ["2001"],
        VITAN_C: ["2057"],
        BLUE_ORBS: ["1000","1001","1002","1003","1004","1005","1006","1007","1008"],
        CHIBI: ["209","210","211","245","246","247","311","312","313","643"],
        BATTLE_ITEMS: ["2000","2002","2003","2004","2005"],
        XP: ["2010","2011","2012","2014","2017","2019","2078"],
        BASIC: ["0","1","2","3","4","5","6","7","8"],
        NEKOME: ["2050","2051","2052","2053"]
    };
    Object.keys(itemMaster).forEach(id => {
        let found = null;
        for (let g in groups) { if (groups[g].includes(id)) { found = g; break; } }
        cache[id] = found;
    });
    return cache;
}

/**
 * 住所（A1, B1...）の計算
 */
function getSimAddress(idx) {
    const row = (idx >> 1) + 1;
    const side = (idx % 2 === 0) ? 'A' : 'B';
    return side + row;
}

/**
 * 独立した一致判定ロジックを含む抽選シミュレーション
 * @param {string} lastItemId この探索パスにおける直前の排出アイテムID
 */
function simulateRollInternal(nodeIdx, gachaId, lastItemId, seedsCache) {
    const gacha = gachaMaster[gachaId];
    if (!gacha) return null;

    const rng = new Xorshift32(seedsCache[nodeIdx]);
    let consumed = 0;

    const s1 = rng.next(); consumed++;
    const r = s1 % 10000;
    let targetRarity = 1, sum = 0;
    const rates = gacha.rarityRates;
    const sortedKeys = Object.keys(rates).sort((a, b) => a - b);
    for (let k of sortedKeys) { sum += rates[k]; if (r < sum) { targetRarity = parseInt(k); break; } }
    
    let pool = gacha.pool.filter(id => itemMaster[id].rarity === targetRarity);
    if (pool.length === 0) pool = gacha.pool;

    const s2 = rng.next(); consumed++;
    const charIndex = s2 % pool.length;
    const originalId = String(pool[charIndex]);

    let finalId = originalId, isReroll = false;

    // ガチャ種類を問わず、このパスの直前アイテムと一致するか判定（レア被り）
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

/**
 * ルート検索（ビームサーチ：親ポインタ方式 & ABバランス重視）
 */
function runGachaSearch(initialSeed, initialLastId, limits, gachaIds, customWeights = null) {
    const BEAM_WIDTH = 150; // iPhoneの限界性能に最適化
    const TOTAL_LIMIT = 2000;

    ITEM_GROUP_CACHE = buildGroupCache();
    let maxTotal = limits.nyanko + limits.fukubiki + limits.fukubikiG;
    if (maxTotal > TOTAL_LIMIT) maxTotal = TOTAL_LIMIT;

    const dp = new Array(maxTotal + 1).fill(null).map(() => new Map());
    
    // シードキャッシュの生成
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

    // 初期状態 (lastItemId を独立保持)
    dp[0].set(`0_${startLastId}`, {
        nodeIdx: 0, lastItemId: startLastId, score: 0,
        usedN: 0, usedF: 0, usedFG: 0,
        nodeA: 0, nodeB: 0, // A/Bそれぞれの進み具合を保持
        prev: null, action: null
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

                // 独立した一致判定用IDを使用して抽選
                const res = simulateRollInternal(state.nodeIdx, gId, state.lastItemId, seedsCache);
                if (!res) continue;

                const idStr = res.itemId;
                const itemScore = weights.items[idStr] !== undefined ? weights.items[idStr] : (weights.groups[ITEM_GROUP_CACHE[idStr]] || 0);
                
                // ABバランス補正ロジック: AとBの進み具合が離れるほど微小なマイナスをかけ、闇猫目見逃しを抑制
                const nextNodeA = state.nodeIdx % 2 === 0 ? state.nodeIdx + res.consumed : state.nodeIdx;
                const nextNodeB = state.nodeIdx % 2 !== 0 ? state.nodeIdx + res.consumed : state.nodeIdx;
                const balancePenalty = Math.abs(nextNodeA - nextNodeB) * 0.1;

                const nextState = {
                    nodeIdx: state.nodeIdx + res.consumed,
                    lastItemId: idStr, // 次の判定のためにこのパスのIDを更新
                    score: state.score + itemScore - (weights.costs[type] || 0) - balancePenalty,
                    usedN: state.usedN + (type === "nyanko" ? 1 : 0),
                    usedF: state.usedF + (type === "fukubiki" ? 1 : 0),
                    usedFG: state.usedFG + (type === "fukubikiG" ? 1 : 0),
                    prev: state, // 親へのポインタ（配列コピーなし）
                    action: {
                        gachaId: gId, gachaName: gachaMaster[gId].name,
                        item: itemMaster[idStr].name, itemId: idStr,
                        isReroll: res.isReroll, addr: res.addr
                    }
                };

                // ステートキー (進捗 + 直前アイテム + 消費枚数)
                const key = `${nextState.nodeIdx}_${idStr}_${nextState.usedN}_${nextState.usedF}`;
                const existing = dp[t + 1].get(key);
                if (!existing || existing.score < nextState.score) {
                    dp[t + 1].set(key, nextState);
                }
            }
        }
    }
    
    // スコア最大の最終状態を特定
    let best = null, maxScore = -Infinity;
    for (let t = maxTotal; t >= 0; t--) {
        for (const s of dp[t].values()) {
            if (s.score > maxScore) { maxScore = s.score; best = s; }
        }
    }

    if (best) {
        // 親ポインタを遡って1つのルート配列を作成（メモリ節約の核）
        const path = [];
        let curr = best;
        while (curr && curr.action) {
            path.push(curr.action);
            curr = curr.prev;
        }
        best.path = path.reverse();

        // 統計情報の集計
        best.counts = { DARK_NEKOME: 0, TREASURE_RADAR: 0, VITAN_C: 0, BLUE_ORBS: 0 };
        best.path.forEach(p => {
            const group = ITEM_GROUP_CACHE[p.itemId];
            if (best.counts[group] !== undefined) best.counts[group]++;
        });
    }
    return best;
}
