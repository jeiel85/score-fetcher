// ─── 찬양 목록 / 가사 ─────────────────────────────────────────────────────────

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
    const container = document.getElementById('songListContainer');
    container.innerHTML = '';
    list.forEach(song => {
        const li = document.createElement('li');
        li.className = 'song-item';
        const match = song.match(/^(\d+)/);
        const numRaw = match ? match[1] : '';
        const numPadded = numRaw.padStart(3, '0');
        const title = match ? song.substring(numRaw.length).trim() : song;

        const textSpan = document.createElement('span');
        textSpan.className = 'song-item-text';
        textSpan.innerHTML = match ? `<strong>${numRaw}</strong> ${title}` : song;
        textSpan.onclick = () => addSongToInput(song);
        li.appendChild(textSpan);

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
