// ─── 악보 찾기 & 뷰어 ────────────────────────────────────────────────────────

function tryLoadImage(imgElement, songNum, extIndex, onSuccess) {
    if (extIndex >= EXTENSIONS.length) {
        imgElement.style.display = 'none';
        imgElement.parentElement.innerHTML += `<p class="error-msg">❌ images/${songNum} 없음</p>`;
        return;
    }
    const trySrc = `images/${songNum}${EXTENSIONS[extIndex]}`;
    const tempImg = new Image();
    tempImg.onload = () => { imgElement.src = trySrc; onSuccess(trySrc); };
    tempImg.onerror = () => { tryLoadImage(imgElement, songNum, extIndex + 1, onSuccess); };
    tempImg.src = trySrc;
}

async function startSearch() {
    let rawText = document.getElementById('song-input').value;

    let allLines = rawText.split('\n').map(line => {
        let trimmed = line.trim();
        if (!trimmed) return '';
        let match = trimmed.match(/^(\d+)[\.\s]*(.*)/);
        if (match) {
            let formattedNum = String(match[1]).padStart(3, '0');
            let titlePart = match[2].trim();
            if (songArray.length > 0) {
                const found = songArray.find(s => s.startsWith(formattedNum + ' '));
                if (found) titlePart = found.substring(formattedNum.length + 1).trim();
            }
            return `${formattedNum} ${titlePart}`;
        }
        return trimmed;
    });
    while (allLines.length > 0 && allLines[allLines.length - 1] === '') allLines.pop();

    document.getElementById('song-input').value = allLines.join('\n');

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
    document.getElementById('fullscreen-img').src = sheet.src;
    updateFullscreenTitle(index);
    document.getElementById('fullscreenViewer').style.display = 'flex';
    updateNavBtns();
}

function navigateSheet(dir) {
    let newIndex = currentSheetIndex + dir;
    while (newIndex >= 0 && newIndex < sheetList.length && !sheetList[newIndex]) newIndex += dir;
    if (newIndex < 0 || newIndex >= sheetList.length || !sheetList[newIndex]) return;
    currentSheetIndex = newIndex;
    const sheet = sheetList[currentSheetIndex];
    document.getElementById('fullscreen-img').src = sheet.src;
    updateFullscreenTitle(currentSheetIndex);
    updateNavBtns();
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
    document.getElementById('ls-sheet-img').src = sheet.src;
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
