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

const EXTENSIONS = ['.jpg', '.png', '.gif', '.jfif', '.JPG', '.PNG', '.GIF', '.JFIF'];

let songArray  = [];
let lyricsData = {};
let wakeLock   = null;

// 전체화면 뷰어용 악보 목록
let sheetList = [];          // { src, label } | null
let currentSheetIndex = 0;
