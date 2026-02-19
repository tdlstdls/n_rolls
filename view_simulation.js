/**
 * view_simulation.js
 * 担当: 多機能・多ガチャ対応シミュレーションUIと結果表示（UI統合・表示保持版）
 */

/**
 * スタイル付き要素を生成する共通関数
 */
function createStyledElement(tag, styles = {}, properties = {}) {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    Object.assign(element, properties);
    return element;
}

/**
 * シミュレーション表示エリアの初期化
 */
function initializeSimulationView() {
    let simContainer = document.getElementById('sim-ui-container');
    
    // 【修正】既存の入力グループ（Seed入力欄など）を保護するために、一旦ヘッダーへ戻す
    // これを行わないと、下の innerHTML = '' で要素が消滅し、次回の再描画時にエラーの原因になります
    const existingGroup = document.querySelector('#sim-ui-container .input-group');
    if (existingGroup) {
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(existingGroup);
        }
    }

    if (!simContainer) {
        simContainer = document.createElement('div');
        simContainer.id = 'sim-ui-container';
        simContainer.style.marginBottom = '15px';
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.insertBefore(simContainer, resultDiv.firstChild);
        }
    }

    // 中身をクリア（入力グループはヘッダーへ避難済みなので安全）
    simContainer.innerHTML = '';

    const simGroup = createStyledElement('div', {
        padding: '10px 15px',
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #ddd',
        marginTop: '5px'
    });

    const controlRow = createStyledElement('div', {
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '15px'
    });

    // 退避させた（あるいは最初からある）入力グループをシミュレーション行の先頭に組み込む
    const headerInputGroup = document.querySelector('header .input-group');
    if (headerInputGroup) {
        controlRow.appendChild(headerInputGroup);
    }

    // チケット入力（デフォルト値を100に変更）と実行ボタン群を横並びで追加
    const extraControls = document.createElement('div');
    extraControls.style.display = 'flex';
    extraControls.style.alignItems = 'center';
    extraControls.style.flexWrap = 'wrap';
    extraControls.style.gap = '10px';
    extraControls.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px; border-left: 1px solid #eee; padding-left: 10px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">にゃんこ:</label>
            <input type="number" id="simTicketNyanko" value="100" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">福引:</label>
            <input type="number" id="simTicketFukubiki" value="100" style="width: 60px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #555;">福引G:</label>
            <input type="number" id="simTicketFukubikiG" value="100" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="display: flex; gap: 5px; margin-left: 5px;">
            <button id="runSimBtn" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">最適検索</button>
            <button id="copySimResultBtn" style="background-color: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">コピー</button>
            <button id="toggleHighlightBtn" style="background-color: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">ハイライト: ON</button>
        </div>
    `;

    controlRow.appendChild(extraControls);
    simGroup.appendChild(controlRow);
    simContainer.appendChild(simGroup);

    const resultDisplay = createStyledElement('div', {
        marginTop: '10px', padding: '15px', border: '1px solid #28a745',
        backgroundColor: '#f9fff9', whiteSpace: 'pre-wrap', fontFamily: 'monospace',
        fontSize: '0.85rem', display: 'none', borderRadius: '8px', lineHeight: '1.4'
    }, { id: 'sim-result-text' });

    simContainer.appendChild(resultDisplay);

    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('copySimResultBtn').onclick = copySimResult;
    document.getElementById('toggleHighlightBtn').onclick = toggleHighlightMode;

    updateHighlightButtonText();
    injectSimStyles();

    // カラム切り替え時などに、すでに計算結果があれば再表示する
    if (window.viewData.lastSimResult) {
        displaySimulationResult(window.viewData.lastSimResult);
    }
}

/**
 * シミュレーションの実行
 */
function runSimulation() {
    if (!viewData.calculatedData || !viewData.calculatedData.Nodes) {
        alert("データが計算されていません。先に「更新」ボタンを押してください。");
        return;
    }

    const limits = {
        nyanko: parseInt(document.getElementById('simTicketNyanko').value) || 0,
        fukubiki: parseInt(document.getElementById('simTicketFukubiki').value) || 0,
        fukubikiG: parseInt(document.getElementById('simTicketFukubikiG').value) || 0
    };

    const { Nodes } = viewData.calculatedData;
    
    const activeGachaIds = viewData.gachaIds.filter(id => {
        if (id === "0" && !displayIds.includes("0") && displayIds.includes("64")) return false;
        if (id === "64" && !displayIds.includes("64") && displayIds.includes("0")) return false;
        return true;
    });
    
    const initialLastIds = {};
    activeGachaIds.forEach(id => { initialLastIds[id] = 'none'; });

    const result = runGachaSearch(Nodes, initialLastIds, limits, activeGachaIds);
    window.viewData.lastSimResult = result;

    if (viewData) {
        viewData.highlightedRoute = new Map();
        if (result) {
            result.path.forEach(p => {
                const key = `${p.targetCell.addr}_${p.targetCell.gachaId}`;
                viewData.highlightedRoute.set(key, true);
            });
            viewData.showSimHighlight = true;
        }
        updateHighlightButtonText();
        if (typeof runSimulationAndDisplay === 'function') runSimulationAndDisplay();
    }

    displaySimulationResult(result);
}

/**
 * シミュレーション結果の描画
 */
function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    if (!display) return;
    display.style.display = 'block';
    display.innerHTML = "";

    if (!result) {
        display.textContent = "指定された枚数内で有効なルートが見つかりませんでした。";
        window.lastSimText = "";
        return;
    }

    const header = createStyledElement('div', {
        fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #28a745',
        paddingBottom: '4px', fontSize: '0.95rem', color: '#155724'
    });
    header.textContent = `【最適獲得ルート】(闇猫目:${result.darkNekome} / ビタンC:${result.vitanC} / 青玉:${result.s1000s})`;
    display.appendChild(header);

    let plainText = `【最適ルートシミュレーション結果】(闇猫目:${result.darkNekome}, ビタンC:${result.vitanC}, 青玉:${result.s1000s})\n\n`;
    
    let i = 0;
    while (i < result.path.length) {
        let j = i;
        const currentGachaId = result.path[i].gachaId;
        const currentGachaName = result.path[i].gachaName;
        const itemsHtml = [], itemsPlain = [];
        
        while (j < result.path.length && result.path[j].gachaId === currentGachaId) {
            const step = result.path[j];
            let label = step.isReroll ? " (被り)" : "";
            itemsHtml.push(getColoredItemHtml(step.item) + label);
            itemsPlain.push(step.item + label);
            j++;
        }

        const count = j - i;
        const addr = result.path[i].addr;
        const rowHeader = `<span style="color: #d9534f; font-weight: bold;">[${currentGachaName}]</span> ${count}回 (${addr}～):<br>`;
        const html = "　=> " + itemsHtml.join('、');
        const plain = `[${currentGachaName}] ${count}回 (${addr}～) => ` + itemsPlain.join('、');

        display.appendChild(createResultRow(rowHeader + html));
        plainText += plain + "\n";
        i = j;
    }

    window.lastSimText = plainText;
}

function createResultRow(innerHTML) {
    const row = createStyledElement('div', {
        display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '3px'
    });
    const cb = createStyledElement('input', { marginTop: '3px', cursor: 'pointer' }, { type: 'checkbox' });
    const span = createStyledElement('span', { lineHeight: '1.4', flex: '1' }, { innerHTML });
    cb.onchange = () => {
        span.style.color = cb.checked ? '#aaa' : '#333';
        span.style.textDecoration = cb.checked ? 'line-through' : 'none';
    };
    row.append(cb, span);
    return row;
}

function getColoredItemHtml(name) {
    const item = Object.values(itemMaster).find(it => it.name === name);
    if (!item) return name;
    
    if (item.name === "闇猫目") return `<span style="color: #0000ff; font-weight: bold; background-color: #ffff00;">${name}</span>`;
    if (item.name === "ビタンC") return `<span style="color: #d9534f; font-weight: bold;">${name}</span>`;
    
    const itemId = Object.keys(itemMaster).find(key => itemMaster[key].name === name);
    const idInt = parseInt(itemId);
    if (idInt >= 1000 && idInt <= 1008) return `<span style="color: #c0a000; font-weight: bold;">${name}</span>`;
    
    if (item.rarity === 4) return `<span style="color: #0000ff; font-weight: bold;">${name}</span>`;
    if (item.rarity === 3) return `<span style="color: #d9534f; font-weight: bold;">${name}</span>`;
    if (item.rarity === 2) return `<span style="color: #c0a000; font-weight: bold;">${name}</span>`;
    return name;
}

function toggleHighlightMode() {
    viewData.showSimHighlight = !viewData.showSimHighlight;
    updateHighlightButtonText();
    if (typeof runSimulationAndDisplay === 'function') runSimulationAndDisplay();
}

function updateHighlightButtonText() {
    const btn = document.getElementById('toggleHighlightBtn');
    if (!btn) return;
    btn.textContent = viewData.showSimHighlight ? 'ハイライト: ON' : 'ハイライト: OFF';
    btn.style.backgroundColor = viewData.showSimHighlight ? '#007bff' : '#6c757d';
}

function copySimResult() {
    if (!window.lastSimText) return;
    navigator.clipboard.writeText(window.lastSimText).then(() => {
        const btn = document.getElementById('copySimResultBtn');
        const old = btn.textContent;
        btn.textContent = '完了';
        btn.style.backgroundColor = '#28a745';
        setTimeout(() => { btn.textContent = old; btn.style.backgroundColor = '#6c757d'; }, 1000);
    });
}

function injectSimStyles() {
    if (document.getElementById('sim-styles')) return;
    const style = document.createElement('style');
    style.id = 'sim-styles';
    style.textContent = `
        .sim-highlighted {
            background-color: #c8e6c9 !important;
        }
    `;
    document.head.appendChild(style);
}
