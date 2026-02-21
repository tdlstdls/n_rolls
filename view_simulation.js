/**
 * view_simulation.js
 */

const STORAGE_KEY = 'nrolls_custom_weights_v2';
const TICKET_STORAGE_KEY = 'nrolls_ticket_limits_v1';

function createStyledElement(tag, styles = {}, props = {}) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles); Object.assign(el, props);
    return el;
}

function initializeSimulationView() {
    let container = document.getElementById('sim-ui-container');
    if (!container) {
        container = document.createElement('div'); container.id = 'sim-ui-container'; container.style.marginBottom = '15px';
        const resultDiv = document.getElementById('result'); if (resultDiv) resultDiv.insertBefore(container, resultDiv.firstChild);
    }
    container.innerHTML = '';
    const limits = window.viewData.ticketLimits;
    const simGroup = createStyledElement('div', { padding:'10px', background:'#fff', borderRadius:'8px', border:'1px solid #ddd' });
    const controlRow = createStyledElement('div', { display:'flex', alignItems:'center', flexWrap:'wrap', gap:'10px' });
    
    const btnArea = document.createElement('div'); btnArea.style.display = 'flex'; btnArea.style.gap = '8px';
    btnArea.innerHTML = `
        <button id="runSimBtn" style="background:#28a745; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; font-size:0.8rem; cursor:pointer;">ルート検索</button>
        <button id="toggleRouteHighlightBtn" style="display:none; background:#28a745; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.8rem;">表示</button>
        <button id="toggleSimTextBtn" style="display:none; background:#6c757d; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.8rem;">テキスト</button>
        <button id="toggleTableCheckBtn" style="display:none; background:#6c757d; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.8rem;">消し込み</button>
    `;
    const ticketInfo = createStyledElement('div', { display:'flex', flexDirection:'column', cursor:'pointer', userSelect:'none' }, { id:'ticket-display-wrapper' });
    ticketInfo.innerHTML = `<span style="font-size:0.65rem; color:#888;">所持数:</span><div id="ticket-summary-container" style="font-size:0.8rem; color:#007bff; text-decoration:underline;">にゃん:${limits.nyanko}、福引:${limits.fukubiki}、福引G:${limits.fukubikiG}</div>`;
    
    const ticketInArea = createStyledElement('div', { display:'none', gap:'5px', border:'1px solid #eee', padding:'5px', borderRadius:'4px' }, { id:'ticket-inputs-area' });
    ticketInArea.innerHTML = `<input type="number" id="simTicketNyanko" value="${limits.nyanko}" style="width:40px;"><input type="number" id="simTicketFukubiki" value="${limits.fukubiki}" style="width:50px;"><input type="number" id="simTicketFukubikiG" value="${limits.fukubikiG}" style="width:40px;"><button id="updateTicketBtn">更新</button>`;

    controlRow.append(btnArea, ticketInfo, ticketInArea);
    simGroup.appendChild(controlRow);
    const resultText = createStyledElement('div', { marginTop:'10px', padding:'10px', border:'1px solid #28a745', backgroundColor:'#f9fff9', borderRadius:'8px', display:window.viewData.showSimText?'block':'none' }, { id:'sim-result-text' });
    container.append(simGroup, resultText);

    document.getElementById('runSimBtn').onclick = runSimulation;
    document.getElementById('toggleRouteHighlightBtn').onclick = toggleRouteHighlight;
    document.getElementById('toggleSimTextBtn').onclick = toggleSimTextMode;
    document.getElementById('toggleTableCheckBtn').onclick = toggleTableCheckMode;
    ticketInfo.onclick = () => { ticketInfo.style.display='none'; ticketInArea.style.display='flex'; };
    document.getElementById('updateTicketBtn').onclick = () => {
        window.viewData.ticketLimits = { nyanko: parseInt(document.getElementById('simTicketNyanko').value)||0, fukubiki: parseInt(document.getElementById('simTicketFukubiki').value)||0, fukubikiG: parseInt(document.getElementById('simTicketFukubikiG').value)||0 };
        window.saveTicketSettingsToStorage(); ticketInArea.style.display='none'; ticketInfo.style.display='flex';
    };

    updateSimTextButtonState(); updateRouteHighlightButtonState(); updateTableCheckButtonState();
    if (window.viewData.lastSimResult) {
        ['toggleRouteHighlightBtn', 'toggleSimTextBtn', 'toggleTableCheckBtn'].forEach(id => document.getElementById(id).style.display='inline-block');
        displaySimulationResult(window.viewData.lastSimResult);
    }
}

