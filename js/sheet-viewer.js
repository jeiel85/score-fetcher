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
    _lsUserDismissed = false;
    // 분할뷰 해제 → 카드 그리드 표시 (가로/세로 공통)
    document.getElementById('app-layout').classList.remove('ls-active');
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
        });
    });
    enableCardDragDrop(resultContainer);

    // 가로/세로 모두 동일하게 버튼 영역으로 스크롤 (카드 그리드 표시)
    const btnGroup = document.querySelector('.btn-group');
    if (btnGroup) btnGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// ─── 전체화면 UI 오버레이 자동 숨김 ───────────────────────────────────────────
let _fsUITimer = null;

function showFsUI() {
    document.querySelector('.fullscreen-header').classList.remove('fs-ui-hidden');
    document.querySelector('.fullscreen-footer').classList.remove('fs-ui-hidden');
    clearTimeout(_fsUITimer);
    _fsUITimer = setTimeout(hideFsUI, 3000);
}
function hideFsUI() {
    document.querySelector('.fullscreen-header').classList.add('fs-ui-hidden');
    document.querySelector('.fullscreen-footer').classList.add('fs-ui-hidden');
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
    showFsUI();
}

function navigateSheet(dir) {
    // 찬양목록 미리보기 모드일 경우 별도 탐색 사용
    if (_scorePreviewFromModal && _scorePreviewList.length > 0) {
        navigateScorePreview(dir);
        return;
    }
    let newIndex = currentSheetIndex + dir;
    while (newIndex >= 0 && newIndex < sheetList.length && !sheetList[newIndex]) newIndex += dir;
    if (newIndex < 0 || newIndex >= sheetList.length || !sheetList[newIndex]) return;
    openFullscreen(newIndex);
    // 슬라이드 전환 애니메이션 (fullscreen-body에 적용 → zoom transform과 분리)
    const body = document.getElementById('fullscreen-body');
    body.classList.remove('slide-in-right', 'slide-in-left');
    void body.offsetWidth; // reflow 강제
    body.classList.add(dir > 0 ? 'slide-in-right' : 'slide-in-left');
    showFsUI();
}

function updateNavBtns() {
    let hasPrev = false, hasNext = false;
    for (let i = currentSheetIndex - 1; i >= 0; i--)                if (sheetList[i]) { hasPrev = true; break; }
    for (let i = currentSheetIndex + 1; i < sheetList.length; i++) if (sheetList[i]) { hasNext = true; break; }
    document.querySelector('.nav-prev').classList.toggle('hidden', !hasPrev);
    document.querySelector('.nav-next').classList.toggle('hidden', !hasNext);
}

function closeFullscreen() {
    clearTimeout(_fsUITimer);
    const viewer = document.getElementById('fullscreenViewer');
    viewer.style.transition = 'opacity 0.15s ease';
    viewer.style.opacity = '0';
    setTimeout(() => {
        viewer.style.display = 'none';
        viewer.style.transition = '';
        // 찬양 목록 악보 미리보기에서 열린 경우 → 모달 복귀 (#110)
        if (_scorePreviewFromModal) {
            _scorePreviewFromModal = false;
            openSongModal();
        }
    }, 150);
}

// ─── 찬양 목록 악보 미리보기 (#100, #110) ────────────────────────────────────────
// 현재 미리보기 중인 목록과 인덱스 (찬양목록 내 좌우 탐색용)
let _scorePreviewList = [];   // [{ numPadded, title }, ...]
let _scorePreviewIdx  = 0;
let _scorePreviewFromModal = false;

function openScorePreview(numPadded, displayTitle, previewList, listIdx) {
    // previewList: 찬양목록 현재 표시 목록 전체 (선택적). 없으면 단일 곡 모드.
    _scorePreviewList = previewList || [];
    _scorePreviewIdx  = (listIdx !== undefined) ? listIdx : 0;
    _scorePreviewFromModal = true;
    _showScorePreviewAt(_scorePreviewIdx, numPadded, displayTitle);
}

