// Firebase Messaging Service Worker
// ⚠️ 아래 설정값을 index.html의 FIREBASE_CONFIG와 동일하게 맞춰주세요

importScripts('firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp(self.FIREBASE_CONFIG);

const messaging = firebase.messaging();

// 앱이 백그라운드(또는 닫힌 상태)일 때 푸시 알림 표시
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || '새로운 콘티 🎶';
    const body  = payload.notification?.body  || '새 콘티가 등록되었습니다. 확인해보세요!';

    self.registration.showNotification(title, {
        body,
        icon:  '/icon.png',
        badge: '/badge.png',
        tag:   'new-conti',          // 같은 태그는 쌓이지 않고 교체됨
        renotify: true,
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
