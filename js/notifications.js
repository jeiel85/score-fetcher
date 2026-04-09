// ─── 알림센터 ──────────────────────────────────────────────────────────────

const NOTIF_READ_KEY = 'notif_read_ids';
let _cachedNotifs = [];

// ─── 읽음 상태 관리 (localStorage) ─────────────────────────────────────────
function _getReadIds() {
    try { return new Set(JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '[]')); }
    catch(e) { return new Set(); }
}

function _saveReadIds(set) {
    localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...set]));
}

function _markAsRead(id) {
    const ids = _getReadIds();
    if (!ids.has(id)) { ids.add(id); _saveReadIds(ids); }
}

function _markAllAsRead() {
    _saveReadIds(new Set(_cachedNotifs.map(n => n.id)));
}

// ─── Firebase 데이터 fetch ──────────────────────────────────────────────────
async function fetchNotifications() {
    try {
        const idToken = await getIdToken();
        if (!idToken) return [];
        const res = await fetch(
            `${FIREBASE_CONFIG.databaseURL}/notifications.json?auth=${idToken}&orderBy="$key"&limitToLast=50`
        );
        if (!res.ok) return [];
        const data = await res.json();
        if (!data) return [];
        return Object.entries(data)
            .map(([key, val]) => ({ id: key, ...val }))
            .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    } catch(e) {
        console.warn('알림 fetch 실패:', e);
        return [];
    }
}

// ─── 타입별 아이콘 / 레이블 ─────────────────────────────────────────────────
function _notifIcon(type) {
    return { new_conti: '🎶', new_song: '🎵', lyrics_report: '🛠️', admin_conti: '📋', announcement: '📢' }[type] || '🔔';
}
function _notifLabel(type) {
    return { new_conti: '새 콘티 등록', new_song: '신규 곡 등록', lyrics_report: '가사 신고 처리', admin_conti: '콘티 수정', announcement: '공지' }[type] || '알림';
}
function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── 배지 업데이트 ──────────────────────────────────────────────────────────
function updateNotifBadge(notifs) {
    const readIds = _getReadIds();
    const count = notifs.filter(n => !readIds.has(n.id)).length;
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ─── 목록 렌더링 ────────────────────────────────────────────────────────────
function _renderNotifList(notifs) {
    const container = document.getElementById('notifListContainer');
    if (!container) return;
    const readIds = _getReadIds();

    const markAllBtn = document.getElementById('btn-mark-all-read');
    if (markAllBtn) {
        const hasUnread = notifs.some(n => !readIds.has(n.id));
        markAllBtn.style.display = hasUnread ? 'inline-flex' : 'none';
    }

    if (notifs.length === 0) {
        container.innerHTML = '<li class="notif-empty">새 알림이 없습니다</li>';
        return;
    }

    container.innerHTML = notifs.map(n => {
        const isRead = readIds.has(n.id);
        const ts = n.created_at
            ? new Date(n.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '';
        return `
        <li class="notif-item${isRead ? ' notif-read' : ''}" data-id="${_esc(n.id)}" onclick="onNotifItemClick('${_esc(n.id)}')">
            <span class="notif-type-icon">${_notifIcon(n.type)}</span>
            <div class="notif-content">
                <div class="notif-meta">
                    <span class="notif-type-label">${_notifLabel(n.type)}</span>
                    <span class="notif-date">${ts}</span>
                </div>
                <div class="notif-title">${_esc(n.title)}</div>
                ${n.body ? `<div class="notif-body">${_esc(n.body)}</div>` : ''}
            </div>
            ${!isRead ? '<span class="notif-dot"></span>' : ''}
        </li>`;
    }).join('');
}

// ─── 이벤트 핸들러 ──────────────────────────────────────────────────────────
function onNotifItemClick(id) {
    _markAsRead(id);
    const item = document.querySelector(`.notif-item[data-id="${id}"]`);
    if (item) {
        item.classList.add('notif-read');
        const dot = item.querySelector('.notif-dot');
        if (dot) dot.remove();
    }
    updateNotifBadge(_cachedNotifs);
    const markAllBtn = document.getElementById('btn-mark-all-read');
    if (markAllBtn) {
        const readIds = _getReadIds();
        const hasUnread = _cachedNotifs.some(n => !readIds.has(n.id));
        markAllBtn.style.display = hasUnread ? 'inline-flex' : 'none';
    }

    // 새 콘티 알림 클릭 시 해당 콘티 자동 로드
    const notif = _cachedNotifs.find(n => n.id === id);
    if (notif?.type === 'new_conti' && notif?.conti_key) {
        closeNotifModal();
        loadContiByKey(notif.conti_key);
    }
}

function markAllRead() {
    _markAllAsRead();
    _renderNotifList(_cachedNotifs);
    updateNotifBadge(_cachedNotifs);
}

// ─── 모달 열기/닫기 ─────────────────────────────────────────────────────────
async function openNotifModal() {
    const modal = document.getElementById('notifModal');
    modal.style.display = 'flex';
    document.getElementById('notifListContainer').innerHTML =
        '<li class="notif-empty notif-loading">불러오는 중…</li>';

    const notifs = await fetchNotifications();
    _cachedNotifs = notifs;
    _renderNotifList(notifs);
    updateNotifBadge(notifs);
}

function closeNotifModal() {
    document.getElementById('notifModal').style.display = 'none';
}

// ─── 초기화 (앱 로드 시 배지 표시) ─────────────────────────────────────────
async function initNotifications() {
    try {
        const notifs = await fetchNotifications();
        _cachedNotifs = notifs;
        updateNotifBadge(notifs);
    } catch(e) {}
}
