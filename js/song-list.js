// ─── 찬양 목록 / 가사 ─────────────────────────────────────────────────────────

let _songFreqData = {};  // { '001': 5, '276': 3, ... } 이력 집계 결과

async function initSongList() {
    const container = document.getElementById('songListContainer');
    container.innerHTML = "<li class='song-item' style='text-align:center;'>목록을 불러오는 중입니다... ⏳</li>";
    try {
        const response = await fetch('hymn_list.txt');
        const text = await response.text();
        const cleanText = text.replace(/\s*/g, '');
        songArray = cleanText.split('\n').filter(line => line.trim() !== '');
        renderSongList(songArray);
    } catch (error) {
        container.innerHTML = "<li class='song-item' style='color:red; text-align:center;'>⚠️ 파일 에러</li>";
    }
}

async function openSongModal() {
    document.getElementById('songModal').style.display = 'flex';
    document.getElementById('searchInput').value = '';
    if (songArray.length === 0) await initSongList();
    else renderSongList(songArray);

    // 이력 기반 사용빈도: 캐시 우선 로드, Firebase에서 백그라운드 로드 후 재렌더링
    const cachedHistory = localStorage.getItem('cachedHistory');
    if (cachedHistory) {
        try {
            _songFreqData = buildSongFrequency(JSON.parse(cachedHistory));
            renderSongList(document.getElementById('searchInput').value ? null : songArray);
        } catch(e) {}
    }
    // Firebase에서 신선한 데이터 비동기 로드
    _loadFreqFromFirebase();
}


function closeSongModal() { document.getElementById('songModal').style.display = 'none'; }

async function initLyrics() {
    try {
        const res = await fetch('lyrics.json');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.songs)) {
            data.songs.forEach(s => {
                if (s.number) lyricsData[s.number] = {
                    lyrics:   s.lyrics   || null,
                    tags:     s.tags     || [],
                    subtitle: s.subtitle || null,
                };
            });
        } else {
            Object.entries(data).forEach(([k, v]) => {
                lyricsData[k] = { lyrics: v, tags: [], subtitle: null };
            });
        }
    } catch (e) {}
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
