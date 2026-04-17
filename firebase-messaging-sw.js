// Firebase Messaging Service Worker
// ⚠️ 아래 설정값을 index.html의 FIREBASE_CONFIG와 동일하게 맞춰주세요

importScripts('firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const SCORES_CACHE = 'scores-v2'; // 캐시 버전 업데이트

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// ─── #154 오프라인 모드: 악보 이미지 캐싱 개선 ──────────────────────────

// Cache-First 전략: 캐시 있으면 캐시 우선, 없으면 네트워크
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(SCORES_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        return Response.error();
    }
}

// 네트워크 우선, 실패 시 캐시 폴백 (动态 콘텐츠용)
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(SCORES_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return Response.error();
    }
}

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // 악보 이미지: Cache-First (빠른 로딩 + 오프라인 지원)
    if (url.pathname.startsWith('/images/')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }
    
    // JS/CSS: 네트워크 우선 (새 버전 항상 다운로드)
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        event.respondWith(networkFirst(event.request));
        return;
    }
});

firebase.initializeApp(self.FIREBASE_CONFIG);

const messaging = firebase.messaging();

// 앱이 백그라운드(또는 닫힌 상태)일 때 푸시 알림 표시
// data-only 메시지를 사용하므로 payload.data 에서 내용을 읽음
messaging.onBackgroundMessage((payload) => {
    const title = payload.data?.title || payload.notification?.title || '새로운 콘티 🎶';
    const body  = payload.data?.body  || payload.notification?.body  || '새 콘티가 등록되었습니다. 확인해보세요!';

    self.registration.showNotification(title, {
        body,
        icon:  '/icon.png',
        badge: '/badge.png',
        tag:   `new-conti-${Date.now()}`,
        renotify: false,
        data: { url: self.location.origin }
    });
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    client.postMessage({ type: 'AUTOLOAD_LATEST' });
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow('/?autoload=1');
        })
    );
});
