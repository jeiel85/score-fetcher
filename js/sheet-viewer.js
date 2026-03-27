// ─── 악보 찾기 & 뷰어 ────────────────────────────────────────────────────────

function tryLoadImage(imgElement, songNum, extIndex, onDone) {
    if (extIndex >= EXTENSIONS.length) {
        imgElement.style.display = 'none';
        // 부모에 에러 메시지가 중복되지 않도록 확인 후 추가
        if (!imgElement.parentElement.querySelector('.error-msg')) {
            const errP = document.createElement('p');
            errP.className = 'error-msg';
            errP.textContent = `❌ images/${songNum} 없음`;
            imgElement.parentElement.appendChild(errP);
        }
        onDone(null);
        return;
    }
    const trySrc = `images/${songNum}${EXTENSIONS[extIndex]}`;
    const tempImg = new Image();
    tempImg.onload = () => { imgElement.src = trySrc; onDone(trySrc); };
    tempImg.onerror = () => { tryLoadImage(imgElement, songNum, extIndex + 1, onDone); };
    tempImg.src = trySrc;
}

async function startSearch() {
    const rawText = document.getElementById('song-input').value;

    // 공통 정규화: 곡번호 3자리 + 제목 자동 치환
    const normalized = normalizeContiText(rawText);
    document.getElementById('song-input').value = normalized;

    const allLines = normalized.split('\n');


    const songLines = allLines.filter(l => /^\d+/.test(l));
    if (songLines.length === 0) return alert('곡 리스트를 입력해주세요!');

    sheetList = new Array(allLines.length).fill(null);

    if (isTabletLandscape()) {
        // ── 가로/태블릿 모드: 분할 뷰어 ──
        let firstSheetIndex = -1;
        let songCounter = 0;
        allLines.forEach((line, index) => {
            const match = line.match(/^(\d+)/);
            if (!match) return;
            songCounter++;
            const songNumber = match[1];
            const numPadded  = songNumber.padStart(3, '0');
            const songTitle  = line.substring(songNumber.length).trim();
            const label = `${numPadded} ${songTitle}`;
            if (firstSheetIndex < 0) firstSheetIndex = index;
            const imgTag = document.createElement('img');
            tryLoadImage(imgTag, songNumber, 0, (finalSrc) => {
                sheetList[index] = { src: finalSrc, label };
                updateLsNavBtns();
            });
        });
        document.getElementById('app-layout').classList.add('ls-active');
        if (firstSheetIndex >= 0) {
            const _waitFirst = () => {
                if (sheetList[firstSheetIndex]) { showLsSheet(firstSheetIndex); }
                else { setTimeout(_waitFirst, 100); }
            };
            _waitFirst();
        }
        const canvas = await generateContiCanvas();
        if (canvas) document.getElementById('ls-conti-img').src = canvas.toDataURL('image/png');
    } else {
        // ── 세로 모드 ──
        const resultContainer = document.getElementById('result-container');
        resultContainer.innerHTML = '';
        let songCounter = 0;
        allLines.forEach((line, index) => {
            const match = line.match(/^(\d+)/);
            if (!match) return;
            songCounter++;
            const songNumber = match[1];
            const numPadded  = songNumber.padStart(3, '0');
            const songTitle  = line.substring(songNumber.length).trim();
            const label = `${numPadded} ${songTitle}`;

            const card = document.createElement('div');
            card.className = 'sheet-music-card';
            card.innerHTML = `<div class="sheet-title">${label}</div>`;
            const imgTag = document.createElement('img');
            imgTag.alt = `${songNumber} 악보 찾는 중...`;
            card.appendChild(imgTag);
            resultContainer.appendChild(card);
            tryLoadImage(imgTag, songNumber, 0, (finalSrc) => {
                sheetList[index] = { src: finalSrc, label };
                card.onclick = () => openFullscreen(index);
            });
        });
        const btnGroup = document.querySelector('.btn-group');
        if (btnGroup) btnGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ─── 전체화면 뷰어 ─────────────────────────────────────────────────────────────

function visibleSheetCount() { return sheetList.filter(s => s !== null).length; }
function visibleSheetRank(index) {
    let rank = 0;
    for (let i = 0; i <= index; i++) if (sheetList[i]) rank++;
    return rank;
}

function updateFullscreenTitle(index) {
    const sheet = sheetList[index];
    const rank  = visibleSheetRank(index);
    const total = visibleSheetCount();
    document.getElementById('fullscreen-title').textContent = `${sheet.label}  (${rank}/${total})`;
}

function openFullscreen(index) {
    currentSheetIndex = index;
    const sheet = sheetList[index];
    if (!sheet) return;
    
    const imgEl = document.getElementById('fullscreen-img');
    if (sheet.src) {
        imgEl.src = sheet.src;
        imgEl.style.display = 'block';
    } else {
        imgEl.src = "";
        imgEl.style.display = 'none';
    }
    
    updateFullscreenTitle(index);
    document.getElementById('fullscreenViewer').style.display = 'flex';
    updateNavBtns();
}

function navigateSheet(dir) {
    let newIndex = currentSheetIndex + dir;
    while (newIndex >= 0 && newIndex < sheetList.length && !sheetList[newIndex]) newIndex += dir;
    if (newIndex < 0 || newIndex >= sheetList.length || !sheetList[newIndex]) return;
    openFullscreen(newIndex);
}

function updateNavBtns() {
    let hasPrev = false, hasNext = false;
    for (let i = currentSheetIndex - 1; i >= 0; i--)                if (sheetList[i]) { hasPrev = true; break; }
    for (let i = currentSheetIndex + 1; i < sheetList.length; i++) if (sheetList[i]) { hasNext = true; break; }
    document.querySelector('.nav-prev').classList.toggle('hidden', !hasPrev);
    document.querySelector('.nav-next').classList.toggle('hidden', !hasNext);
}

function closeFullscreen() { document.getElementById('fullscreenViewer').style.display = 'none'; }

// ─── Landscape 뷰어 ────────────────────────────────────────────────────────────

function showLsSheet(index) {
    const sheet = sheetList[index];
    if (!sheet) return;
    currentSheetIndex = index;
    
    const imgEl = document.getElementById('ls-sheet-img');
    if (sheet.src) {
        imgEl.src = sheet.src;
        imgEl.style.display = 'block';
    } else {
        imgEl.src = "";
        imgEl.style.display = 'none';
    }
    
    document.getElementById('ls-sheet-title').textContent =
        `${sheet.label}  (${visibleSheetRank(index)}/${visibleSheetCount()})`;
    updateLsNavBtns();
}

function navigateLandscapeSheet(dir) {
    let newIndex = currentSheetIndex + dir;
    while (newIndex >= 0 && newIndex < sheetList.length && !sheetList[newIndex]) newIndex += dir;
    if (newIndex < 0 || newIndex >= sheetList.length || !sheetList[newIndex]) return;
    showLsSheet(newIndex);
}

function updateLsNavBtns() {
    let hasPrev = false, hasNext = false;
    for (let i = currentSheetIndex - 1; i >= 0; i--)                if (sheetList[i]) { hasPrev = true; break; }
    for (let i = currentSheetIndex + 1; i < sheetList.length; i++) if (sheetList[i]) { hasNext = true; break; }
    const prev = document.querySelector('.ls-nav-prev');
    const next = document.querySelector('.ls-nav-next');
    if (prev) prev.classList.toggle('hidden', !hasPrev);
    if (next) next.classList.toggle('hidden', !hasNext);
}

function closeLandscapeView() { document.getElementById('app-layout').classList.remove('ls-active'); }

// 터치 스와이프 (전체화면 뷰어: 좌우=페이지이동, 하단=닫기)
(() => {
    let touchStartX = 0, touchStartY = 0;
    const viewer = document.getElementById('fullscreenViewer');
    viewer.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
    }, { passive: false });
    viewer.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
    viewer.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (dy > 80 && Math.abs(dy) > Math.abs(dx)) { closeFullscreen(); }
        else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { navigateSheet(dx < 0 ? 1 : -1); }
    }, { passive: true });
})();

