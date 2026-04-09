// ─── 찬양 목록 / 가사 ─────────────────────────────────────────────────────────
let _prefetchObserver = null;

let _songFreqData = {};  // { '001': 5, '276': 3, ... } 이력 집계 결과
let _sortMode = 'num';  // 'num' | 'freq-desc' | 'freq-asc'

// ─── 탭 상태 ─────────────────────────────────────────────────────────────────
let _activeTab = 'ccm';  // 'ccm' | 'hymn'

// ─── 즐겨찾기 ─────────────────────────────────────────────────────────────────
let _favorites = new Set(JSON.parse(localStorage.getItem('songFavorites') || '[]'));
let _favFilterOn = false;

function _saveFavorites() {
    localStorage.setItem('songFavorites', JSON.stringify([..._favorites]));
}

function toggleFavorite(numPadded, btn) {
    if (_favorites.has(numPadded)) {
        _favorites.delete(numPadded);
        btn.textContent = '☆';
        btn.classList.remove('fav-on');
    } else {
        _favorites.add(numPadded);
        btn.textContent = '★';
        btn.classList.add('fav-on');
    }
    _saveFavorites();
    if (_favFilterOn) filterSongs();
}

function toggleFavFilter() {
    _favFilterOn = !_favFilterOn;
    const btn = document.getElementById('btn-fav-filter');
    if (btn) {
        btn.classList.toggle('fav-filter-on', _favFilterOn);
        btn.textContent = _favFilterOn ? '★' : '⭐';
    }
    filterSongs();
}

function cycleSortMode() {
    const modes = ['num', 'freq-desc', 'freq-asc'];
    _sortMode = modes[(modes.indexOf(_sortMode) + 1) % modes.length];
    const labels = { 'num': '🔢 번호순', 'freq-desc': '🔥 많이순', 'freq-asc': '📉 적게순' };
    const btn = document.getElementById('btn-sort-freq');
    if (btn) btn.textContent = labels[_sortMode];
    filterSongs();
}

// 로컬 캐시 키 정의 (Stale-While-Revalidate 패턴용)
const CACHE_KEY_SONGS = 'cachedSongsData_v2';
const CACHE_KEY_LYRICS = 'cachedLyricsData_v2';

async function initSongList() {
    const container = document.getElementById('songListContainer');
    
    // 1️⃣ 캐시 우선 로딩 - 곡 목록 + 가사 동시에
    let hasCached = false;
    const cached = localStorage.getItem(CACHE_KEY_SONGS);
    const cachedLyrics = localStorage.getItem(CACHE_KEY_LYRICS);
    if (cachedLyrics) {
        try { lyricsData = JSON.parse(cachedLyrics); } catch(e) {}
    }
    if (cached) {
        try {
            songArray = JSON.parse(cached);
            renderSongList(songArray);  // 가사 포함 상태로 1회 렌더
            hasCached = true;
        } catch(e) {}
    }
    if (!hasCached) {
        container.innerHTML = "<li class='song-item' style='text-align:center;'>최초 데이터 로딩 중... ⏳</li>";
    }

    // 2️⃣ 곡 목록 + 가사를 동시에 Firebase에서 최신화 (병렬 처리)
    try {
        const idToken = await getIdToken();
        const [songsRes, lyricsRes] = await Promise.all([
            fetch(`${FIREBASE_CONFIG.databaseURL}/songs.json?auth=${idToken}`),
            fetch(`${FIREBASE_CONFIG.databaseURL}/lyrics.json?auth=${idToken}`)
        ]);

        let needsRerender = false;

        // 곡 목록 처리
        if (songsRes.ok) {
            const data = await songsRes.json() || {};
            const freshArray = Object.values(data)
                .sort((a,b) => a.num - b.num)
                .map(s => `${s.num} ${s.title}`);
            const freshString = JSON.stringify(freshArray);
            if (freshString !== cached) {
                songArray = freshArray;
                localStorage.setItem(CACHE_KEY_SONGS, freshString);
                needsRerender = true;
            }
        }

        // 가사 처리
        if (lyricsRes.ok) {
            const data = await lyricsRes.json() || {};
            const cleanData = {};
            Object.entries(data).forEach(([key, lyricsStr]) => {
                const numRaw = key.replace('song_', '');
                const numPadded = numRaw.padStart(3, '0');
                const entry = { lyrics: lyricsStr || null, tags: [], subtitle: null };
                cleanData[numRaw] = entry;     // 원본 번호(693 등)로도 매칭
                cleanData[numPadded] = entry;  // 3자리 패딩(001 등)으로도 매칭
            });
            const freshString = JSON.stringify(cleanData);
            if (freshString !== cachedLyrics || Object.keys(lyricsData).length === 0) {
                lyricsData = cleanData;
                localStorage.setItem(CACHE_KEY_LYRICS, freshString);
                needsRerender = true;
                console.log(`✅ 가사 데이터 ${Object.keys(cleanData).length/2}곡 로드 완료`);
            }
        }

        // 변경이 있으면 가사 포함 상태로 리렌더링
        if (needsRerender || !hasCached) {
            renderSongList(songArray);
        }

    } catch (error) {
        if(!hasCached) {
            container.innerHTML = "<li class='song-item' style='color:#fca5a5; text-align:center;'>⚠️ 오프라인 네트워크 에러</li>";
        }
    }
}

