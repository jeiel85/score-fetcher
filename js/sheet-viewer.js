// ─── 악보 찾기 & 뷰어 ────────────────────────────────────────────────────────

function tryLoadImage(imgElement, songNum, extIndex, onDone) {
    if (extIndex >= EXTENSIONS.length) {
        imgElement.style.display = 'none';
        // 부모에 에러 메시지가 중복되지 않도록 확인 후 추가
        if (!imgElement.parentElement.querySelector('.error-msg')) {
            const errP = document.createElement('p');
            errP.className = 'error-msg';
            errP.textContent = `⚠️ 악보 미등록 (${songNum}번)`;
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
    _lsUserDismissed = false; // 악보 만들기 실행 시 플래그 초기화
    const rawText = document.getElementById('song-input').value;

    // 공통 정규화: 곡번호 3자리 + 제목 자동 치환
    const normalized = normalizeContiText(rawText);
    document.getElementById('song-input').value = normalized;

    const allLines = normalized.split('\n');


    const songLines = allLines.filter(l => /^\d+/.test(l));
    if (songLines.length === 0) return alert('곡 리스트를 입력해주세요!');

    sheetList = new Array(allLines.length).fill(null);

    // ── 카드 그리드 (가로/세로 모드 공통) ──
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
        card.dataset.lineIndex = String(index);
        card.dataset.originalLine = line;
        card.innerHTML = `<div class="sheet-title"><span class="drag-handle" title="길게 눌러 순서 변경">⠿</span>${label}</div>`;
        const imgTag = document.createElement('img');
        imgTag.alt = `${songNumber} 악보 찾는 중...`;
        card.appendChild(imgTag);
        resultContainer.appendChild(card);
        tryLoadImage(imgTag, songNumber, 0, (finalSrc) => {
            sheetList[index] = { src: finalSrc, label };
            card.onclick = () => openFullscreen(index);
            // 가로 모드: ls-active 중 첫 번째 이미지 로드 시 자동 표시
            if (isTabletLandscape() && document.getElementById('app-layout').classList.contains('ls-active')) {
                if (!sheetList.some((s, i) => s !== null && i !== index)) showLsSheet(index);
            }
        });
    });
    enableCardDragDrop(resultContainer);

    if (isTabletLandscape()) {
        // 가로 모드: ls-active 분할 뷰 즉시 활성화
        activateLsView();
    } else {
        const btnGroup = document.querySelector('.btn-group');
        if (btnGroup) btnGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function activateLsView() {
    const layout = document.getElementById('app-layout');
    layout.classList.add('ls-active');
    _lsUserDismissed = false;
    generateContiCanvas().then(canvas => {
        if (canvas) document.getElementById('ls-conti-img').src = canvas.toDataURL('image/png');
    });
    // 이미 로드된 첫 번째 악보가 있으면 즉시 표시
    const firstIdx = sheetList.findIndex(s => s !== null);
    if (firstIdx >= 0) showLsSheet(firstIdx);
}

// ─── 카드 드래그 앤 드롭 (세로 모드) ──────────────────────────────────────────

function syncAfterDrag(container) {
    const textarea = document.getElementById('song-input');
    const allLines = textarea.value.split('\n');

    // 원래 textarea에서 곡번호 줄의 위치(슬롯) 수집
    const songSlots = allLines.reduce((acc, l, i) => {
        if (/^\d+/.test(l.trim())) acc.push(i);
        return acc;
    }, []);

    // 현재 DOM 카드 순서대로 originalLine 수집
    const cards = Array.from(container.querySelectorAll('.sheet-music-card'));
    const newSongLines = cards.map(c => c.dataset.originalLine || '');

    // 새 곡번호 줄로 textarea 재구성
    const newLines = [...allLines];
    songSlots.forEach((slotIdx, i) => { if (newSongLines[i] !== undefined) newLines[slotIdx] = newSongLines[i]; });
    textarea.value = newLines.join('\n');

    // sheetList 재구성: 슬롯 i → 원래 카드 데이터
    const newSheetData = cards.map(c => sheetList[parseInt(c.dataset.lineIndex)]);
    songSlots.forEach((slotIdx, i) => {
        sheetList[slotIdx] = newSheetData[i] || null;
        // 카드 dataset 업데이트 (재드래그 시 정확성 유지)
        if (cards[i]) {
            cards[i].dataset.lineIndex = String(slotIdx);
            cards[i].dataset.originalLine = newLines[slotIdx] || '';
        }
    });

    // onclick 핸들러 재연결
    cards.forEach((card, i) => {
        const slotIdx = songSlots[i];
        card.onclick = null;
        if (sheetList[slotIdx]) card.onclick = () => openFullscreen(slotIdx);
    });
}

function enableCardDragDrop(container) {
    let dragging = null, ghost = null, placeholder = null, ghostOffsetY = 0;

    function doDragMove(clientX, clientY) {
        ghost.style.top = (clientY - ghostOffsetY) + 'px';
        placeholder.style.display = 'none';
        const elBelow = document.elementFromPoint(clientX, clientY);
        placeholder.style.display = '';
        const over = elBelow && elBelow.closest('.sheet-music-card');
        if (over && over !== dragging) {
            const mid = over.getBoundingClientRect().top + over.getBoundingClientRect().height / 2;
            if (clientY < mid) container.insertBefore(placeholder, over);
            else over.after(placeholder);
        }
    }

    function onTouchMove(e) { if (!dragging) return; e.preventDefault(); doDragMove(e.touches[0].clientX, e.touches[0].clientY); }
    function onMouseMove(e) { if (!dragging) return; e.preventDefault(); doDragMove(e.clientX, e.clientY); }

    function endDrag() {
        if (!dragging) return;
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', endDrag);
        document.removeEventListener('touchcancel', endDrag);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', endDrag);
        placeholder.replaceWith(dragging);
        dragging.classList.remove('card-dragging');
        ghost.remove();
        syncAfterDrag(container);
        dragging = null; ghost = null; placeholder = null;
    }

    function startDrag(clientX, clientY, card) {
        const rect = card.getBoundingClientRect();
        ghostOffsetY = clientY - rect.top;
        ghost = card.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.cssText = `position:fixed;z-index:1000;pointer-events:none;opacity:0.88;
            width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;
            box-shadow:0 12px 40px rgba(0,0,0,0.35);border-radius:16px;`;
        document.body.appendChild(ghost);
        placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        placeholder.style.height = rect.height + 'px';
        card.after(placeholder);
        dragging = card;
        card.classList.add('card-dragging');
    }

    // 터치 (#80: 기존 동작 유지)
    container.addEventListener('touchstart', e => {
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;
        e.preventDefault();
        const card = handle.closest('.sheet-music-card');
        if (!card) return;
        startDrag(e.touches[0].clientX, e.touches[0].clientY, card);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', endDrag, { passive: true });
        document.addEventListener('touchcancel', endDrag, { passive: true });
    }, { passive: false });

    // 마우스 (#80: 데스크탑 지원 추가)
    container.addEventListener('mousedown', e => {
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;
        e.preventDefault();
        const card = handle.closest('.sheet-music-card');
        if (!card) return;
        startDrag(e.clientX, e.clientY, card);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', endDrag);
    });
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

    // 가로 모드: 분할 뷰어(ls-active)로 전환
    if (isTabletLandscape()) {
        if (!document.getElementById('app-layout').classList.contains('ls-active')) activateLsView();
        showLsSheet(index);
        return;
    }

    const imgEl = document.getElementById('fullscreen-img');
    if (sheet.src) {
        imgEl.src = sheet.src;
        imgEl.style.display = 'block';
    } else {
        imgEl.src = "";
        imgEl.style.display = 'none';
    }

    if (window._resetFullscreenZoom) window._resetFullscreenZoom();
    updateFullscreenTitle(index);
    const viewer = document.getElementById('fullscreenViewer');
    viewer.style.opacity = '0';
    viewer.style.display = 'flex';
    viewer.style.transition = 'opacity 0.2s ease';
    requestAnimationFrame(() => { viewer.style.opacity = '1'; });
    updateNavBtns();
}

function navigateSheet(dir) {
    let newIndex = currentSheetIndex + dir;
    while (newIndex >= 0 && newIndex < sheetList.length && !sheetList[newIndex]) newIndex += dir;
    if (newIndex < 0 || newIndex >= sheetList.length || !sheetList[newIndex]) return;
    openFullscreen(newIndex);
    // 슬라이드 전환 애니메이션 (fullscreen-body에 적용 → zoom transform과 분리)
    const body = document.getElementById('fullscreen-body');
    body.classList.remove('slide-in-right', 'slide-in-left');
    void body.offsetWidth; // reflow 강제
    body.classList.add(dir > 0 ? 'slide-in-right' : 'slide-in-left');
}

function updateNavBtns() {
    let hasPrev = false, hasNext = false;
    for (let i = currentSheetIndex - 1; i >= 0; i--)                if (sheetList[i]) { hasPrev = true; break; }
    for (let i = currentSheetIndex + 1; i < sheetList.length; i++) if (sheetList[i]) { hasNext = true; break; }
    document.querySelector('.nav-prev').classList.toggle('hidden', !hasPrev);
    document.querySelector('.nav-next').classList.toggle('hidden', !hasNext);
}

function closeFullscreen() {
    const viewer = document.getElementById('fullscreenViewer');
    viewer.style.transition = 'opacity 0.15s ease';
    viewer.style.opacity = '0';
    setTimeout(() => { viewer.style.display = 'none'; viewer.style.transition = ''; }, 150);
}

// 찬양 목록에서 단일 악보 미리보기 (#100)
function openScorePreview(numRaw, displayTitle) {
    let extIdx = 0;
    function tryNext() {
        if (extIdx >= EXTENSIONS.length) { showToast('악보 이미지를 찾을 수 없습니다'); return; }
        const src = `images/${numRaw}${EXTENSIONS[extIdx]}`;
        const t = new Image();
        t.onload = () => {
            document.getElementById('fullscreen-img').src = src;
            document.getElementById('fullscreen-title').textContent = displayTitle;
            if (window._resetFullscreenZoom) window._resetFullscreenZoom();
            document.querySelector('.nav-prev').classList.add('hidden');
            document.querySelector('.nav-next').classList.add('hidden');
            const viewer = document.getElementById('fullscreenViewer');
            viewer.style.opacity = '0';
            viewer.style.display = 'flex';
            viewer.style.transition = 'opacity 0.2s ease';
            requestAnimationFrame(() => { viewer.style.opacity = '1'; });
        };
        t.onerror = () => { extIdx++; tryNext(); };
        t.src = src;
    }
    tryNext();
}

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

    if (window._resetLsZoom) window._resetLsZoom();
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

// 사용자가 직접 가로 뷰를 닫은 경우 resize로 재활성화 방지
let _lsUserDismissed = false;
function closeLandscapeView() {
    document.getElementById('app-layout').classList.remove('ls-active');
    _lsUserDismissed = true;
}

// 터치: 전체화면 뷰어 (핀치줌 + 패닝 + 스와이프 + 더블탭 리셋)
(() => {
    const viewer = document.getElementById('fullscreenViewer');
    const imgEl  = document.getElementById('fullscreen-img');

    let scale = 1, tx = 0, ty = 0;
    let touchStartX = 0, touchStartY = 0;
    let panStartX = 0, panStartY = 0, panStartTX = 0, panStartTY = 0;
    let isPinching = false, pinchStartDist = 0, pinchStartScale = 1;
    let lastTapTime = 0;

    function applyTransform() {
        imgEl.style.transform = `scale(${scale}) translate(${tx}px, ${ty}px)`;
    }
    function resetZoom() { scale = 1; tx = 0; ty = 0; applyTransform(); }
    window._resetFullscreenZoom = resetZoom;

    function dist2(t0, t1) {
        const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    viewer.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
            isPinching = true;
            pinchStartDist  = dist2(e.touches[0], e.touches[1]);
            pinchStartScale = scale;
            e.preventDefault();
        } else if (e.touches.length === 1) {
            isPinching = false;
            const now = Date.now();
            if (now - lastTapTime < 280) { resetZoom(); lastTapTime = 0; e.preventDefault(); return; }
            lastTapTime = now;
            touchStartX = panStartX = e.touches[0].clientX;
            touchStartY = panStartY = e.touches[0].clientY;
            panStartTX = tx; panStartTY = ty;
        }
    }, { passive: false });

    viewer.addEventListener('touchmove', e => {
        if (e.touches.length === 2 && isPinching) {
            const newScale = Math.min(4, Math.max(1, pinchStartScale * (dist2(e.touches[0], e.touches[1]) / pinchStartDist)));
            scale = newScale;
            applyTransform();
            e.preventDefault();
        } else if (e.touches.length === 1) {
            if (scale > 1) {
                tx = panStartTX + (e.touches[0].clientX - panStartX) / scale;
                ty = panStartTY + (e.touches[0].clientY - panStartY) / scale;
                applyTransform();
                e.preventDefault();
            } else {
                e.preventDefault();
            }
        }
    }, { passive: false });

    viewer.addEventListener('touchend', e => {
        if (isPinching) { isPinching = false; return; }
        if (scale <= 1 && e.changedTouches.length === 1) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) { closeFullscreen(); }
            else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { navigateSheet(dx < 0 ? 1 : -1); }
        }
    }, { passive: true });
})();

