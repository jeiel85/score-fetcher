// ─── 콘티 이미지 공유 (Canvas 생성) ──────────────────────────────────────────

async function generateContiCanvas() {
    const title      = document.getElementById('setlist-title').value.trim();
    const rawContent = document.getElementById('song-input').value.trim();
    if (!rawContent || rawContent.includes('아래 예시처럼 붙여넣어 주세요')) return null;

    // 팔레트: 제목 해시 → 일관된 배경색
    const PALETTES = [
        { bg: '#2d4a5c', accent: '#7ec8e3' },
        { bg: '#3d2b5a', accent: '#c4a8e8' },
        { bg: '#1a3a2a', accent: '#7ecfaa' },
        { bg: '#5a2d3a', accent: '#f0a8b8' },
        { bg: '#2d3a5c', accent: '#a8bff0' },
        { bg: '#4a3020', accent: '#f0c890' },
        { bg: '#1c2c3e', accent: '#90c8f0' },
        { bg: '#3a2040', accent: '#d8a8f0' },
    ];
    const hashIdx = (str) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        return Math.abs(h) % PALETTES.length;
    };
    const { bg: BG, accent: AC } = PALETTES[hashIdx(title || rawContent.slice(0, 20))];

    const classify = l => {
        const t = l.trim();
        if (t === '') return 'empty';
        if (/^\|/.test(t) || /\|$/.test(t)) return 'header';
        if (/^\d+/.test(t)) return 'song';
        if (/^-/.test(t)) return 'comment';
        return 'text';
    };

    const W = 800, SCALE = 2, PAD_X = 60;
    const INNER_W   = W - PAD_X * 2;
    const TITLE_SZ  = 56, TITLE_LH = 72;
    const BODY_SZ   = 38;
    const LH = { empty: 28, header: 56, song: 56, comment: 46, text: 50 };
    const PAD_TOP = 72, PAD_BOT = 72;

    const dateRe  = /^(\d{4}[-./]\d{2}[-./]\d{2})\s*/;
    const dm      = title.match(dateRe);
    const datePart = dm ? dm[1] : '';
    const restPart = dm ? title.slice(dm[0].length) : title;

    const tmpC = document.createElement('canvas');
    tmpC.width = W * 2; tmpC.height = 10;
    const tCtx = tmpC.getContext('2d');
    tCtx.font = `bold ${TITLE_SZ}px sans-serif`;
    const fullTW = tCtx.measureText(title).width;
    const titleRows = fullTW <= INNER_W ? 1 : 2;

    const lines = rawContent.split('\n');
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    const contentH = lines.reduce((s, l) => s + LH[classify(l)], 0);

    const TITLE_BLOCK = titleRows * TITLE_LH + 20;
    const TOTAL_H = PAD_TOP + TITLE_BLOCK + contentH + PAD_BOT;

    const canvas = document.createElement('canvas');
    canvas.width  = W * SCALE;
    canvas.height = TOTAL_H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, TOTAL_H);

    ctx.font = `bold ${TITLE_SZ}px sans-serif`;
    ctx.textAlign = 'left';

    if (titleRows === 1) {
        let tx = PAD_X;
        const baseY = PAD_TOP + TITLE_SZ;
        if (datePart) {
            ctx.fillStyle = AC;
            ctx.fillText(datePart, tx, baseY);
            const dw = ctx.measureText(datePart).width;
            ctx.fillRect(tx, baseY + 8, dw, 4);
            tx += ctx.measureText(datePart + ' ').width;
        }
        if (restPart) {
            ctx.fillStyle = 'white';
            ctx.fillText(_fitText(ctx, restPart, INNER_W - (tx - PAD_X)), tx, baseY);
        }
    } else {
        let ty = PAD_TOP + TITLE_SZ;
        if (datePart) {
            ctx.fillStyle = AC;
            ctx.fillText(datePart, PAD_X, ty);
            const dw = ctx.measureText(datePart).width;
            ctx.fillRect(PAD_X, ty + 8, dw, 4);
            ty += TITLE_LH;
        }
        if (restPart) {
            ctx.fillStyle = 'white';
            ctx.fillText(_fitText(ctx, restPart, INNER_W), PAD_X, ty);
        }
    }

    ctx.textAlign = 'left';
    let y = PAD_TOP + TITLE_BLOCK;

    lines.forEach(line => {
        const type = classify(line);
        const t    = line.trim();
        const h    = LH[type];

        if (type === 'empty') { y += h; return; }
        if (type === 'header') {
            ctx.font = `${BODY_SZ}px sans-serif`;
            ctx.fillStyle = `rgba(255,255,255,0.55)`;
            ctx.fillText(t, PAD_X, y + BODY_SZ);
            y += h; return;
        }
        if (type === 'song') {
            const m = t.match(/^(\d+)\s*(.*)/);
            const num = m[1], songTitle = m[2];
            ctx.font = `bold ${BODY_SZ}px sans-serif`;
            ctx.fillStyle = AC;
            ctx.fillText(num, PAD_X, y + BODY_SZ);
            const numW = ctx.measureText(num + ' ').width;
            ctx.font = `${BODY_SZ}px sans-serif`;
            ctx.fillStyle = 'white';
            ctx.fillText(_fitText(ctx, songTitle, INNER_W - numW), PAD_X + numW, y + BODY_SZ);
            y += h; return;
        }
        if (type === 'comment') {
            ctx.font = `${BODY_SZ - 4}px sans-serif`;
            ctx.fillStyle = `rgba(255,255,255,0.65)`;
            ctx.fillText(_fitText(ctx, t, INNER_W - 16), PAD_X + 16, y + BODY_SZ - 4);
            y += h; return;
        }
        ctx.font = `${BODY_SZ}px sans-serif`;
        ctx.fillStyle = 'white';
        ctx.fillText(_fitText(ctx, t, INNER_W), PAD_X, y + BODY_SZ);
        y += h;
    });

    return canvas;
}