async function openSongModal() {
    const modal = document.getElementById('songModal');
    const container = document.getElementById('songListContainer');
    const searchInput = document.getElementById('searchInput');

    modal.style.display = 'flex';
    searchInput.value = ''; // 검색창 비우기
    container.scrollTop = 0; // 스크롤 맨 위로 초기화 (중요!)
    // 정렬/필터 상태 초기화
    _sortMode = 'num';
    const sortBtn = document.getElementById('btn-sort-freq');
    if (sortBtn) sortBtn.textContent = '🔢 번호순';
    _favFilterOn = false;
    const favBtn = document.getElementById('btn-fav-filter');
    if (favBtn) { favBtn.classList.remove('fav-filter-on'); favBtn.textContent = '⭐'; }

    // 탭 상태 반영 (CCM 탭 툴바 표시/숨김)
    _applyTabUI();

    if (_activeTab === 'hymn') {
        await initHymnList();
        return;
    }

    if (songArray.length === 0) {
        await initSongList();
    } else {
        renderSongList(songArray);
        initSongList();
    }

    const cachedHistory = localStorage.getItem('cachedHistory');
    if (cachedHistory) {
        try {
            _songFreqData = buildSongFrequency(JSON.parse(cachedHistory));
            renderSongList(searchInput.value ? null : songArray);
        } catch(e) {}
    }
    _loadFreqFromFirebase();
}


function closeSongModal() { document.getElementById('songModal').style.display = 'none'; }

// initLyrics는 이제 initSongList 내부에서 일괄 처리하므로 단독 호출시의 후방 호환성만 유지합니다.
async function initLyrics() {
    // 이미 initSongList가 가사를 포함해서 초기화하므로, 별도 호출 시에는 캐시만 로드합니다.
    const cached = localStorage.getItem(CACHE_KEY_LYRICS);
    if (cached && Object.keys(lyricsData).length === 0) {
        try { lyricsData = JSON.parse(cached); } catch(e) {}
    }
}

let _lastLyricsNum = null; // 마지막으로 본 가사 번호 저장용

function showLyrics(numPadded, displayTitle) {
    _lastLyricsNum = numPadded; // 신고를 위해 번호 기억
    const d = lyricsData[numPadded];
    document.getElementById('lyrics-title').textContent = `🎵 ${displayTitle}`;
    // ... (이하 동일)
    const tagsEl = document.getElementById('lyrics-tags');
    if (d && d.tags && d.tags.length > 0) {
        tagsEl.innerHTML = d.tags.map(t => `<span class="tag-chip">${t}</span>`).join('');
        tagsEl.style.display = 'flex';
    } else { tagsEl.style.display = 'none'; }
    document.getElementById('lyrics-content').textContent = (d && d.lyrics) ? d.lyrics : '가사 데이터가 없습니다.';
    
    // 🛠️ 신고 버튼 상태 초기화 (다른 곡에서 완료된 상태가 유지되는 버그 수정)
    const reportBtn = document.getElementById('btn-report-lyrics');
    if (reportBtn) {
        reportBtn.disabled = false;
        reportBtn.textContent = '🛠️ 가사 오류 신고';
    }

    document.getElementById('lyricsModal').style.display = 'flex';
}

