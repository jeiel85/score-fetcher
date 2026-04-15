// ─── 악보 찾기 & 뷰어 ────────────────────────────────────────────────────────

function tryLoadImage(imgElement, songNum, extIndex, onDone) {
    const s = String(songNum);
    const isHymn   = s.startsWith('찬');
    const isTongil = s.startsWith('통');
    const num      = (isHymn || isTongil) ? s.slice(1) : s;
    const basePath = isHymn ? 'images/hymn/' : isTongil ? 'images/tongil/' : 'images/';
    const label    = isHymn ? '새찬송가 ' : isTongil ? '통일찬송가 ' : '';

    if (extIndex >= EXTENSIONS.length) {
        imgElement.style.display = 'none';
        if (!imgElement.parentElement.querySelector('.error-msg')) {
            const errP = document.createElement('p');
            errP.className = 'error-msg';
            errP.textContent = `⚠️ 악보 미등록 (${label}${num}번)`;
            imgElement.parentElement.appendChild(errP);
        }
        onDone(null);
        return;
    }
    const trySrc = `${basePath}${num}${EXTENSIONS[extIndex]}`;
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


    const songLines = allLines.filter(l => /^\d+/.test(l) || /^찬\d+/.test(l) || /^통\d+/.test(l));
    if (songLines.length === 0) return alert('곡 리스트를 입력해주세요!');

    sheetList = new Array(allLines.length).fill(null);

    // ── 카드 그리드 (가로/세로 모드 공통) ──
    const resultContainer = document.getElementById('result-container');
    resultContainer.innerHTML = '';
    let songCounter = 0;
    allLines.forEach((line, index) => {
        const tongilMatch = line.match(/^통(\d+)(.*)/);
        const hymnMatch   = !tongilMatch && line.match(/^찬(\d+)(.*)/);
        const ccmMatch    = !tongilMatch && !hymnMatch && line.match(/^(\d+)(.*)/);
        const match       = tongilMatch || hymnMatch || ccmMatch;
        if (!match) return;
        songCounter++;
        const isTongil  = !!tongilMatch;
        const isHymn    = !!hymnMatch;
        const numPadded = match[1].padStart(3, '0');
        const songTitle = match[2].trim();
        const label     = isTongil ? `통${numPadded} ${songTitle}` : isHymn ? `찬${numPadded} ${songTitle}` : `${numPadded} ${songTitle}`;
        const imgKey    = isTongil ? `통${numPadded}` : isHymn ? `찬${numPadded}` : numPadded;

        const card = document.createElement('div');
        card.className = 'sheet-music-card';
        card.dataset.lineIndex = String(index);
        card.dataset.originalLine = line;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'card-remove-btn';
        removeBtn.title = '콘티에서 제거';
        removeBtn.textContent = '✕';
        removeBtn.onclick = (e) => { e.stopPropagation(); removeCard(card); };
        card.innerHTML = `<div class="sheet-title"><span class="drag-handle" title="길게 눌러 순서 변경">⠿</span><span class="sheet-title-text">${label}</span></div>`;
        card.querySelector('.sheet-title').appendChild(removeBtn);
        const imgTag = document.createElement('img');
        imgTag.alt = `${isTongil ? '통일찬송가 ' : isHymn ? '새찬송가 ' : ''}${numPadded} 악보 찾는 중...`;
        card.appendChild(imgTag);
        resultContainer.appendChild(card);
        tryLoadImage(imgTag, imgKey, 0, (finalSrc) => {
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
    // 현재 보던 악보 우선, 없으면 첫 번째
    const resumeIdx = (currentSheetIndex >= 0 && sheetList[currentSheetIndex])
        ? currentSheetIndex
        : sheetList.findIndex(s => s !== null);
    if (resumeIdx >= 0) showLsSheet(resumeIdx);
}

// ─── 카드 제거 (#122) ──────────────────────────────────────────────────────────

function removeCard(card) {
    const container = document.getElementById('result-container');
    const textarea = document.getElementById('song-input');
    const lineIndex = parseInt(card.dataset.lineIndex);

    // textarea에서 해당 라인 제거
    const lines = textarea.value.split('\n');
    lines.splice(lineIndex, 1);
    textarea.value = lines.join('\n');

    // sheetList에서 해당 슬롯 제거
    sheetList.splice(lineIndex, 1);

    // 카드 DOM 제거
    card.remove();

    // 남은 카드들의 dataset.lineIndex 재인덱싱
    const remaining = Array.from(container.querySelectorAll('.sheet-music-card'));
    remaining.forEach(c => {
        const idx = parseInt(c.dataset.lineIndex);
        if (idx > lineIndex) {
            c.dataset.lineIndex = String(idx - 1);
            // onclick 재연결
            const newIdx = idx - 1;
            c.onclick = null;
            if (sheetList[newIdx]) c.onclick = () => openFullscreen(newIdx);
        }
    });

    showToast('✅ 콘티에서 제거됨', 1400);
}

// ─── 카드 드래그 앤 드롭 (세로 모드) ──────────────────────────────────────────

function syncAfterDrag(container) {
    const textarea = document.getElementById('song-input');
    const allLines = textarea.value.split('\n');

    // 원래 textarea에서 곡번호 줄의 위치(슬롯) 수집 (CCM + 찬송가 모두)
    const songSlots = allLines.reduce((acc, l, i) => {
        if (/^\d+/.test(l.trim()) || /^찬\d+/.test(l.trim()) || /^통\d+/.test(l.trim())) acc.push(i);
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
let _realtimeSwipeDone = false;    // 리얼타임 스와이프 완료 후 slide-in 애니메이션 건너뜀
let _realtimeLsSwipeDone = false;  // ls 뷰어용

// ─── 가로 뷰어 헤더/푸터 자동 숨김 ──────────────────────────────────────────
let _lsNavTimer = null;
function showLsNav() {
    document.querySelector('.ls-sheet-header').classList.remove('ls-nav-hidden');
    document.querySelector('.ls-sheet-footer').classList.remove('ls-nav-hidden');
    clearTimeout(_lsNavTimer);
    _lsNavTimer = setTimeout(hideLsNav, 3000);
}
function hideLsNav() {
    document.querySelector('.ls-sheet-header').classList.add('ls-nav-hidden');
    document.querySelector('.ls-sheet-footer').classList.add('ls-nav-hidden');
}

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

// 인접 악보 이미지 프리로드 (#145)
function preloadAdjacentSheets(index) {
    [-1, 1].forEach(d => {
        let idx = index + d;
        while (idx >= 0 && idx < sheetList.length && !sheetList[idx]) idx += d;
        if (idx >= 0 && idx < sheetList.length && sheetList[idx] && sheetList[idx].src) {
            const img = new Image();
            img.src = sheetList[idx].src;
            // decode(): HTTP 캐시뿐 아니라 GPU 텍스처까지 미리 준비 → 스와이프 시작 시 즉시 표시
            if (typeof img.decode === 'function') img.decode().catch(() => {});
        }
    });
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

    // 리얼타임 스와이프 완료 시: resetZoom으로 위치 순간이동 전에 숨겨서 이전 악보 깜빡임 방지
    if (_realtimeSwipeDone) imgEl.style.opacity = '0';
    if (window._resetFullscreenZoom) window._resetFullscreenZoom();
    updateFullscreenTitle(index);
    const viewer = document.getElementById('fullscreenViewer');
    if (_realtimeSwipeDone) {
        viewer.style.display = 'flex';
    } else {
        viewer.style.opacity = '0';
        viewer.style.display = 'flex';
        viewer.style.transition = 'opacity 0.2s ease';
        requestAnimationFrame(() => { viewer.style.opacity = '1'; });
    }
    updateNavBtns();
    showFsUI();
    if (!_realtimeSwipeDone) preloadAdjacentSheets(index);
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
    const nextImg = document.getElementById('fullscreen-img-next');
    if (!_realtimeSwipeDone) {
        // 일반 탐색: nextImg 즉시 리셋 + src 초기화 (#145)
        if (nextImg) { nextImg.src = ''; nextImg.style.opacity = 0; nextImg.style.transform = ''; nextImg.style.transition = ''; }
    }
    openFullscreen(newIndex);
    if (_realtimeSwipeDone && nextImg) {
        // decode() 후 한 프레임에 즉각 스왑 — 크로스페이드 시 opacity 합산으로 생기는 밝기 저하(깜빡임) 방지
        const fsImgEl = document.getElementById('fullscreen-img');
        const doSwap = () => requestAnimationFrame(() => {
            if (fsImgEl) { fsImgEl.style.transition = 'none'; fsImgEl.style.opacity = '1'; }
            nextImg.style.transition = 'none';
            nextImg.style.opacity = '0';
            requestAnimationFrame(() => {
                nextImg.style.transform = '';
                nextImg.src = '';
                delete nextImg.dataset.swipeSrc;
                // 스와이프 완료 후 다음 인접 악보 프리로드 (리얼타임 스와이프 시 건너뛰었던 것 보완)
                preloadAdjacentSheets(currentSheetIndex);
            });
        });
        (fsImgEl && typeof fsImgEl.decode === 'function')
            ? fsImgEl.decode().then(doSwap).catch(doSwap)
            : doSwap();
    }
    // 슬라이드 전환 애니메이션 (리얼타임 스와이프 완료 후에는 건너뜀)
    if (!_realtimeSwipeDone) {
        const body = document.getElementById('fullscreen-body');
        body.classList.remove('slide-in-right', 'slide-in-left');
        void body.offsetWidth; // reflow 강제
        body.classList.add(dir > 0 ? 'slide-in-right' : 'slide-in-left');
    }
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
        // 찬양 목록 악보 미리보기에서 열린 경우 → 모달 복귀 (#110, #121)
        if (_scorePreviewFromModal) {
            _scorePreviewFromModal = false;
            _reopenSongModal();
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

    const _isHymnPreview   = String(numPadded).startsWith('찬');
    const _isTongilPreview = String(numPadded).startsWith('통');
    const _previewNum      = (_isHymnPreview || _isTongilPreview) ? String(numPadded).slice(1) : String(numPadded);
    const _previewBase     = _isHymnPreview ? 'images/hymn/' : _isTongilPreview ? 'images/tongil/' : 'images/';
    let extIdx = 0;
    function tryNext() {
        if (extIdx >= EXTENSIONS.length) { showToast('악보 이미지를 찾을 수 없습니다'); return; }
        const src = `${_previewBase}${_previewNum}${EXTENSIONS[extIdx]}`;
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

    // 리얼타임 스와이프 완료 시: resetZoom으로 위치 순간이동 전에 숨겨서 이전 악보 깜빡임 방지
    if (_realtimeLsSwipeDone) imgEl.style.opacity = '0';
    if (window._resetLsZoom) window._resetLsZoom();
    document.getElementById('ls-sheet-title').textContent =
        `${sheet.label}  (${visibleSheetRank(index)}/${visibleSheetCount()})`;
    updateLsNavBtns();
    showLsNav();
    if (!_realtimeLsSwipeDone) preloadAdjacentSheets(index);
}

function navigateLandscapeSheet(dir) {
    let newIndex = currentSheetIndex + dir;
    while (newIndex >= 0 && newIndex < sheetList.length && !sheetList[newIndex]) newIndex += dir;
    if (newIndex < 0 || newIndex >= sheetList.length || !sheetList[newIndex]) return;
    const lsNextImg = document.getElementById('ls-sheet-img-next');
    if (!_realtimeLsSwipeDone) {
        // 일반 탐색: lsNextImg 즉시 리셋 + src 초기화 (#145)
        if (lsNextImg) { lsNextImg.src = ''; lsNextImg.style.opacity = 0; lsNextImg.style.transform = ''; lsNextImg.style.transition = ''; }
    }
    showLsSheet(newIndex);
    if (_realtimeLsSwipeDone && lsNextImg) {
        // 크로스페이드: imgEl(새 악보) 스르륵 등장 + lsNextImg(프리뷰) 스르륵 소멸
        const lsImgEl = document.getElementById('ls-sheet-img');
        // decode() 후 한 프레임에 즉각 스왑 — 크로스페이드 밝기 저하(깜빡임) 방지
        const doLsSwap = () => requestAnimationFrame(() => {
            if (lsImgEl) { lsImgEl.style.transition = 'none'; lsImgEl.style.opacity = '1'; }
            lsNextImg.style.transition = 'none';
            lsNextImg.style.opacity = '0';
            requestAnimationFrame(() => {
                lsNextImg.style.transform = '';
                lsNextImg.src = '';
                delete lsNextImg.dataset.swipeSrc;
                // 스와이프 완료 후 인접 악보 프리로드
                preloadAdjacentSheets(currentSheetIndex);
            });
        });
        (lsImgEl && typeof lsImgEl.decode === 'function')
            ? lsImgEl.decode().then(doLsSwap).catch(doLsSwap)
            : doLsSwap();
    }
    if (!_realtimeLsSwipeDone) {
        const body = document.querySelector('.ls-sheet-body');
        if (body) {
            body.classList.remove('slide-in-right', 'slide-in-left');
            void body.offsetWidth;
            body.classList.add(dir > 0 ? 'slide-in-right' : 'slide-in-left');
        }
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
    let isSwiping = false, swipeStartX = 0, swipeDeltaX = 0;

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
            swipeStartX = e.touches[0].clientX;
            isSwiping = false;
            swipeDeltaX = 0;
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
                const deltaX = e.touches[0].clientX - swipeStartX;
                if (!isSwiping && Math.abs(deltaX) > 10) isSwiping = true;
                if (isSwiping) {
                    swipeDeltaX = deltaX;
                    // 유효한 다음/이전 시트 확인 (null 건너뜀)
                    const swipeDir = deltaX < 0 ? 1 : -1;
                    let nextValidIdx = currentSheetIndex + swipeDir;
                    while (nextValidIdx >= 0 && nextValidIdx < sheetList.length && !sheetList[nextValidIdx]) nextValidIdx += swipeDir;
                    const nextSheet = (nextValidIdx >= 0 && nextValidIdx < sheetList.length) ? sheetList[nextValidIdx] : null;
                    imgEl.style.transition = 'none';
                    const nextImg = document.getElementById('fullscreen-img-next');
                    if (!nextSheet) {
                        // 첫/마지막 페이지: 이동 없음
                        imgEl.style.transform = 'translate(0, 0) scale(1)';
                        if (nextImg) { nextImg.style.opacity = 0; nextImg.style.transform = 'translateX(200%)'; }
                    } else {
                        imgEl.style.transform = `translate(${deltaX}px, 0) scale(1)`;
                        if (nextImg) {
                            const nextSrc = nextSheet.src || '';
                            if (nextImg.dataset.swipeSrc !== nextSrc) {
                                nextImg.dataset.swipeSrc = nextSrc;
                                nextImg.src = nextSrc;
                            }
                            const vw = viewer.clientWidth;
                            const neighborOffset = deltaX < 0 ? vw : -vw;
                            nextImg.style.transition = 'none';
                            nextImg.style.transform = `translate(${neighborOffset + deltaX}px, 0)`;
                            // 로드 완료 시에만 표시, 미완료 시 onload 후 표시 (#145)
                            if (nextImg.complete && nextImg.naturalWidth > 0) {
                                nextImg.style.opacity = 1;
                            } else {
                                nextImg.style.opacity = 0;
                                nextImg.onload = () => { nextImg.style.opacity = 1; };
                            }
                        }
                    }
                }
                e.preventDefault();
            }
        }
    }, { passive: false });

    viewer.addEventListener('touchend', e => {
        if (isPinching) { isPinching = false; return; }
        if (scale <= 1 && e.changedTouches.length === 1) {
            if (isSwiping && Math.abs(swipeDeltaX) > 50) {
                const dir = swipeDeltaX < 0 ? 1 : -1;
                // 유효한 다음 시트 확인 (#143)
                let chkIdx = currentSheetIndex + dir;
                while (chkIdx >= 0 && chkIdx < sheetList.length && !sheetList[chkIdx]) chkIdx += dir;
                const hasValidNext = chkIdx >= 0 && chkIdx < sheetList.length && !!sheetList[chkIdx];
                if (!hasValidNext) {
                    // 첫/마지막 페이지 무효 방향 — 스프링백
                    imgEl.style.transition = 'transform 0.2s ease';
                    imgEl.style.transform = 'scale(1) translate(0, 0)';
                } else {
                const vw = viewer.clientWidth;
                const exitX = dir > 0 ? -vw : vw;
                const nextImg = document.getElementById('fullscreen-img-next');
                imgEl.style.transition = 'transform 0.18s ease';
                imgEl.style.transform = `translate(${exitX}px, 0) scale(1)`;
                if (nextImg && parseFloat(nextImg.style.opacity) > 0) {
                    nextImg.style.transition = 'transform 0.18s ease';
                    nextImg.style.transform = 'translate(0, 0)';
                }
                setTimeout(() => {
                    imgEl.style.transition = 'none';
                    _realtimeSwipeDone = true;
                    navigateSheet(dir);
                    _realtimeSwipeDone = false;
                }, 180);
                }
            } else if (isSwiping) {
                imgEl.style.transition = 'transform 0.2s ease';
                imgEl.style.transform = 'scale(1) translate(0, 0)';
                const nextImg = document.getElementById('fullscreen-img-next');
                if (nextImg) {
                    const vw = viewer.clientWidth;
                    nextImg.style.transition = 'transform 0.2s ease';
                    nextImg.style.transform = `translate(${swipeDeltaX < 0 ? vw : -vw}px, 0)`;
                    setTimeout(() => {
                        nextImg.style.opacity = 0;
                        nextImg.style.transform = '';
                        nextImg.style.transition = '';
                        nextImg.src = '';
                        delete nextImg.dataset.swipeSrc;
                    }, 200);
                }
            } else {
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
        }
        isSwiping = false;
        swipeDeltaX = 0;
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
    let isLSSwiping = false, lsSwipeStartX = 0, lsSwipeDeltaX = 0;

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
            lsSwipeStartX = e.touches[0].clientX;
            isLSSwiping = false;
            lsSwipeDeltaX = 0;
        }
    }, { passive: false });

    lsArea.addEventListener('touchmove', e => {
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
                const deltaX = e.touches[0].clientX - lsSwipeStartX;
                if (!isLSSwiping && Math.abs(deltaX) > 10) isLSSwiping = true;
                if (isLSSwiping) {
                    lsSwipeDeltaX = deltaX;
                    const lsSwipeDir = deltaX < 0 ? 1 : -1;
                    let nextValidIdx = currentSheetIndex + lsSwipeDir;
                    while (nextValidIdx >= 0 && nextValidIdx < sheetList.length && !sheetList[nextValidIdx]) nextValidIdx += lsSwipeDir;
                    const nextSheet = (nextValidIdx >= 0 && nextValidIdx < sheetList.length) ? sheetList[nextValidIdx] : null;
                    imgEl.style.transition = 'none';
                    const lsNextImg = document.getElementById('ls-sheet-img-next');
                    if (!nextSheet) {
                        // 첫/마지막 페이지: 이동 없음
                        imgEl.style.transform = 'translate(0, 0) scale(1)';
                        if (lsNextImg) { lsNextImg.style.opacity = 0; lsNextImg.style.transform = 'translateX(200%)'; }
                    } else {
                        imgEl.style.transform = `translate(${deltaX}px, 0) scale(1)`;
                        if (lsNextImg) {
                            const lsNextSrc = nextSheet.src || '';
                            if (lsNextImg.dataset.swipeSrc !== lsNextSrc) {
                                lsNextImg.dataset.swipeSrc = lsNextSrc;
                                lsNextImg.src = lsNextSrc;
                            }
                            const lsVw = lsArea.clientWidth;
                            const lsNeighborOffset = deltaX < 0 ? lsVw : -lsVw;
                            lsNextImg.style.transition = 'none';
                            lsNextImg.style.transform = `translate(${lsNeighborOffset + deltaX}px, 0)`;
                            // 로드 완료 시에만 표시, 미완료 시 onload 후 표시 (#145)
                            if (lsNextImg.complete && lsNextImg.naturalWidth > 0) {
                                lsNextImg.style.opacity = 1;
                            } else {
                                lsNextImg.style.opacity = 0;
                                lsNextImg.onload = () => { lsNextImg.style.opacity = 1; };
                            }
                        }
                    }
                }
                e.preventDefault();
            }
        }
    }, { passive: false });

    lsArea.addEventListener('touchend', e => {
        if (isPinching) { isPinching = false; return; }
        if (scale <= 1 && e.changedTouches.length === 1) {
            if (isLSSwiping && Math.abs(lsSwipeDeltaX) > 50) {
                const lsDir = lsSwipeDeltaX < 0 ? 1 : -1;
                // 유효한 다음 시트 확인 (#143)
                let lsChkIdx = currentSheetIndex + lsDir;
                while (lsChkIdx >= 0 && lsChkIdx < sheetList.length && !sheetList[lsChkIdx]) lsChkIdx += lsDir;
                const lsHasValidNext = lsChkIdx >= 0 && lsChkIdx < sheetList.length && !!sheetList[lsChkIdx];
                if (!lsHasValidNext) {
                    // 첫/마지막 페이지 무효 방향 — 스프링백
                    imgEl.style.transition = 'transform 0.2s ease';
                    imgEl.style.transform = 'scale(1) translate(0, 0)';
                } else {
                const lsVw = lsArea.clientWidth;
                const lsExitX = lsDir > 0 ? -lsVw : lsVw;
                const lsNextImg = document.getElementById('ls-sheet-img-next');
                imgEl.style.transition = 'transform 0.18s ease';
                imgEl.style.transform = `translate(${lsExitX}px, 0) scale(1)`;
                if (lsNextImg && parseFloat(lsNextImg.style.opacity) > 0) {
                    lsNextImg.style.transition = 'transform 0.18s ease';
                    lsNextImg.style.transform = 'translate(0, 0)';
                }
                setTimeout(() => {
                    imgEl.style.transition = 'none';
                    _realtimeLsSwipeDone = true;
                    navigateLandscapeSheet(lsDir);
                    _realtimeLsSwipeDone = false;
                }, 180);
                }
            } else if (isLSSwiping) {
                imgEl.style.transition = 'transform 0.2s ease';
                imgEl.style.transform = 'scale(1) translate(0, 0)';
                const lsNextImg = document.getElementById('ls-sheet-img-next');
                if (lsNextImg) {
                    const lsVw = lsArea.clientWidth;
                    lsNextImg.style.transition = 'transform 0.2s ease';
                    lsNextImg.style.transform = `translate(${lsSwipeDeltaX < 0 ? lsVw : -lsVw}px, 0)`;
                    setTimeout(() => {
                        lsNextImg.style.opacity = 0;
                        lsNextImg.style.transform = '';
                        lsNextImg.style.transition = '';
                        lsNextImg.src = '';
                        delete lsNextImg.dataset.swipeSrc;
                    }, 200);
                }
            } else {
                const dx = e.changedTouches[0].clientX - tsX;
                const dy = e.changedTouches[0].clientY - tsY;
                if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) { closeLandscapeView(); }
                else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { navigateLandscapeSheet(dx < 0 ? 1 : -1); }
                else if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && !e.target.closest('button')) {
                    const header = document.querySelector('.ls-sheet-header');
                    if (header && header.classList.contains('ls-nav-hidden')) showLsNav();
                    else { clearTimeout(_lsNavTimer); hideLsNav(); }
                }
            }
        }
        isLSSwiping = false;
        lsSwipeDeltaX = 0;
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
    else if (isFS && isTabletLandscape()) {
        // 2. 전체화면 뷰어가 열린 상태에서 세로→가로 회전 → 분할뷰(ls-active)로 전환
        closeFullscreen();
        if (!_lsUserDismissed) activateLsView();
    }
    else if (isFS && !isTabletLandscape()) {
        // 3. 전체화면 뷰어가 열린 상태에서 가로→세로 이동 → 전체화면 닫기 (카드 그리드 유지)
        closeFullscreen();
    }
});

