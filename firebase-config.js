// Firebase 설정 및 VAPID Key 공유 파일
// ⚠️ 이 파일의 설정을 자신의 Firebase 프로젝트 정보로 업데이트하세요.

const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyD5wD7KVczT0zSjPNmLpbVLZ8xuAyQbYiU",
    authDomain:        "score-fetcher-db.firebaseapp.com",
    databaseURL:       "https://score-fetcher-db-default-rtdb.firebaseio.com",
    projectId:         "score-fetcher-db",
    storageBucket:     "score-fetcher-db.firebasestorage.app",
    messagingSenderId: "933020390835",
    appId:             "1:933020390835:web:64542588e049350b4b27c6"
};

// ⚠️ VAPID Key는 Firebase Console > Cloud Messaging > 웹 푸시 인증서에서 확인하세요.
const VAPID_KEY = "BOFPt2oeNwjVcbtcSL_eHwTfTGyTQtlCMtXzRJymRnSMRmd6ZuLu-7gsXLFiCgju857gMb_jpIG9whdUu484ZvM";

// 브라우저 환경(window)과 서비스 워커 환경(self) 모두에서 접근 가능하도록 설정
if (typeof self !== 'undefined') {
    self.FIREBASE_CONFIG = FIREBASE_CONFIG;
    self.VAPID_KEY = VAPID_KEY;
}
