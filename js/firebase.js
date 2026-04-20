// ─── Firebase 초기화 & 익명 인증 ─────────────────────────────────────────────

const FIREBASE_URL   = `${FIREBASE_CONFIG.databaseURL}/history.json`;
const FCM_TOKENS_URL = `${FIREBASE_CONFIG.databaseURL}/fcm_tokens.json`;
let _myFcmToken = null;  // 본인 FCM 토큰 (알림 발송 시 제외용)

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

// 🛠️ 버그 수정: 이미 로그인(Google 등)된 경우 익명 로그인을 새로 시도하지 않음
const authReady = new Promise(resolve => {
    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
        if (user) {
            resolve(user);
        } else {
            // 로그인 정보가 전혀 없는 경우에만 익명 로그인 진행
            firebase.auth().signInAnonymously()
                .then(cred => resolve(cred.user))
                .catch(err => { console.warn('익명 로그인 실패:', err); resolve(null); });
        }
        unsubscribe(); // 1회 확인 후 감시 종료
    });
});

async function getIdToken() { 
    const user = await authReady;
    return user ? user.getIdToken() : null;
}


let songArray   = [];
let hymnArray   = [];   // 새찬송가 목록: "001 만복의 근원 하나님" 형식
let tongilArray = [];   // 통일찬송가 목록: "001 만복의 근원 하나님" 형식
let lyricsData  = {};
let wakeLock   = null;

// 전체화면 뷰어용 악보 목록
let sheetList = [];          // { src, label } | null
let currentSheetIndex = -1; // -1: 아직 아무 악보도 직접 선택 안 함

// ─── Feature Toggle 전역 설정 ────────────────────────────────────────────────
window.APP_CONFIG = {
    features: {
        prefetch: false,
        copy_conti: false,
        recent_songs: false,
        lyrics_tag: false,
        bounce_effect: false,
        a11y_labels: false
    }
};

async function initFeatureFlags() {
    try {
        // 1. Firebase 데이터베이스에서 설정 로드
        const res = await fetch(`${FIREBASE_CONFIG.databaseURL}/config/feature_flags.json`);
        const data = await res.json();
        if (data) {
            window.APP_CONFIG.features = { ...window.APP_CONFIG.features, ...data };
        }

        // 2. URL 파라미터를 통한 임시 오버라이드 (예: ?f_prefetch=true)
        const params = new URLSearchParams(window.location.search);
        params.forEach((value, key) => {
            if (key.startsWith('f_')) {
                const featureKey = key.substring(2);
                if (window.APP_CONFIG.features.hasOwnProperty(featureKey)) {
                    window.APP_CONFIG.features[featureKey] = (value === 'true');
                }
            }
        });

        console.log('Feature Flags Loaded (with Override):', window.APP_CONFIG.features);
    } catch(e) {
        console.warn('Config load failed, using defaults:', e);
    }
}
