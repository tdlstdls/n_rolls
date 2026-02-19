/**
 * confirm_manager.js
 * 確認モードの表示状態とUIパーツを管理
 */

const ConfirmManager = {
    isActive: false,

    init(onToggleCallback) {
        // 配置先をヘッダーから下部のコントロールエリアに変更
        const bottomControls = document.getElementById('bottom-controls');
        if (!bottomControls) return;

        const oldBtn = document.getElementById('toggle-confirm-mode');
        if (oldBtn) oldBtn.remove();

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-confirm-mode';
        toggleBtn.textContent = '確認モード';
        // 左側のボタンとの間隔を空ける
        toggleBtn.style.marginLeft = '0px'; 
        toggleBtn.style.backgroundColor = '#6c757d';

        toggleBtn.addEventListener('click', () => {
            this.isActive = !this.isActive;
            toggleBtn.textContent = this.isActive ? '確認モードON' : '確認モード';
            toggleBtn.style.backgroundColor = this.isActive ? '#28a745' : '#6c757d';
            if (onToggleCallback) onToggleCallback();
        });

        bottomControls.appendChild(toggleBtn);
    },

    generateMasterInfoHtml(targetIds, gachaMaster, itemMaster) {
        let html = '<div id="master-info-display" style="background: #fff; padding: 15px; margin-bottom: 20px; border: 1px solid #ddd; font-size: 0.8rem; text-align: left; line-height: 1.6; border-radius: 8px;">';
        html += '<h3 style="margin-top:0; font-size:1rem; border-bottom: 2px solid #eee; padding-bottom:5px;">ガチャマスター情報 (確認モード)</h3>';
        targetIds.forEach(id => {
            const gacha = gachaMaster[id];
            html += `<div style="margin-bottom: 10px;"><strong>【${gacha.name} (ID:${id})】</strong><br>`;
            for (let r = 0; r <= 4; r++) {
                const itemsInRarity = gacha.pool.filter(itemId => itemMaster[itemId] && itemMaster[itemId].rarity === r);
                const itemStrings = itemsInRarity.map((itemId, index) => `${index} ${itemMaster[itemId].name}`).join(', ');
                html += `<span style="display:inline-block; min-width:120px;">レアリティ${r}（${itemsInRarity.length}件）</span>: ${itemStrings || 'なし'}<br>`;
            }
            html += '</div>';
        });
        html += '</div>';
        return html;
    },

    getExtraColCount() {
        return this.isActive ? 2 : 0;
    },

    renderSeedCells(result) {
        return `<td class="col-seed" style="font-size:0.7rem; background-color:#fafafa;">${result.s1}</td>` +
               `<td class="col-seed" style="font-size:0.7rem; background-color:#fafafa;">${result.s2}</td>`;
    },

    getCellAttributes(result) {
        const popupText = `
【${result.gachaName} 抽選詳細】
■1段階目：レアリティ判定
・乱数 S1: ${result.s1}
・剰余 (S1 % 10000): ${result.rRarity}
・判定結果: レアリティ ${result.rarity}

■2段階目：スロット判定
・乱数 S2: ${result.s2}
・対象プール数: ${result.poolSize}
・剰余 (S2 % プール数): ${result.charIndex}
・判定結果: ${result.name}
${result.isRerolled ? `
■再抽選 (レア被り発生)
${result.rerollHistory.map((h, i) => `[${i+1}回目] シード:${h.seed}, 剰余:${h.index} -> ${h.name || '不明'}`).join('\\n')}` : ''}
        `.trim();
        const escapedText = popupText.replace(/\n/g, '\\n').replace(/'/g, "\\'");
        return `onclick="alert('${escapedText}')" style="cursor:pointer;" title="クリックで詳細表示"`;
    }
};