async function handleLyricReport() {
    if (!_lastLyricsNum) return;

    // 1. 1일 5건 제한 체크
    const today = new Date().toISOString().split('T')[0];
    let reportHistory = JSON.parse(localStorage.getItem('lyricReports') || '{}');
    
    if (reportHistory.date !== today) {
        reportHistory = { date: today, count: 0 };
    }

    if (reportHistory.count >= 5) {
        alert('오늘은 너무 많이 요청을 주셨네요~ 😊\n내일 또 부탁드려요!');
        return;
    }

    if (!confirm(`${_lastLyricsNum}번 곡의 가사 오류를 신고하시겠습니까?`)) return;

    const btn = document.getElementById('btn-report-lyrics');
    const originalText = btn.textContent;
    
    try {
        btn.disabled = true;
        btn.textContent = '⏳ 신고 중...';
        
        const payload = {
            songNum: _lastLyricsNum,
            timestamp: Date.now(),
            dateStr: new Date().toLocaleString(),
            status: 'pending'
        };

        // 🌟 인증 완료 대기 후 전송 (permission denied 방지)
        if (typeof authReady !== 'undefined') await authReady;
        await firebase.database().ref('reports').push(payload);

        // 2. 카운트 증가 및 저장
        reportHistory.count++;
        localStorage.setItem('lyricReports', JSON.stringify(reportHistory));

        alert('신고가 접수되었습니다! 🫡\n빠른 시일 내에 수정할게요. 감사합니다!');
        btn.textContent = '✅ 신고 완료';
    } catch (err) {
        alert('신고 중 오류가 발생했습니다: ' + err.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}


function closeLyricsModal() { document.getElementById('lyricsModal').style.display = 'none'; }

function _applySortMode(list) {
    if (_sortMode === 'freq-desc') {
        return [...list].sort((a, b) => {
            const na = a.match(/^(\d+)/)?.[1].padStart(3,'0');
            const nb = b.match(/^(\d+)/)?.[1].padStart(3,'0');
            return (_songFreqData[nb] || 0) - (_songFreqData[na] || 0);
        });
    }
    if (_sortMode === 'freq-asc') {
        return [...list].sort((a, b) => {
            const na = a.match(/^(\d+)/)?.[1].padStart(3,'0');
            const nb = b.match(/^(\d+)/)?.[1].padStart(3,'0');
            const fa = _songFreqData[na] || 0;
            const fb = _songFreqData[nb] || 0;
            // 한 번도 안 부른 곡은 뒤로
            if (fa === 0 && fb === 0) return 0;
            if (fa === 0) return 1;
            if (fb === 0) return -1;
            return fa - fb;
        });
    }
    return list; // 'num' — 기본 번호순 유지
}

function filterSongs() {
    const keyword = document.getElementById('searchInput').value.toLowerCase().trim();
    let base = keyword ? songArray.filter(song => {
        if (song.toLowerCase().includes(keyword)) return true;
        const numMatch = song.match(/^(\d+)/);
        if (!numMatch) return false;
        const d = lyricsData[numMatch[1].padStart(3, '0')];
        if (!d) return false;
        if (d.tags && d.tags.some(t => t.toLowerCase().includes(keyword))) return true;
        if (d.lyrics && d.lyrics.toLowerCase().includes(keyword)) return true;
        return false;
    }) : songArray;

    // 즐겨찾기 필터
    if (_favFilterOn) {
        base = base.filter(song => {
            const m = song.match(/^(\d+)/);
            return m && _favorites.has(m[1].padStart(3, '0'));
        });
    }

    renderSongList(_applySortMode(base));
}

function renderSongList(list) {
    if (!list) return;  // null 면 리렌더링 안함
    const container = document.getElementById('songListContainer');
    container.innerHTML = '';

    // #79: 현재 입력창에 있는 곡 번호 집합 (중복 표시용)
    const addedNums = new Set();
    (document.getElementById('song-input')?.value || '').split('\n').forEach(line => {
        const m = line.trim().match(/^(\d+)/);
        if (m) addedNums.add(m[1].padStart(3, '0'));
    });

    list.forEach(song => {
        const li = document.createElement('li');
        li.className = 'song-item';
        const match = song.match(/^(\d+)/);
        const numRaw    = match ? match[1] : '';
        const numPadded = numRaw.padStart(3, '0');
        const title     = match ? song.substring(numRaw.length).trim() : song;

        // 사용 빈도 배지 (0이면 숨김)
        const freq = match ? (_songFreqData[numPadded] || 0) : 0;
        if (freq >= 5) li.classList.add('freq-high');
        else if (freq >= 3) li.classList.add('freq-med');
        else if (freq >= 1) li.classList.add('freq-low');

        // #79: 이미 추가된 곡 표시
        const isAdded = match && addedNums.has(numPadded);
        if (isAdded) li.classList.add('song-already-added');

        const textSpan = document.createElement('span');
        textSpan.className = 'song-item-text';
        textSpan.innerHTML = match ? `<strong>${numRaw}</strong> ${title}` : song;
        textSpan.onclick = () => addSongToInput(song);
        li.appendChild(textSpan);

        // #79: 이미 추가됨 배지
        if (isAdded) {
            const addedBadge = document.createElement('span');
            addedBadge.className = 'added-badge';
            addedBadge.textContent = '✓ 추가됨';
            li.appendChild(addedBadge);
        }

        if (freq > 0) {
            const badge = document.createElement('span');
            badge.className = `freq-badge${freq >= 5 ? ' freq-badge-high' : freq >= 3 ? ' freq-badge-med' : ' freq-badge-low'}`;
            badge.textContent = `♪${freq}`;
            li.appendChild(badge);
        }

        // 즐겨찾기 버튼
        if (match) {
            const favBtn = document.createElement('button');
            favBtn.className = 'btn-fav' + (_favorites.has(numPadded) ? ' fav-on' : '');
            favBtn.textContent = _favorites.has(numPadded) ? '★' : '☆';
            favBtn.title = '즐겨찾기';
            favBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(numPadded, favBtn); };
            li.appendChild(favBtn);
        }

        const lyricEntry = lyricsData[numPadded];
        if (match && lyricEntry && lyricEntry.lyrics) {
            const btn = document.createElement('button');
            btn.className = 'btn-lyrics';
            btn.textContent = '가사';
            btn.onclick = (e) => { e.stopPropagation(); showLyrics(numPadded, `${numRaw} ${title}`); };
            li.appendChild(btn);
        }
        if (match) {
            const scoreBtn = document.createElement('button');
            scoreBtn.className = 'btn-score';
            scoreBtn.textContent = '악보';
            scoreBtn.dataset.numPadded = numPadded;
            scoreBtn.dataset.title = title;
            scoreBtn.onclick = (e) => {
                e.stopPropagation();
                // 현재 렌더링된 목록 전체 수집 (좌우 탐색용)
                const allItems = Array.from(document.querySelectorAll('#songListContainer .btn-score'))
                    .map(btn => ({ numPadded: btn.dataset.numPadded, title: btn.dataset.title }));
                const listIdx = allItems.findIndex(item => item.numPadded === numPadded);
                closeSongModal();
                openScorePreview(numPadded, `${numPadded} ${title}`, allItems, listIdx >= 0 ? listIdx : 0);
            };
            li.appendChild(scoreBtn);
        }
        container.appendChild(li);

        // 이미지 프리페칭을 위한 관찰 대상 등록
        if (_prefetchObserver) _prefetchObserver.observe(li);
    });

    renderQuickIndex(list);
}

// 🌟 프리페칭 관찰기 초기화 🌟
function initPrefetchObserver() {
    if (_prefetchObserver) return;
    _prefetchObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const numRaw = entry.target.querySelector('strong')?.textContent;
                if (numRaw) prefetchImage(numRaw);
                _prefetchObserver.unobserve(entry.target); // 한 번 로드하면 관찰 중단
            }
        });
    }, { root: document.getElementById('songListContainer'), rootMargin: '200px' });
}

