// ─── 이력 관리 (Firebase) ─────────────────────────────────────────────────────

// 불러온 콘티의 key 기억 (수정 모드용)
let _loadedContiKey = null;
let _loadedContiTitle = null;

// ─── #134 초안(draft) / 확정(published) 상태 구분 ────────────────────────

const DRAFT_STORAGE_KEY = 'conti_draft';

// 초안 저장 (localStorage에만 저장)
function saveDraft() {
    const titleEl = document.getElementById('setlist-title');
    const textareaEl = document.getElementById('song-input');
    
    const title = titleEl.value.trim();
    const text = textareaEl.value.trim();
    
    if (!text || text.includes('아래 예시처럼 붙여넣어 주세요')) {
        showToast('⚠️ 저장할 콘티 내용이 없습니다');
        return;
    }
    
    // 제목 날짜 정규화
    const normalizedTitle = normalizeDateInTitle(title);
    if (normalizedTitle !== title) titleEl.value = normalizedTitle;
    
    // 곡 번호 정규화
    const normalizedText = normalizeContiText(text);
    if (normalizedText !== text) textareaEl.value = normalizedText;
    
    const draft = {
        title: normalizedTitle || '제목 없는 콘티',
        text: normalizedText,
        savedAt: Date.now()
    };
    
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    updateDraftIndicator(true);
    showToast('📝 초안이 저장되었습니다 (게시 전 다른 사람이 볼 수 없음)');
}

// 초안 불러오기
function loadDraft() {
    const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!draftJson) {
        showToast('저장된 초안이 없습니다');
        return;
    }
    
    try {
        const draft = JSON.parse(draftJson);
        document.getElementById('setlist-title').value = draft.title || '';
        document.getElementById('song-input').value = draft.text || '';
        document.getElementById('result-container').innerHTML = '';
        sheetList = [];
        _setLoadedConti(null, null); // Firebase 연동 해제
        updateDraftIndicator(true);
        showToast(`📋 초안을 불러왔습니다 (${draft.savedAt ? new Date(draft.savedAt).toLocaleString() : '시간 불명'})`);
        startSearch();
    } catch (e) {
        console.error('초안 파싱 오류:', e);
        showToast('⚠️ 초안을 불러오는 중 오류가 발생했습니다');
    }
}

// 초안 삭제
function deleteDraft() {
    if (!localStorage.getItem(DRAFT_STORAGE_KEY)) {
        showToast('삭제할 초안이 없습니다');
        return;
    }
    
    if (confirm('초안을 삭제하시겠습니까?')) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        updateDraftIndicator(false);
        showToast('🗑️ 초안이 삭제되었습니다');
    }
}

// 초안 표시 상태 업데이트
function updateDraftIndicator(hasDraft) {
    const indicator = document.getElementById('draft-indicator');
    if (!indicator) return;
    
    if (hasDraft) {
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

// 초기 로드 시 초안 상태 확인
(function initDraftIndicator() {
    const hasDraft = !!localStorage.getItem(DRAFT_STORAGE_KEY);
    updateDraftIndicator(hasDraft);
})();

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

// ─── #136 콘티 JSON 내보내기/가져오기 ──────────────────────────────────────

// JSON 내보내기: 현재 콘티를 JSON 파일로 다운로드
function exportContiToJson() {
    const title = document.getElementById('setlist-title').value.trim() || '제목 없는 콘티';
    const text = document.getElementById('song-input').value.trim();
    
    if (!text) {
        showToast('⚠️ 내보낼 콘티 내용이 없습니다');
        return;
    }
    
    const now = new Date();
    const exportData = {
        version: '1.0',
        exported_at: now.toISOString(),
        title: title,
        songs: text.split('\n').filter(line => line.trim()),
        metadata: {
            total_songs: text.split('\n').filter(line => line.trim()).length,
            app_version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown'
        }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // 파일명: 제목_날짜.json
    const safeTitle = title.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 30);
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    a.download = `${safeTitle}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ 콘티가 JSON 파일로 내보내졌습니다');
}

// JSON 가져오기: 파일 선택 후 콘티에 적용
function importContiFromJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // 데이터 검증
            if (!data.title && !data.songs && !data.text) {
                showToast('⚠️ 유효하지 않은 콘티 파일입니다');
                return;
            }
            
            // 데이터 형식 호환성 처리
            let title = data.title || '';
            let songs = [];
            
            if (Array.isArray(data.songs)) {
                songs = data.songs;
            } else if (typeof data.text === 'string') {
                songs = data.text.split('\n').filter(line => line.trim());
            }
            
            // 기존 콘티가 있으면 확인
            const currentText = document.getElementById('song-input').value.trim();
            if (currentText) {
                const ok = confirm('현재 콘티 내용을 덮어쓰시겠습니까?\n(확인: 덮어쓰기, 취소: 취소)');
                if (!ok) return;
            }
            
            // 콘티 적용
            document.getElementById('setlist-title').value = title;
            document.getElementById('song-input').value = songs.join('\n');
            document.getElementById('result-container').innerHTML = '';
            sheetList = [];
            _setLoadedConti(null, null); // Firebase 연동 해제
            
            showToast(`✅ "${title || '콘티'}"를 불러왔습니다 (${songs.length}곡)`);
            
            // 악보 자동 생성
            startSearch();
            
        } catch (error) {
            console.error('JSON 파싱 오류:', error);
            showToast('⚠️ 파일을 읽는 중 오류가 발생했습니다');
        }
    };
    input.click();
}
