// ─── PWA 푸시 알림 (FCM) & 설정 모달 ────────────────────────────────────────

let _pushEnabled    = localStorage.getItem('pushEnabled') === 'true';
let _swRegistration = null;
let _messagingInited = false;

async function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    if (_swRegistration) return _swRegistration;
    _swRegistration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    return _swRegistration;
}

async function enablePush() {
    if (!('Notification' in window)) { showToast('❌ 이 브라우저는 알림을 지원하지 않습니다'); return false; }
    if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY' || VAPID_KEY === 'YOUR_VAPID_KEY') { console.warn('FCM 설정 미완료'); return false; }
    try {
        const registration = await initServiceWorker();
        if (!registration) return false;
        if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') { showToast('🔕 알림 권한이 거부되었습니다'); return false; }
        }
        if (Notification.permission !== 'granted') { showToast('🔕 알림 권한이 없습니다. 브라우저 설정에서 허용해주세요'); return false; }

        const messaging = firebase.messaging();
        const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
        if (!token) return false;

        _myFcmToken = token;
        const idToken = await getIdToken();
        const _fp = [
            Math.round(screen.width  * (devicePixelRatio || 1)),
            Math.round(screen.height * (devicePixelRatio || 1)),
            navigator.hardwareConcurrency || 0, navigator.deviceMemory || 0,
            Intl.DateTimeFormat().resolvedOptions().timeZone
        ].join('|');
        const deviceId = 'fp_' + btoa(_fp).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
        const res = await fetch(
            `${FIREBASE_CONFIG.databaseURL}/fcm_tokens/${deviceId}.json?auth=${idToken}`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(token) }
        );
        if (res.ok) console.log('FCM 토큰 갱신 완료');

        try {
            const allRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/fcm_tokens.json?auth=${idToken}`);
            if (allRes.ok) {
                const allTokens = await allRes.json();
                if (allTokens) {
                    const stale = Object.entries(allTokens).filter(([k, v]) => (v === token && k !== deviceId) || k.startsWith('dev_'));
                    await Promise.all(stale.map(([k]) => fetch(`${FIREBASE_CONFIG.databaseURL}/fcm_tokens/${k}.json?auth=${idToken}`, { method: 'DELETE' })));
                }
            }
        } catch(e) { console.warn('토큰 중복 정리 실패:', e); }

        if (!_messagingInited) {
            _messagingInited = true;
            messaging.onMessage((payload) => {
                const title = payload.data?.title || payload.notification?.title || '새 콘티가 등록되었습니다 ♬';
                const body  = payload.data?.body  || payload.notification?.body  || '새 콘티가 등록되었습니다. 지금 확인해보세요!';
                registration.showNotification(title, {
                    body, icon: '/icon.png', badge: '/badge.png',
                    tag: `new-conti-${Date.now()}`, renotify: false, data: { url: location.origin }
                });
            });
        }
        localStorage.setItem('pushEnabled', 'true');
        _pushEnabled = true;
        return true;
    } catch (error) { console.error('Push 설정 실패:', error); return false; }
}

async function disablePush() {
    localStorage.setItem('pushEnabled', 'false');
    _pushEnabled = false; _myFcmToken = null;
    try {
        const idToken = await getIdToken();
        const _fp = [
            Math.round(screen.width  * (devicePixelRatio || 1)),
            Math.round(screen.height * (devicePixelRatio || 1)),
            navigator.hardwareConcurrency || 0, navigator.deviceMemory || 0,
            Intl.DateTimeFormat().resolvedOptions().timeZone
        ].join('|');
        const deviceId = 'fp_' + btoa(_fp).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
        await fetch(`${FIREBASE_CONFIG.databaseURL}/fcm_tokens/${deviceId}.json?auth=${idToken}`, { method: 'DELETE' });
        console.log('FCM 토큰 삭제 완료');
    } catch(e) { console.warn('토큰 삭제 실패:', e); }
}

async function initPushNotification() {
    if (!('serviceWorker' in navigator)) return;
    await initServiceWorker();
    if (_pushEnabled && Notification.permission === 'granted') enablePush();
}

// ─── 설정 모달 ─────────────────────────────────────────────────────────────────

function openSettings() {
    const toggle = document.getElementById('toggle-push');
    toggle.checked = _pushEnabled && Notification.permission === 'granted';
    updatePushStatusText();
    document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }

async function onTogglePush(checked) {
    const toggle = document.getElementById('toggle-push');
    toggle.disabled = true;
    if (checked) {
        const ok = await enablePush();
        if (ok) { showToast('🔔 알림이 활성화되었습니다!'); }
        else { toggle.checked = false; _pushEnabled = false; }
    } else {
        await disablePush();
        showToast('🔕 알림이 비활성화되었습니다');
    }
    toggle.disabled = false;
    updatePushStatusText();
}

function updatePushStatusText() {
    const row = document.getElementById('push-status-row');
    const txt = document.getElementById('push-status-text');
    const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    if (perm === 'denied') {
        txt.textContent = '⚠️ 브라우저에서 알림이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.';
        row.style.display = 'flex';
    } else if (perm === 'unsupported') {
        txt.textContent = '❌ 이 브라우저는 알림을 지원하지 않습니다.';
        row.style.display = 'flex';
    } else { row.style.display = 'none'; }
}

// ─── 알림 버튼 (푸터용, 호환성 유지) ───────────────────────────────────────────
function updateNotifyBtn() {
    const btn = document.getElementById('btn-notify');
    if (!btn || !('Notification' in window)) return;
    btn.style.display = 'none';
}
async function enableNotification() { openSettings(); }