let _shareFile = null, _shareCanvas = null, _shareTitle = '';
let _shareUiTimer = null;

async function shareConti() {
    const rawContent = document.getElementById('song-input').value.trim();
    if (!rawContent || rawContent.includes('아래 예시처럼 붙여넣어 주세요')) { alert('공유할 콘티가 없습니다!'); return; }
    const canvas = await generateContiCanvas();
    if (!canvas) { alert('공유할 콘티가 없습니다!'); return; }
    const title = document.getElementById('setlist-title').value.trim();
    canvas.toBlob((blob) => {
        const fileName = `콘티_${title || '공유'}.png`;
        _shareFile   = new File([blob], fileName, { type: 'image/png' });
        _shareCanvas = canvas;
        _shareTitle  = title;
        const dataUrl = canvas.toDataURL('image/png');
        document.getElementById('sharePreviewImg').src = dataUrl;
        document.getElementById('sharePreviewModal').style.display = 'flex';
        document.querySelector('.share-preview-footer').classList.add('ui-hidden');
        _showShareUI();
    }, 'image/png');
}

function _showShareUI() {
    const footer = document.querySelector('.share-preview-footer');
    const isHidden = footer.classList.contains('ui-hidden');
    clearTimeout(_shareUiTimer);
    if (isHidden) {
        footer.classList.remove('ui-hidden');
        _shareUiTimer = setTimeout(() => footer.classList.add('ui-hidden'), 3000);
    } else { footer.classList.add('ui-hidden'); }
}

function closeSharePreview() {
    clearTimeout(_shareUiTimer);
    document.getElementById('sharePreviewModal').style.display = 'none';
    _shareFile = null; _shareCanvas = null;
}

async function doShareConti() {
    if (!_shareFile || !_shareCanvas) return;

    // 공유 전에 지역 변수에 먼저 저장 (closeSharePreview가 null로 초기화하기 때문)
    const shareFile   = _shareFile;
    const shareCanvas = _shareCanvas;
    const shareTitle  = _shareTitle;

    // 딥링크 URL 생성을 위해 Firebase 저장 (조용히)
    // 저장 실패 또는 오프라인이면 URL 없이 이미지만 공유
    let shareText = shareTitle || '콘티 공유';
    try {
        const key = await saveToHistory();
        if (key) shareText += `\n${location.origin}/?conti=${key}`;
    } catch(e) { /* URL 없이 이미지만 공유 진행 */ }

    const canShareFiles = navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] });
    if (canShareFiles) {
        // 카카오톡 등 일부 앱은 파일 공유 시 text를 버림
        // → navigator.share() 호출 전(사용자 제스처 컨텍스트 내)에 미리 클립보드 복사
        const deepUrl = shareText.includes('\n') ? shareText.split('\n')[1] : null;
        if (deepUrl && navigator.clipboard) {
            await navigator.clipboard.writeText(deepUrl).catch(() => {});
        }
        try {
            await navigator.share({ title: shareTitle || '콘티 공유', text: shareText, files: [shareFile] });
            if (deepUrl) showToast('🔗 딥링크를 클립보드에 복사했어요! 카카오톡 채팅에 붙여넣기 하세요');
            closeSharePreview();
            return;
        } catch (e) {
            if (e.name === 'AbortError') return; // 사용자가 공유 취소
            // 공유 실패 시 다운로드로 폴백
        }
    }
    // 웹 공유 API 미지원 또는 실패 시 다운로드
    const a = document.createElement('a');
    a.download = shareFile.name;
    a.href = shareCanvas.toDataURL('image/png');
    a.click();
    closeSharePreview();
}
