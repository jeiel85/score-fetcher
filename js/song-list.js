// ─── 찬양 목록 / 가사 ─────────────────────────────────────────────────────────

let _songFreqData = {};  // { '001': 5, '276': 3, ... } 이력 집계 결과

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
    document.getElementById('songModal').style.display = 'flex';
    document.getElementById('searchInput').value = '';

    if (songArray.length === 0) {
        // 첫 진입: 전체 초기화 (캐시 우선 + Firebase 동기화)
        await initSongList();
    } else {
        // 이미 로드된 적 있으면 캐시로 즉시 렌더링 후,
        // 백그라운드에서 Firebase 최신 데이터 재동기화 (새로 등록된 곡 반영)
        renderSongList(songArray);
        initSongList();  // await 없이 백그라운드 실행 → 변경사항 있으면 자동 재렌더링
    }

    // 이력 기반 사용빈도: 캐시 우선 로드, Firebase에서 백그라운드 로드 후 재렌더링
    const cachedHistory = localStorage.getItem('cachedHistory');
    if (cachedHistory) {
        try {
            _songFreqData = buildSongFrequency(JSON.parse(cachedHistory));
            renderSongList(document.getElementById('searchInput').value ? null : songArray);
        } catch(e) {}
    }
    // Firebase에서 신선한 이력 데이터 비동기 로드
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

function showLyrics(numPadded, displayTitle) {
    const d = lyricsData[numPadded];
    document.getElementById('lyrics-title').textContent = `🎵 ${displayTitle}`;
    const tagsEl = document.getElementById('lyrics-tags');
    if (d && d.tags && d.tags.length > 0) {
        tagsEl.innerHTML = d.tags.map(t => `<span class="tag-chip">${t}</span>`).join('');
        tagsEl.style.display = 'flex';
    } else { tagsEl.style.display = 'none'; }
    document.getElementById('lyrics-content').textContent = (d && d.lyrics) ? d.lyrics : '가사 데이터가 없습니다.';
    document.getElementById('lyricsModal').style.display = 'flex';
}

function closeLyricsModal() { document.getElementById('lyricsModal').style.display = 'none'; }

function filterSongs() {
    const keyword = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!keyword) { renderSongList(songArray); return; }
    const filtered = songArray.filter(song => {
        if (song.toLowerCase().includes(keyword)) return true;
        const numMatch = song.match(/^(\d+)/);
        if (!numMatch) return false;
        const d = lyricsData[numMatch[1].padStart(3, '0')];
        if (!d) return false;
        if (d.tags && d.tags.some(t => t.toLowerCase().includes(keyword))) return true;
        if (d.lyrics && d.lyrics.toLowerCase().includes(keyword)) return true;
        return false;
    });
    renderSongList(filtered);
}

function renderSongList(list) {
    if (!list) return;  // null 면 리렌더링 안함
    const container = document.getElementById('songListContainer');
    container.innerHTML = '';
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

        const textSpan = document.createElement('span');
        textSpan.className = 'song-item-text';
        textSpan.innerHTML = match ? `<strong>${numRaw}</strong> ${title}` : song;
        textSpan.onclick = () => addSongToInput(song);
        li.appendChild(textSpan);

        if (freq > 0) {
            const badge = document.createElement('span');
            badge.className = `freq-badge${freq >= 5 ? ' freq-badge-high' : freq >= 3 ? ' freq-badge-med' : ' freq-badge-low'}`;
            badge.textContent = `♪${freq}`;
            li.appendChild(badge);
        }

        const lyricEntry = lyricsData[numPadded];
        if (match && lyricEntry && lyricEntry.lyrics) {
            const btn = document.createElement('button');
            btn.className = 'btn-lyrics';
            btn.textContent = '가사';
            btn.onclick = (e) => { e.stopPropagation(); showLyrics(numPadded, `${numRaw} ${title}`); };
            li.appendChild(btn);
        }
        container.appendChild(li);
    });

    renderQuickIndex(list);
}

// 🌟 퀵 인덱스 네비게이터 렌더링 🌟
function renderQuickIndex(currentList) {
    const nav = document.getElementById('quickIndexNav');
    if (!nav) return;

    // 검색 중(필터링 상태)이거나 리스트가 너무 짧으면 숨김
    const searchVal = document.getElementById('searchInput').value.trim();
    if (searchVal || currentList.length < 50) {
        nav.style.display = 'none';
        return;
    }

    nav.style.display = 'flex';
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
        dot.textContent = idx === 1 ? '1' : (idx / 100); // 1, 1, 2, 3... 표시
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
        if (!data) return;
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

function addSongToInput(songLine) {
    const textarea = document.getElementById('song-input');
    let currentText = textarea.value;
    if (currentText.includes('아래 예시처럼 붙여넣어 주세요')) currentText = '';
    else if (currentText.length > 0 && !currentText.endsWith('\n')) currentText += '\n';
    textarea.value = currentText + songLine;
    closeSongModal();
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