// 터치: Landscape 뷰어 (핀치줌 + 패닝 + 좌우 스와이프 + 더블탭 리셋)
(() => {
    const lsArea = document.getElementById('ls-sheet-area');
    const imgEl  = document.getElementById('ls-sheet-img');

    let scale = 1, tx = 0, ty = 0;
    let tsX = 0, tsY = 0;
    let panStartX = 0, panStartY = 0, panStartTX = 0, panStartTY = 0;
    let isPinching = false, pinchStartDist = 0, pinchStartScale = 1;
    let lastTapTime = 0;

    function applyTransform() {
        imgEl.style.transform = `scale(${scale}) translate(${tx}px, ${ty}px)`;
    }
    function resetZoom() { scale = 1; tx = 0; ty = 0; applyTransform(); }
    window._resetLsZoom = resetZoom;

    function dist2(t0, t1) {
        const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    lsArea.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
            isPinching = true;
            pinchStartDist  = dist2(e.touches[0], e.touches[1]);
            pinchStartScale = scale;
            e.preventDefault();
        } else if (e.touches.length === 1) {
            isPinching = false;
            const now = Date.now();
            if (now - lastTapTime < 280) { resetZoom(); lastTapTime = 0; e.preventDefault(); return; }
            lastTapTime = now;
            tsX = panStartX = e.touches[0].clientX;
            tsY = panStartY = e.touches[0].clientY;
            panStartTX = tx; panStartTY = ty;
        }
    }, { passive: false });

    lsArea.addEventListener('touchmove', e => {
        if (e.touches.length === 2 && isPinching) {
            const newScale = Math.min(4, Math.max(1, pinchStartScale * (dist2(e.touches[0], e.touches[1]) / pinchStartDist)));
            scale = newScale;
            applyTransform();
            e.preventDefault();
        } else if (e.touches.length === 1 && scale > 1) {
            tx = panStartTX + (e.touches[0].clientX - panStartX) / scale;
            ty = panStartTY + (e.touches[0].clientY - panStartY) / scale;
            applyTransform();
            e.preventDefault();
        }
    }, { passive: false });

    lsArea.addEventListener('touchend', e => {
        if (isPinching) { isPinching = false; return; }
        if (scale <= 1 && e.changedTouches.length === 1) {
            const dx = e.changedTouches[0].clientX - tsX;
            const dy = e.changedTouches[0].clientY - tsY;
            if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) { closeLandscapeView(); }
            else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { navigateLandscapeSheet(dx < 0 ? 1 : -1); }
        }
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
        layout.classList.remove('ls-active');
        _lsUserDismissed = false; // 실제 회전이므로 플래그 초기화
        startSearch();
        if (lastIdx >= 0) {
            // 이미지 로드 완료 대기 후 전체화면 오픈 (#68)
            const _waitAndOpen = () => {
                if (sheetList[lastIdx]) openFullscreen(lastIdx);
                else setTimeout(_waitAndOpen, 80);
            };
            setTimeout(_waitAndOpen, 80);
        }
    }
    else if (isFS && isTabletLandscape()) {
        // 2. 세로 모드(전체화면)였다가 가로 모드로 전환된 경우 → 전체화면 닫고 ls-active 활성화
        closeFullscreen();
        if (!_lsUserDismissed && sheetList.some(s => s !== null)) activateLsView();
    }
    else if (!isLS && !isFS && isTabletLandscape() && !_lsUserDismissed && sheetList.some(s => s !== null)) {
        // 3. 세로 모드(카드 그리드)였다가 가로 모드로 전환된 경우 → ls-active 활성화
        activateLsView();
    }
});