// 🌟 퀵 인덱스 네비게이터 렌더링 🌟
function renderQuickIndex(currentList) {
    const nav = document.getElementById('quickIndexNav');
    const container = document.getElementById('songListContainer');
    if (!nav || !container) return;

    // 검색 중(필터링 상태), 리스트가 짧거나, 번호순이 아니면 숨김
    const searchVal = document.getElementById('searchInput').value.trim();
    if (searchVal !== "" || currentList.length < 50 || _sortMode !== 'num') {
        nav.style.display = 'none';
        container.classList.remove('has-quick-nav');
        return;
    }

    nav.style.display = 'flex';
    container.classList.add('has-quick-nav');
    nav.innerHTML = '';

    // 100단위로 인덱스 추출 (1, 100, 200, ...)
    const indexes = [1];
    for (let i = 100; i <= 900; i += 100) {
        if (currentList.some(s => s.startsWith(i.toString()))) {
            indexes.push(i);
        }
    }

    indexes.forEach(idx => {
        const dot = document.createElement('div');
        dot.className = 'index-dot';
        // 라벨: 1~99는 '0', 100단위는 '1','2'...
        dot.textContent = idx === 1 ? '0' : (idx / 100); 
        dot.dataset.idx = idx; // 데이터 속성에 실제 인덱스 저장
        dot.onclick = () => {
            const container = document.getElementById('songListContainer');
            const target = Array.from(container.children).find(li => {
                const num = parseInt(li.querySelector('strong')?.textContent || "0");
                return num >= idx;
            });
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 시각적 피드백 (잠시 강조)
                target.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                setTimeout(() => target.style.backgroundColor = '', 800);
            }
        };
        nav.appendChild(dot);
    });
}


