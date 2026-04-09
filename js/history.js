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
            writeNotification('admin_conti', `콘티 수정: ${title}`, normalizedText.split('\n').filter(l => /^(찬\d+|\d+)/.test(l.trim())).slice(0, 4).join(' · '), { conti_key: _loadedContiKey });
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

    await saveToHistory();
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
            <div class="history-delete-hint">길게 누르면 삭제</div>
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