function runSimulation() {
    const initialSeed = parseInt(document.getElementById('seed').value, 10);
    if (isNaN(initialSeed)) return;
    const { ticketLimits, displayIds, gachaIds } = window.viewData;
    const activeGachaIds = gachaIds.filter(id => (id==="0"&&!displayIds.includes("0")&&displayIds.includes("64"))?false:(id==="64"&&!displayIds.includes("64")&&displayIds.includes("0"))?false:true);
    const result = runGachaSearch(initialSeed, 'none', ticketLimits, activeGachaIds, null);
    window.viewData.lastSimResult = result;
    if (result) {
        window.viewData.highlightedRoute = new Map();
        result.path.forEach((p, idx) => window.viewData.highlightedRoute.set(`${p.addr}_${p.gachaId}`, idx));
        if (typeof generateTable === 'function') generateTable();
    }
}

function displaySimulationResult(result) {
    const display = document.getElementById('sim-result-text');
    if (!display || !result || !result.path) return;
    display.innerHTML = `<div style="font-weight:bold; border-bottom:1px solid #28a745; margin-bottom:5px;">検索結果 (闇猫目:${result.counts.DARK_NEKOME})</div>`;
    let globalIdx = 0;
    for (let i = 0; i < result.path.length; ) {
        const start = i, gName = result.path[i].gachaName;
        const row = createStyledElement('div', { display:'flex', gap:'5px', marginBottom:'3px', borderBottom:'1px solid #eee' });
        const cb = createStyledElement('input', { marginTop:'4px' }, { type:'checkbox' });
        const span = createStyledElement('span', { lineHeight:'1.4', flex:'1' });
        span.appendChild(createStyledElement('span', { color:'#d9534f', fontWeight:'bold' }, { textContent:`[${gName}] ` }));
        let j = i;
        while (j < result.path.length && result.path[j].gachaName === gName) {
            const currIdx = globalIdx, step = result.path[j], isCk = currIdx < window.viewData.checkedCount;
            const itemSpan = createStyledElement('span', { cursor:'pointer', textDecoration: isCk?'line-through':'none', opacity: isCk?'0.4':'1' });
            itemSpan.innerHTML = `${step.item}${step.isReroll?'(R)':''}<small>(${step.addr})</small>`;
            itemSpan.onclick = () => { window.viewData.checkedCount = currIdx+1; generateTable(); };
            span.appendChild(itemSpan); if (j < result.path.length-1 && result.path[j+1].gachaName===gName) span.appendChild(document.createTextNode('、'));
            j++; globalIdx++;
        }
        cb.checked = globalIdx <= window.viewData.checkedCount;
        cb.onchange = () => { window.viewData.checkedCount = cb.checked ? globalIdx : start; generateTable(); };
        row.append(cb, span); display.appendChild(row); i = j;
    }
}

function toggleSimTextMode() { window.viewData.showSimText = !window.viewData.showSimText; updateSimTextButtonState(); const d = document.getElementById('sim-result-text'); if(d) d.style.display = window.viewData.showSimText?'block':'none'; }
function updateSimTextButtonState() { const b = document.getElementById('toggleSimTextBtn'); if(b){ b.textContent = window.viewData.showSimText?'テキストON':'テキストOFF'; b.style.background = window.viewData.showSimText?'#28a745':'#6c757d'; } }
function toggleRouteHighlight() { window.viewData.showSimHighlight = !window.viewData.showSimHighlight; if(!window.viewData.showSimHighlight) window.viewData.isTableCheckMode=false; updateRouteHighlightButtonState(); updateTableCheckButtonState(); generateTable(); }
function updateRouteHighlightButtonState() { const b = document.getElementById('toggleRouteHighlightBtn'); if(b){ b.textContent = window.viewData.showSimHighlight?'表示ON':'表示OFF'; b.style.background = window.viewData.showSimHighlight?'#28a745':'#6c757d'; } }
function toggleTableCheckMode() { window.viewData.isTableCheckMode = !window.viewData.isTableCheckMode; if(window.viewData.isTableCheckMode) window.viewData.showSimHighlight=true; updateTableCheckButtonState(); updateRouteHighlightButtonState(); generateTable(); }
function updateTableCheckButtonState() { const b = document.getElementById('toggleTableCheckBtn'); if(b){ b.textContent = window.viewData.isTableCheckMode?'消し込みON':'消し込みOFF'; b.style.background = window.viewData.isTableCheckMode?'#28a745':'#6c757d'; } }
window.saveTicketSettingsToStorage = function() {
    const limits = window.viewData.ticketLimits; localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(limits));
    const s = document.getElementById('ticket-summary-container'); if(s) s.textContent = `にゃん:${limits.nyanko}、福引:${limits.fukubiki}、福引G:${limits.fukubikiG}`;
};