// Firebase에서 신선한 이력 로드 후 빈도 계산 (비동기)
async function _loadFreqFromFirebase() {
    try {
        const idToken = await getIdToken();
        const res = await fetch(`${FIREBASE_URL}?auth=${idToken}`);
        if (!res.ok) return;
        const data = await res.json();
        
        // ⚠️ 에러 응답이나 데이터가 없는 경우 무시 (기존 빈도 유지)
        if (!data || data.error) return;

        const entries = Object.entries(data);
        _songFreqData = buildSongFrequency(entries);
        
        // 모달이 열려있는 동안에만 재렌더링
        if (document.getElementById('songModal').style.display === 'flex') {
            const kw = document.getElementById('searchInput').value.trim();
            renderSongList(kw ? null : songArray);
            if (kw) filterSongs();
        }
    } catch(e) { /* silent */ }
}

// ─── 퀵 이동 버튼 자동 숨김 및 포커싱 로직 ───
let _quickNavTimer = null;
function handleQuickNavVisibility() {
    const nav = document.getElementById('quickIndexNav');
    const container = document.getElementById('songListContainer');
    if (!nav || nav.style.display === 'none' || !container) return;

    nav.classList.add('visible');

    // 🌟 스크롤 위치 동기화 (포커싱)
    const st = container.scrollTop;
    const items = container.children;
    if (items.length > 0) {
        let currentIdx = 1;
        for (let i = 0; i < items.length; i++) {
            const li = items[i];
            if (li.offsetTop + (li.offsetHeight / 2) > st) {
                const num = parseInt(li.querySelector('strong')?.textContent || "1");
                currentIdx = num < 100 ? 1 : Math.floor(num / 100) * 100;
                break;
            }
        }
        
        // 도트들의 active 클래스 업데이트
        Array.from(nav.children).forEach(dot => {
            if (parseInt(dot.dataset.idx) === currentIdx) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    }
    
    if (_quickNavTimer) clearTimeout(_quickNavTimer);
    _quickNavTimer = setTimeout(() => {
        nav.classList.remove('visible');
    }, 1500); 
}

// 스크롤 이벤트 리스너 등록 (안정적 초기화)
function _initScrollListener() {
    const container = document.getElementById('songListContainer');
    if (container) {
        container.addEventListener('scroll', handleQuickNavVisibility);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initScrollListener);
} else {
    _initScrollListener();
    initPrefetchObserver(); // 프리페칭 옵저버 시작
}

function addSongToInput(songLine) {
    const textarea = document.getElementById('song-input');
    let currentText = textarea.value;
    if (currentText.includes('아래 예시처럼 붙여넣어 주세요')) currentText = '';
    else if (currentText.length > 0 && !currentText.endsWith('\n')) currentText += '\n';
    textarea.value = currentText + songLine;
    showToast('✅ 추가됨 — 계속 선택하거나 ✕를 눌러 닫아주세요', 1800);
}

// ─── 화면 꺼짐 방지 ────────────────────────────────────────────────────────────

async function initWakeLock() {
    if (!('wakeLock' in navigator)) return;
    if (wakeLock !== null) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (err) { console.warn('WakeLock 획득 실패:', err); }
}

document.addEventListener('click', () => { if (wakeLock === null) initWakeLock(); }, { once: true });
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeLock === null) initWakeLock();
});