function _showScorePreviewAt(idx, numPadded, displayTitle, slideDir) {
    // 인접 곡 프리페칭 (스와이프 딜레이 최소화)
    if (_scorePreviewList.length > 0) {
        [-2, -1, 1, 2].forEach(offset => {
            const adjIdx = idx + offset;
            if (adjIdx >= 0 && adjIdx < _scorePreviewList.length) {
                prefetchImage(_scorePreviewList[adjIdx].numPadded);
            }
        });
    }

    let extIdx = 0;
    function tryNext() {
        if (extIdx >= EXTENSIONS.length) { showToast('악보 이미지를 찾을 수 없습니다'); return; }
        const src = `images/${numPadded}${EXTENSIONS[extIdx]}`;
        const t = new Image();
        t.onload = () => {
            document.getElementById('fullscreen-img').src = src;
            document.getElementById('fullscreen-title').textContent = displayTitle;
            if (window._resetFullscreenZoom) window._resetFullscreenZoom();
            // 슬라이드 애니메이션 (탐색 방향이 있을 때만)
            if (slideDir) {
                const body = document.getElementById('fullscreen-body');
                body.classList.remove('slide-in-right', 'slide-in-left');
                void body.offsetWidth;
                body.classList.add(slideDir > 0 ? 'slide-in-right' : 'slide-in-left');
            }
            // 네비 버튼: 목록이 있을 때만 활성화
            const hasPrev = _scorePreviewList.length > 0 && idx > 0;
            const hasNext = _scorePreviewList.length > 0 && idx < _scorePreviewList.length - 1;
            document.querySelector('.nav-prev').classList.toggle('hidden', !hasPrev);
            document.querySelector('.nav-next').classList.toggle('hidden', !hasNext);
            const viewer = document.getElementById('fullscreenViewer');
            viewer.style.opacity = '0';
            viewer.style.display = 'flex';
            viewer.style.transition = 'opacity 0.2s ease';
            requestAnimationFrame(() => { viewer.style.opacity = '1'; });
            showFsUI();
        };
        t.onerror = () => { extIdx++; tryNext(); };
        t.src = src;
    }
    tryNext();
}

function navigateScorePreview(dir) {
    const newIdx = _scorePreviewIdx + dir;
    if (newIdx < 0 || newIdx >= _scorePreviewList.length) return;
    _scorePreviewIdx = newIdx;
    const item = _scorePreviewList[newIdx];
    _showScorePreviewAt(newIdx, item.numPadded, `${item.numPadded} ${item.title}`, dir);
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
    const body = document.querySelector('.ls-sheet-body');
    if (body) {
        body.classList.remove('slide-in-right', 'slide-in-left');
        void body.offsetWidth;
        body.classList.add(dir > 0 ? 'slide-in-right' : 'slide-in-left');
    }
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
    let lastTapTime = 0, doubleTapFired = false;

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
            if (now - lastTapTime < 280) { resetZoom(); lastTapTime = 0; doubleTapFired = true; e.preventDefault(); return; }
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
            else if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && !doubleTapFired && !e.target.closest('button')) {
                const header = document.querySelector('.fullscreen-header');
                if (header && header.classList.contains('fs-ui-hidden')) showFsUI();
                else { clearTimeout(_fsUITimer); hideFsUI(); }
            }
        }
        doubleTapFired = false;
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
        // 1. ls-active(분할뷰)였다가 세로 모드로 변한 경우 → ls-active 해제 + 카드 그리드 재생성
        // ⚠️ 전체화면 자동 오픈 금지: 세로모드 전체화면은 카드 직접 클릭 시에만 열림
        layout.classList.remove('ls-active');
        _lsUserDismissed = false;
        startSearch();
    }
    else if (isFS && !isTabletLandscape()) {
        // 2. 전체화면 뷰어가 열린 상태에서 세로→가로 이동 → 그냥 전체화면 닫기 (카드 그리드 유지)
        closeFullscreen();
    }
    // ⚠️ 세로→가로 회전 시 ls-active 자동 활성화 없음 — 카드 클릭 시에만 분할뷰 진입
});

