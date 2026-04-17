// ─── 이력 관리 (Firebase) ─────────────────────────────────────────────────────

// 불러온 콘티의 key 기억 (수정 모드용)
let _loadedContiKey = null;
let _loadedContiTitle = null;

function _setLoadedConti(key, title) {
    _loadedContiKey = key;
    _loadedContiTitle = title;
    const indicator = document.getElementById('loaded-conti-indicator');
    if (indicator) {
        if (key) {
            indicator.style.display = 'flex';
            indicator.querySelector('.loaded-conti-name').textContent = title || '콘티';
        } else {
            indicator.style.display = 'none';
        }
    }
}

function clearLoadedConti() {
    _setLoadedConti(null, null);
}

async function saveToHistory() {
    if (!FIREBASE_URL) return null;
    const titleText = document.getElementById('setlist-title').value.trim() || '제목 없는 콘티';
    const inputText = document.getElementById('song-input').value.trim();
    if (!inputText || inputText.includes('아래 예시처럼 붙여넣어 주세요')) return null;

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const payload = { date: dateStr, title: titleText, text: inputText, timestamp: Date.now(), senderToken: _myFcmToken || null };

    try {
        const idToken = await getIdToken();
        const res = await fetch(`${FIREBASE_URL}?auth=${idToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            return data?.name || null;  // Firebase POST → { "name": "-KEY..." }
        }
    } catch (error) { console.error('이력 저장 실패:', error); }
    return null;
}

async function saveConti() {
    if (!navigator.onLine) { showToast('📴 오프라인 상태에서는 저장되지 않습니다'); return; }

    // 제목 날짜 정규화
    const titleEl = document.getElementById('setlist-title');
    titleEl.value = normalizeDateInTitle(titleEl.value);

    const title = titleEl.value.trim();
    if (!title) {
        showToast('⚠️ 콘티 제목을 입력해주세요 (예: 2026-03-20 금요예배)', 3000); // #78
        titleEl.focus();
        return;
    }

    // 공통 정규화: 곡번호 3자리 + 제목 자동 치환
    const textareaEl = document.getElementById('song-input');
    const normalizedText = normalizeContiText(textareaEl.value);
    textareaEl.value = normalizedText;

    if (!normalizedText || normalizedText.includes('아래 예시처럼 붙여넣어 주세요')) {
        alert('곡 목록을 입력해주세요!');
        return;
    }

    const idToken = await getIdToken();

    // ── 수정 모드: 불러온 콘티가 있으면 수정/새 콘티 선택 ──────────────────
    if (_loadedContiKey) {
        const choice = confirm(`"${_loadedContiTitle}" 콘티를 수정할까요?\n\n[확인] 기존 콘티 수정\n[취소] 새 콘티로 저장`);
        if (choice) {
            const now = new Date();
            const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            await fetch(`${FIREBASE_CONFIG.databaseURL}/history/${_loadedContiKey}.json?auth=${idToken}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, text: normalizedText, date: dateStr, timestamp: Date.now() })
            });
            writeNotification('admin_conti', `콘티 수정: ${title}`, normalizedText.split('\n').filter(l => /^(찬\d+|통\d+|\d+)/.test(l.trim())).slice(0, 4).join(' · '), { conti_key: _loadedContiKey });
            showToast('✅ 콘티가 수정되었습니다!');
            _setLoadedConti(_loadedContiKey, title); // 제목이 바뀌었을 수 있으니 갱신
            return;
        }
        // 취소 → 새 콘티로 저장 (아래 계속)
        _setLoadedConti(null, null);
    }

    // ── 새 콘티 저장: 중복 체크 ─────────────────────────────────────────────
    try {
        const res = await fetch(`${FIREBASE_URL}?auth=${idToken}`);
        const data = await res.json();
        if (data) {
            const entries = Object.entries(data);
            const exactDup = entries.find(([, item]) => item.title === title && item.text === normalizedText);
            if (exactDup) {
                showToast('⚠️ 동일한 콘티가 이미 저장되어 있습니다');
                return;
            }
            const titleDup = entries.find(([, item]) => item.title === title);
            if (titleDup) {
                const ok = confirm(`"${title}" 콘티가 이미 있습니다.\n내용을 업데이트할까요?\n(취소하면 새 콘티로 저장됩니다)`);
                if (ok) {
                    const [key] = titleDup;
                    const now = new Date();
                    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                    await fetch(`${FIREBASE_URL}/${key}.json?auth=${idToken}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: normalizedText, date: dateStr, timestamp: Date.now() })
                    });
                    showToast('✅ 콘티가 업데이트됐습니다!');
                    return;
                }
            }
        }
    } catch(e) { /* 중복 체크 실패 시 그냥 저장 진행 */ }

    const savedKey = await saveToHistory();
    if (savedKey) _setLoadedConti(savedKey, title); // #127: 저장 후 key 추적 → 공유 시 중복 저장 방지
    showToast('✅ 콘티가 저장되었습니다!'); // #78
}

let historyLimit = 20;
let allHistoryEntries = [];  // 전체 이력 캐시 (검색용)

async function openHistoryModal() {
    if (!FIREBASE_URL) return;
    historyLimit = 20; // 재오픈 시 항상 초기값으로 리셋 (#81)
    const container = document.getElementById('historyListContainer');
    container.innerHTML = "<li class='song-item' style='text-align:center;'>서버에서 이력을 불러오는 중입니다... ⚡</li>";
    document.getElementById('historySearchInput').value = '';
    document.getElementById('historyModal').style.display = 'flex';

    try {
        const idToken = await getIdToken();
        const response = await fetch(`${FIREBASE_URL}?auth=${idToken}`);
        const data = await response.json();
        if (!data) {
            allHistoryEntries = [];
            container.innerHTML = "<li class='song-item' style='text-align:center; color:#999;'>이력이 없습니다.</li>";
        } else {
            allHistoryEntries = Object.entries(data);
            allHistoryEntries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            renderHistoryList(allHistoryEntries);
            localStorage.setItem('cachedHistory', JSON.stringify(allHistoryEntries));
        }
    } catch (error) {
        const cached = localStorage.getItem('cachedHistory');
        if (cached) {
            try { allHistoryEntries = JSON.parse(cached); renderHistoryList(allHistoryEntries); showToast('📴 오프라인: 마지막으로 저장된 콘티함입니다'); return; } catch(e) {}
        }
        container.innerHTML = "<li class='song-item' style='color:red; text-align:center;'>⚠️ 서버 통신 에러</li>";
    }
}

function filterHistory() {
    const keyword = document.getElementById('historySearchInput').value.toLowerCase();
    if (!keyword) { renderHistoryList(allHistoryEntries); return; }
    const filtered = allHistoryEntries.filter(([, item]) =>
        (item.title || '').toLowerCase().includes(keyword) ||
        (item.text  || '').toLowerCase().includes(keyword)
    );
    renderHistoryList(filtered);
}

function renderHistoryList(entries) {
    const container = document.getElementById('historyListContainer');
    container.innerHTML = '';
    if (entries.length === 0) {
        container.innerHTML = "<li class='song-item' style='text-align:center; color:#999;'>검색 결과가 없습니다.</li>";
        return;
    }
    const displayData = entries.slice(0, historyLimit);
    displayData.forEach(([key, item]) => {
        const li = document.createElement('li');
        li.className = 'song-item history-item';
        const displayTitle = item.title || '제목 없음';
        li.innerHTML = `
            <div class="history-title-badge">📌 ${displayTitle}</div>
            <div class="history-date">🕒 저장일시: ${item.date}</div>
            <div class="history-text">${item.text}</div>
            <div class="history-actions">
                <button class="history-action-btn" onclick="loadHistoryItem('${key}', true); event.stopPropagation();" title="복제하여 편집">📋 복사</button>
                <span class="history-delete-hint">길게 누르면 삭제</span>
            </div>
        `;

        let pressTimer = null, didLongPress = false;
        const startPress = () => {
            didLongPress = false; li.classList.add('pressing');
            pressTimer = setTimeout(async () => {
                didLongPress = true; li.classList.remove('pressing');
                if (confirm(`"${displayTitle}" 이력을 삭제할까요?`)) {
                    const BASE = FIREBASE_CONFIG.databaseURL; // #84: 하드코딩 제거
                    const idToken = await getIdToken();
                    await fetch(`${BASE}/history/${key}.json?auth=${idToken}`, { method: 'DELETE' });
                    openHistoryModal();
                }
            }, 700);
        };
        const cancelPress = () => { clearTimeout(pressTimer); li.classList.remove('pressing'); };

        li.addEventListener('touchstart', startPress, { passive: true });
        li.addEventListener('touchend', cancelPress);
        li.addEventListener('touchmove', cancelPress, { passive: true });
        li.addEventListener('mousedown', startPress);
        li.addEventListener('mouseup', cancelPress);
        li.addEventListener('mouseleave', cancelPress);
        li.addEventListener('contextmenu', e => e.preventDefault());

        li.onclick = () => {
            if (didLongPress) return;
            document.getElementById('setlist-title').value = item.title || '';
            document.getElementById('song-input').value = item.text || '';
            document.getElementById('result-container').innerHTML = '';
            sheetList = [];
            _setLoadedConti(key, item.title || '');
            closeHistoryModal();
            startSearch(); // 불러오기 후 악보 자동 실행 (#77)
        };
        container.appendChild(li);
    });

    if (entries.length > historyLimit) {
        const moreBtn = document.createElement('li');
        moreBtn.className = 'song-item';
        moreBtn.style = 'text-align:center; background:#f0f0f0; font-weight:bold; color:#0070f3;';
        moreBtn.innerText = '더 보기 (남은 기록: ' + (entries.length - historyLimit) + '개) 👇';
        moreBtn.onclick = (e) => { e.stopPropagation(); historyLimit += 20; renderHistoryList(entries); };
        container.appendChild(moreBtn);
    }
}

// #128: 콘티 복제 기능 - loadHistoryItem으로 통합
function loadHistoryItem(key, isCopy) {
    const item = allHistoryEntries.find(([k]) => k === key);
    if (!item) return;
    const [, data] = item;
    const titleInput = document.getElementById('setlist-title');
    const textInput = document.getElementById('song-input');
    
    if (isCopy) {
        // 복사본: 제목에 "(복사본)" 추가, 새 콘티로 저장되도록 처리
        const copyTitle = (data.title || '제목 없음') + ' (복사본)';
        titleInput.value = copyTitle;
    } else {
        titleInput.value = data.title || '';
    }
    textInput.value = data.text || '';
    document.getElementById('result-container').innerHTML = '';
    sheetList = [];
    closeHistoryModal();
    startSearch(); // 불러오기 후 악보 자동 실행 (#77)
}

function closeHistoryModal() { document.getElementById('historyModal').style.display = 'none'; }

// ─── 특정 키로 콘티 불러오기 (딥링크 ?conti=KEY 용) ────────────────────────
async function loadContiByKey(key) {
    try {
        const BASE = FIREBASE_CONFIG.databaseURL; // #84: 하드코딩 제거
        if (typeof authReady !== 'undefined') await authReady;
        const idToken = await getIdToken();
        const res = await fetch(`${BASE}/history/${key}.json?auth=${idToken}`);
        if (!res.ok) { showToast('⚠️ 콘티를 불러올 수 없습니다'); return; }
        const item = await res.json();
        if (!item) { showToast('⚠️ 해당 콘티가 존재하지 않습니다'); return; }
        document.getElementById('setlist-title').value = item.title || '';
        document.getElementById('song-input').value = item.text || '';
        document.getElementById('result-container').innerHTML = '';
        sheetList = [];
        _setLoadedConti(key, item.title || '');
        startSearch();
        showToast(`📌 "${item.title || '콘티'}" 불러왔습니다`);
    } catch(e) { console.warn('콘티 딥링크 로드 실패:', e); showToast('⚠️ 콘티 로드 중 오류가 발생했습니다'); }
}

// ─── 이력 기반 찬양 사용 빈도 집계 ─────────────────────────────────────────────
// entries: [[key, { text, ... }], ...]
function buildSongFrequency(entries) {
    const freq = {};
    entries.forEach(([, item]) => {
        if (!item.text) return;
        item.text.split('\n').forEach(line => {
            const m = line.trim().match(/^(\d+)/);
            if (m) {
                const num = m[1].padStart(3, '0');
                freq[num] = (freq[num] || 0) + 1;
            }
        });
    });
    return freq;
}

// 콘티 제목 입력창: blur 시 날짜 정규화 즉시 반영 (날짜-제목 공백 포함)
// — 저장 버튼을 누르기 전에도 바로 정돈된 형태로 보임
document.getElementById('setlist-title').addEventListener('blur', function () {
    const v = normalizeDateInTitle(this.value);
    if (v !== this.value) this.value = v;
});

// ─── #131 콘티 템플릿 저장/불러오기 ──────────────────────────────────────

const TEMPLATE_STORAGE_KEY = 'conti_templates';

// 템플릿 저장
function saveAsTemplate() {
    const text = document.getElementById('song-input').value.trim();
    
    if (!text) {
        showToast('⚠️ 템플릿으로 저장할 콘티 내용이 없습니다');
        return;
    }
    
    // 곡 줄만 추출 (제목, 날짜, 코멘트 제외)
    const lines = text.split('\n').filter(line => {
        const trimmed = line.trim();
        return /^\d+/.test(trimmed) || /^찬\d+/.test(trimmed) || /^통\d+/.test(trimmed);
    });
    
    if (lines.length === 0) {
        showToast('⚠️ 곡이 포함된 콘티만 템플릿으로 저장할 수 있습니다');
        return;
    }
    
    const templateName = prompt('템플릿 이름을 입력하세요:', `템플릿 ${getTemplateCount() + 1}`);
    if (!templateName || !templateName.trim()) return;
    
    const templates = getTemplates();
    const newTemplate = {
        id: Date.now().toString(),
        name: templateName.trim(),
        songs: lines,
        createdAt: new Date().toISOString()
    };
    
    templates.push(newTemplate);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
    
    showToast(`✅ "${templateName}" 템플릿이 저장되었습니다`);
}

// 템플릿 목록 가져오기
function getTemplates() {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

// 템플릿 개수
function getTemplateCount() {
    return getTemplates().length;
}

// 템플릿 불러오기
function loadTemplate(templateId) {
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
        showToast('⚠️ 템플릿을 찾을 수 없습니다');
        return;
    }
    
    // 확인
    const currentText = document.getElementById('song-input').value.trim();
    if (currentText) {
        const ok = confirm('현재 콘티 내용을 덮어쓰시겠습니까?');
        if (!ok) return;
    }
    
    document.getElementById('setlist-title').value = '';
    document.getElementById('song-input').value = template.songs.join('\n');
    document.getElementById('result-container').innerHTML = '';
    sheetList = [];
    _setLoadedConti(null, null);
    
    closeTemplateModal();
    showToast(`📋 "${template.name}" 템플릿을 불러왔습니다 (${template.songs.length}곡)`);
    startSearch();
}

// 템플릿 삭제
function deleteTemplate(templateId) {
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) return;
    
    if (confirm(`"${template.name}" 템플릿을 삭제하시겠습니까?`)) {
        const filtered = templates.filter(t => t.id !== templateId);
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(filtered));
        showToast('🗑️ 템플릿이 삭제되었습니다');
        openTemplateModal(); // 목록 갱신
    }
}

// 템플릿 모달 열기
function openTemplateModal() {
    const modal = document.getElementById('templateModal');
    if (!modal) {
        createTemplateModal();
        return;
    }
    
    const listContainer = document.getElementById('templateListContainer');
    const templates = getTemplates();
    
    if (templates.length === 0) {
        listContainer.innerHTML = '<li class="song-item" style="text-align:center; color:#999;">저장된 템플릿이 없습니다.</li>';
    } else {
        listContainer.innerHTML = '';
        templates.forEach(template => {
            const li = document.createElement('li');
            li.className = 'song-item';
            li.style.cssText = 'cursor:pointer; display:flex; justify-content:space-between; align-items:center;';
            li.innerHTML = `
                <div style="flex:1;">
                    <div style="font-weight:600;">${template.name}</div>
                    <div style="font-size:12px; color:#666; margin-top:4px;">${template.songs.join(', ')}</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="loadTemplate('${template.id}')" style="background:#5465FF; color:white; border:none; border-radius:6px; padding:6px 12px; cursor:pointer; font-size:12px;">불러오기</button>
                    <button onclick="deleteTemplate('${template.id}')" style="background:#ff6b6b; color:white; border:none; border-radius:6px; padding:6px 12px; cursor:pointer; font-size:12px;">삭제</button>
                </div>
            `;
            listContainer.appendChild(li);
        });
    }
    
    modal.style.display = 'flex';
}

// 템플릿 모달 닫기
function closeTemplateModal() {
    const modal = document.getElementById('templateModal');
    if (modal) modal.style.display = 'none';
}

// 템플릿 모달 DOM 생성
function createTemplateModal() {
    const modal = document.createElement('div');
    modal.id = 'templateModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:10000; justify-content:center; align-items:center;';
    modal.onclick = (e) => { if (e.target === modal) closeTemplateModal(); };
    
    modal.innerHTML = `
        <div style="background:white; border-radius:12px; max-width:500px; width:90%; max-height:80vh; overflow:hidden; display:flex; flex-direction:column;">
            <div style="padding:16px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:16px;">📋 콘티 템플릿</h3>
                <button onclick="closeTemplateModal()" style="background:none; border:none; font-size:24px; cursor:pointer; color:#666;">&times;</button>
            </div>
            <ul id="templateListContainer" style="flex:1; overflow-y:auto; list-style:none; padding:0; margin:0;">
                <li class="song-item" style="text-align:center; color:#999;">로딩 중...</li>
            </ul>
            <div style="padding:16px; border-top:1px solid #eee;">
                <button onclick="saveAsTemplate()" style="width:100%; background:#181d3a; color:white; border:none; border-radius:8px; padding:12px; cursor:pointer; font-weight:600;">➕ 현재 콘티를 템플릿으로 저장</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    openTemplateModal(); // 모달 열기
}
