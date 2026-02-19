/**
 * logic_simulation.js
 * 担当: 多機能・多ガチャ対応 最適ルート探索（マルチチケット・リソース管理版）
 */

// アイテムのスコア定義 (優先順位の調整)
const ITEM_SCORES = {
    DARK_NEKOME: 1000000, // 闇猫目 (ID: 2058) - 最優先
    S1000_BASE: 10000,    // 1000番台 (砲攻撃力等) - 準優先
    VITAN_C: 100,         // ビタンC (ID: 2057) - 副産物
    STEP_COST: 1          // 1歩進むごとのマイナス（最短・最速ルートを微弱に優先）
};

// ガチャIDとチケット種別の紐付け
const GACHA_TICKET_TYPES = {
    "0": "nyanko",    // にゃんこ
    "64": "nyanko",   // にゃんこ+
    "65": "nyanko",   // 猫目
    "62": "fukubiki", // 福引
    "63": "fukubikiG" // 福引G
};

/**
 * 特定のガチャでロールを実行した際のシミュレーション
 */
function simulateSingleRollMulti(startIdx, lastIds, gachaId, Nodes) {
    const nodeSet = Nodes[startIdx];
    if (!nodeSet || !nodeSet[gachaId]) return null;

    const node = nodeSet[gachaId];
    const lastId = lastIds[gachaId] || null;

    // 再抽選の判定
    const isMatch = (node.itemId === lastId);
    const isRR = (node.rarityId === 1 && node.poolSize > 1 && (isMatch || window.forceRerollMode));

    let finalId = node.itemId;
    let useSeeds = 2; 

    if (isRR && node.reRollItemId !== undefined) {
        finalId = node.reRollItemId;
        useSeeds = 3; 
    }
    
    return { 
        itemId: finalId, 
        rarity: itemMaster[finalId]?.rarity || 0,
        isReroll: isRR,
        useSeeds,
        nextLastId: finalId,
        cellAddr: node.address
    };
}

/**
 * 探索の最終結果から最良のものを選択する
 */
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

/**
 * 探索メイン関数
 * @param {Object} limits - { nyanko: 数, fukubiki: 数, fukubikiG: 数 }
 */
function runGachaSearch(Nodes, initialLastIds, limits, gachaIds) {
    const BEAM_WIDTH = 1000; 
    const maxTotal = limits.nyanko + limits.fukubiki + limits.fukubikiG;
    
    // dp[消費合計枚数] = Map(状態キー, 状態オブジェクト)
    const dp = new Array(maxTotal + 1).fill(null).map(() => new Map());
    
    // 初期状態の解析
    let startLastIds = {};
    if (typeof initialLastIds === 'string' && initialLastIds !== 'none') {
        gachaIds.forEach(id => startLastIds[id] = initialLastIds);
    } else if (typeof initialLastIds === 'object' && initialLastIds !== null) {
        startLastIds = { ...initialLastIds };
    }

    // 初期状態のセット
    dp[0].set(`0_${JSON.stringify(startLastIds)}_0_0_0`, {
        nodeIdx: 0,
        lastIds: startLastIds,
        darkNekome: 0,
        vitanC: 0,
        s1000s: 0,
        usedNyanko: 0,
        usedFukubiki: 0,
        usedFukubikiG: 0,
        path: []
    });
    
    // スコア計算ロジック
    const calculateScore = (state) => {
        return (state.darkNekome * ITEM_SCORES.DARK_NEKOME) + 
               (state.s1000s * ITEM_SCORES.S1000_BASE) +
               (state.vitanC * ITEM_SCORES.VITAN_C) - 
               (state.usedNyanko + state.usedFukubiki + state.usedFukubikiG) * ITEM_SCORES.STEP_COST;
    };

    const getItemName = (id) => itemMaster[id]?.name || "不明";

    // ビームサーチ開始
    for (let t = 0; t < maxTotal; t++) {
        if (!dp[t] || dp[t].size === 0) continue;

        // 現在のステップでの上位状態を絞り込む
        let states = Array.from(dp[t].values());
        if (states.length > BEAM_WIDTH) {
            states.sort((a, b) => calculateScore(b) - calculateScore(a));
            states = states.slice(0, BEAM_WIDTH);
        }

        for (const state of states) {
            for (const gId of gachaIds) {
                // チケット種別の判定と残数チェック
                const ticketType = GACHA_TICKET_TYPES[gId];
                if (!ticketType) continue;

                let canRoll = false;
                if (ticketType === "nyanko" && state.usedNyanko < limits.nyanko) canRoll = true;
                if (ticketType === "fukubiki" && state.usedFukubiki < limits.fukubiki) canRoll = true;
                if (ticketType === "fukubikiG" && state.usedFukubikiG < limits.fukubikiG) canRoll = true;

                if (!canRoll) continue;

                const res = simulateSingleRollMulti(state.nodeIdx, state.lastIds, gId, Nodes);
                if (!res) continue;

                const itemId = res.itemId;
                const itemIdInt = parseInt(itemId);
                
                const nextLastIds = { ...state.lastIds };
                nextLastIds[gId] = res.nextLastId;

                const nextState = {
                    nodeIdx: state.nodeIdx + res.useSeeds,
                    lastIds: nextLastIds,
                    darkNekome: state.darkNekome + (itemId === "2058" ? 1 : 0),
                    vitanC: state.vitanC + (itemId === "2057" ? 1 : 0),
                    s1000s: state.s1000s + (itemIdInt >= 1000 && itemIdInt <= 1008 ? 1 : 0),
                    usedNyanko: state.usedNyanko + (ticketType === "nyanko" ? 1 : 0),
                    usedFukubiki: state.usedFukubiki + (ticketType === "fukubiki" ? 1 : 0),
                    usedFukubikiG: state.usedFukubikiG + (ticketType === "fukubikiG" ? 1 : 0),
                    path: state.path.concat({ 
                        gachaId: gId,
                        gachaName: gachaMaster[gId]?.name || gId,
                        item: getItemName(itemId), 
                        isReroll: res.isReroll,
                        addr: Nodes[state.nodeIdx][gId]?.address || '?', 
                        targetCell: { addr: res.cellAddr, gachaId: gId }
                    })
                };

                // 重複状態の統合（より良いスコアのみ残す）
                const key = `${nextState.nodeIdx}_${JSON.stringify(nextState.lastIds)}_${nextState.usedNyanko}_${nextState.usedFukubiki}_${nextState.usedFukubikiG}`;
                const existing = dp[t + 1].get(key);
                if (!existing || calculateScore(existing) < calculateScore(nextState)) {
                    dp[t + 1].set(key, nextState);
                }
            }
        }
    }
    return findBestBeamSearchResult(dp, maxTotal, calculateScore);
}