// landscape 악보 뷰어 좌우 스와이프
(() => {
    let tsX = 0, tsY = 0;
    const lsArea = document.getElementById('ls-sheet-area');
    lsArea.addEventListener('touchstart', e => { tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; }, { passive: true });
    lsArea.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tsX;
        const dy = e.changedTouches[0].clientY - tsY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { navigateLandscapeSheet(dx < 0 ? 1 : -1); }
    }, { passive: true });
})();

// ─── 화면 회전(Resize) 대응 인터렉티브 UX ──────────────────────────────
window.addEventListener('resize', () => {
    const layout = document.getElementById('app-layout');
    const isLS = layout.classList.contains('ls-active');
    const fsViewer = document.getElementById('fullscreenViewer');
    const isFS = fsViewer.style.display === 'flex';

    if (isLS && !isTabletLandscape()) {
        // 1. 가로 모드(분할 뷰)였다가 세로 모드(모바일 뷰)로 변한 경우
        const lastIdx = currentSheetIndex;
        // 즉시 클래스 제거하여 media query가 result-container를 보이게 함
        layout.classList.remove('ls-active');
        
        // DOM 구조가 다르므로 세로용 리스트 강제 재생성
        startSearch(); 
        
        if (lastIdx >= 0 && sheetList[lastIdx]) {
            setTimeout(() => openFullscreen(lastIdx), 100);
        }
    } 
    else if (isFS && isTabletLandscape()) {
        // 2. 세로 모드(전체화면)였다가 가로 모드(태블릿 분할 뷰)로 변한 경우
        const lastIdx = currentSheetIndex;
        closeFullscreen();
        layout.classList.add('ls-active'); // 강제 활성화
        startSearch();
        if (lastIdx >= 0) {
            setTimeout(() => showLsSheet(lastIdx), 150);
        }
    }
    else if (!isLS && !isFS && sheetList.length > 0 && isTabletLandscape()) {
        // 3. 악보가 있는 세로 모드에서 가로 모드로 전환된 경우 → 분할 뷰 자동 전환
        layout.classList.add('ls-active');
        startSearch();
        setTimeout(() => showLsSheet(currentSheetIndex >= 0 ? currentSheetIndex : 0), 150);
    }
});

