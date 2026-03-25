// ─── 이력 관리 (Firebase) ─────────────────────────────────────────────────────

async function saveToHistory() {
    if (!FIREBASE_URL) return;
    const titleText = document.getElementById('setlist-title').value.trim() || '제목 없는 콘티';
    const inputText = document.getElementById('song-input').value.trim();
    if (!inputText || inputText.includes('아래 예시처럼 붙여넣어 주세요')) return;

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const payload = { date: dateStr, title: titleText, text: inputText, timestamp: Date.now(), senderToken: _myFcmToken || null };

    try {
        const idToken = await getIdToken();
        await fetch(`${FIREBASE_URL}?auth=${idToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) { console.error('이력 저장 실패:', error); }
}

async function saveConti() {
    if (!navigator.onLine) { showToast('📴 오프라인 상태에서는 저장되지 않습니다'); return; }

    // 제목 날짜 정규화
    const titleEl = document.getElementById('setlist-title');
    titleEl.value = normalizeDateInTitle(titleEl.value);

    const title = titleEl.value.trim();
    if (!title) {
        alert('콘티 제목을 입력해주세요!\n예) 2026-03-20 금요예배');
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
    await saveToHistory();
    alert('콘티가 저장되었습니다! ✅');
}

let historyLimit = 20;
let allHistoryEntries = [];  // 전체 이력 캐시 (검색용)

async function openHistoryModal() {
    if (!FIREBASE_URL) return;
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
                    const BASE = 'https://score-fetcher-db-default-rtdb.firebaseio.com';
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
            closeHistoryModal();
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