// ─── 탭 전환 ─────────────────────────────────────────────────────────────────

function switchTab(tab) {
    if (_activeTab === tab) return;
    _activeTab = tab;
    document.getElementById('searchInput').value = '';
    document.getElementById('songListContainer').scrollTop = 0;
    _applyTabUI();
    if (tab === 'ccm') {
        renderSongList(songArray);
        _loadFreqFromFirebase();
    } else {
        initHymnList();
    }
}

function _applyTabUI() {
    const tabCcm  = document.getElementById('tab-ccm');
    const tabHymn = document.getElementById('tab-hymn');
    if (tabCcm)  tabCcm.classList.toggle('tab-active',  _activeTab === 'ccm');
    if (tabHymn) tabHymn.classList.toggle('tab-active', _activeTab === 'hymn');

    // CCM 전용 툴바(정렬/즐겨찾기) 탭에 따라 표시/숨김
    const ccmToolbar = document.getElementById('ccm-toolbar');
    if (ccmToolbar) ccmToolbar.style.display = _activeTab === 'ccm' ? '' : 'none';
}

// ─── 새찬송가 목록 ────────────────────────────────────────────────────────────

let _hymnLoaded = false;
let _hymnLyrics = {};  // { '001': '가사 전문', ... }

async function _loadHymnLyrics() {
    if (Object.keys(_hymnLyrics).length > 0) return;
    try {
        const res = await fetch('hymn_lyrics.json');
        if (!res.ok) throw new Error('fetch failed');
        _hymnLyrics = await res.json();
    } catch(e) {
        console.warn('찬송가 가사 로드 실패:', e);
    }
}

async function initHymnList() {
    const container = document.getElementById('songListContainer');
    if (hymnArray.length === 0) {
        container.innerHTML = "<li class='song-item' style='text-align:center;'>찬송가 목록 로딩 중... ⏳</li>";
        try {
            const [listRes] = await Promise.all([
                fetch('hymn_list.json'),
                _loadHymnLyrics()
            ]);
            if (!listRes.ok) throw new Error('fetch failed');
            const data = await listRes.json();
            hymnArray = data.songs.map(s => `${s.number} ${s.title}`);
            _hymnLoaded = true;
        } catch(e) {
            container.innerHTML = "<li class='song-item' style='color:#fca5a5;text-align:center;'>⚠️ 찬송가 목록을 불러올 수 없습니다</li>";
            return;
        }
    } else {
        _loadHymnLyrics();
    }
    const kw = document.getElementById('searchInput').value.trim();
    renderHymnList(kw ? hymnArray.filter(s => s.toLowerCase().includes(kw.toLowerCase())) : hymnArray);
}

function filterHymns() {
    if (_activeTab !== 'hymn') { filterSongs(); return; }
    const kw = document.getElementById('searchInput').value.toLowerCase().trim();
    renderHymnList(kw ? hymnArray.filter(s => s.toLowerCase().includes(kw)) : hymnArray);
}

