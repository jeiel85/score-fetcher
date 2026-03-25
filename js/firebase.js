// ─── Firebase 초기화 & 익명 인증 ─────────────────────────────────────────────

const FIREBASE_URL   = `${FIREBASE_CONFIG.databaseURL}/history.json`;
const FCM_TOKENS_URL = `${FIREBASE_CONFIG.databaseURL}/fcm_tokens.json`;
let _myFcmToken = null;  // 본인 FCM 토큰 (알림 발송 시 제외용)

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const authReady = firebase.auth().signInAnonymously().then(c => c.user);
async function getIdToken() { return (await authReady).getIdToken(); }

const EXTENSIONS = ['.jpg', '.png', '.gif', '.jfif', '.JPG', '.PNG', '.GIF', '.JFIF'];

let songArray  = [];
let lyricsData = {};
let wakeLock   = null;

// 전체화면 뷰어용 악보 목록
let sheetList = [];          // { src, label } | null
let currentSheetIndex = 0;