function renderHymnList(list) {
    if (!list) return;
    const container = document.getElementById('songListContainer');
    container.innerHTML = '';
    // CCM 퀵 인덱스 nav 숨김 (찬송가 탭에서는 불필요)
    const nav = document.getElementById('quickIndexNav');
    if (nav) { nav.style.display = 'none'; nav.innerHTML = ''; }
    container.classList.remove('has-quick-nav');

    // 현재 입력창에 이미 추가된 찬송가 번호
    const addedNums = new Set();
    (document.getElementById('song-input')?.value || '').split('\n').forEach(line => {
        const m = line.trim().match(/^찬(\d+)/);
        if (m) addedNums.add(m[1].padStart(3, '0'));
    });

    list.forEach(song => {
        const match = song.match(/^(\d+)(.*)/);
        if (!match) return;
        const numPadded = match[1].padStart(3, '0');
        const title     = match[2].trim();
        const isAdded   = addedNums.has(numPadded);

        const li = document.createElement('li');
        li.className = 'song-item hymn-item' + (isAdded ? ' song-already-added' : '');

        const textSpan = document.createElement('span');
        textSpan.className = 'song-item-text';
        textSpan.innerHTML = `<strong>찬${match[1]}</strong> ${title}`;
        textSpan.onclick = () => addHymnToInput(numPadded, title);
        li.appendChild(textSpan);

        if (isAdded) {
            const badge = document.createElement('span');
            badge.className = 'added-badge';
            badge.textContent = '✓ 추가됨';
            li.appendChild(badge);
        }

        // 가사 버튼 (찬송가)
        if (_hymnLyrics[numPadded]) {
            const lyricsBtn = document.createElement('button');
            lyricsBtn.className = 'btn-lyrics';
            lyricsBtn.textContent = '가사';
            lyricsBtn.onclick = (e) => {
                e.stopPropagation();
                showHymnLyrics(numPadded, title);
            };
            li.appendChild(lyricsBtn);
        }

        // 악보 버튼 (images/hymn/ 경로 미리보기)
        const scoreBtn = document.createElement('button');
        scoreBtn.className = 'btn-score';
        scoreBtn.textContent = '악보';
        scoreBtn.dataset.numPadded = `찬${numPadded}`;
        scoreBtn.dataset.title = title;
        scoreBtn.onclick = (e) => {
            e.stopPropagation();
            const allItems = Array.from(document.querySelectorAll('#songListContainer .btn-score[data-num-padded^="찬"]'))
                .map(btn => ({ numPadded: btn.dataset.numPadded, title: btn.dataset.title }));
            const listIdx = allItems.findIndex(item => item.numPadded === `찬${numPadded}`);
            closeSongModal();
            openScorePreview(`찬${numPadded}`, `찬${numPadded} ${title}`, allItems, listIdx >= 0 ? listIdx : 0);
        };
        li.appendChild(scoreBtn);

        container.appendChild(li);
    });

    if (list.length === 0) {
        container.innerHTML = "<li class='song-item' style='text-align:center;color:var(--on-surface-variant)'>검색 결과가 없습니다</li>";
    }
}

function addHymnToInput(numPadded, title) {
    const textarea = document.getElementById('song-input');
    let currentText = textarea.value;
    if (currentText.includes('아래 예시처럼 붙여넣어 주세요')) currentText = '';
    else if (currentText.length > 0 && !currentText.endsWith('\n')) currentText += '\n';
    textarea.value = currentText + `찬${numPadded} ${title}`;
    showToast('✅ 추가됨 — 계속 선택하거나 ✕를 눌러 닫아주세요', 1800);
}

function showHymnLyrics(numPadded, title) {
    _lastLyricsNum = `찬${numPadded}`;
    const lyricsText = _hymnLyrics[numPadded] || null;
    document.getElementById('lyrics-title').textContent = `🎵 찬${numPadded} ${title}`;
    const tagsEl = document.getElementById('lyrics-tags');
    tagsEl.style.display = 'none';
    tagsEl.innerHTML = '';
    document.getElementById('lyrics-content').textContent = lyricsText || '가사 데이터가 없습니다.';
    const reportBtn = document.getElementById('btn-report-lyrics');
    if (reportBtn) { reportBtn.disabled = false; reportBtn.textContent = '🛠️ 가사 오류 신고'; }
    document.getElementById('lyricsModal').style.display = 'flex';
}
