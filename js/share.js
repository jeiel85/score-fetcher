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
        if (/^\d+/.test(t) || /^찬\d+/.test(t) || /^통\d+/.test(t)) return 'song';
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
            const m = t.match(/^(찬\d+|통\d+|\d+)\s*(.*)/);
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
let _shareDeepUrl = null; // 미리 생성해둔 딥링크

async function shareConti() {
    const rawContent = document.getElementById('song-input').value.trim();
    if (!rawContent || rawContent.includes('아래 예시처럼 붙여넣어 주세요')) { alert('공유할 콘티가 없습니다!'); return; }
    const canvas = await generateContiCanvas();
    if (!canvas) { alert('공유할 콘티가 없습니다!'); return; }
    const title = document.getElementById('setlist-title').value.trim();
    canvas.toBlob(async (blob) => {
        const fileName = `콘티_${title || '공유'}.png`;
        _shareFile   = new File([blob], fileName, { type: 'image/png' });
        _shareCanvas = canvas;
        _shareTitle  = title;
        _shareDeepUrl = null;

        // 딥링크 미리 생성 → 이미 저장된 콘티면 재저장 없이 key 재사용 (#127)
        try {
            let key = (typeof _loadedContiKey !== 'undefined' && _loadedContiKey) ? _loadedContiKey : null;
            if (!key) {
                key = await saveToHistory();
                if (key && typeof _setLoadedConti === 'function') _setLoadedConti(key, title);
            }
            if (key) {
                _shareDeepUrl = `${location.origin}/?conti=${key}`;
                const chip = document.getElementById('shareDeeplinkChip');
                document.getElementById('shareDeeplinkText').textContent = _shareDeepUrl;
                chip.style.display = 'flex';
            }
        } catch(e) { /* 딥링크 없이 진행 */ }

        const dataUrl = canvas.toDataURL('image/png');
        document.getElementById('sharePreviewImg').src = dataUrl;
        document.getElementById('sharePreviewModal').style.display = 'flex';
        document.querySelector('.share-preview-footer').classList.add('ui-hidden');
        _showShareUI();
    }, 'image/png');
}

async function copyDeeplink() {
    if (!_shareDeepUrl) return;
    try {
        await navigator.clipboard.writeText(_shareDeepUrl);
        const copyLabel = document.querySelector('.share-deeplink-copy');
        copyLabel.textContent = '✓ 복사됨!';
        setTimeout(() => { copyLabel.textContent = '탭하여 복사'; }, 2000);
    } catch(e) { showToast('클립보드 복사 실패'); }
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
    _shareFile = null; _shareCanvas = null; _shareDeepUrl = null;
    document.getElementById('shareDeeplinkChip').style.display = 'none';
    document.querySelector('.share-deeplink-copy').textContent = '탭하여 복사';
}

async function doShareConti() {
    if (!_shareFile || !_shareCanvas) return;

    // 지역 변수에 저장 (closeSharePreview가 null로 초기화하기 때문)
    const shareFile   = _shareFile;
    const shareCanvas = _shareCanvas;
    const shareTitle  = _shareTitle;
    const deepUrl     = _shareDeepUrl; // 미리보기 열릴 때 이미 생성됨

    const canShareFiles = navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] });
    if (canShareFiles) {
        // 사용자 제스처 컨텍스트 내에서 미리 클립보드 복사
        if (deepUrl && navigator.clipboard) {
            await navigator.clipboard.writeText(deepUrl).catch(() => {});
        }
        try {
            // text 제거: title+text 중복 시 iOS KakaoTalk에서 빈 줄 발생
            const sharePayload = { title: shareTitle || '콘티 공유', files: [shareFile] };
            if (deepUrl) sharePayload.url = deepUrl; // iOS: 이미지+링크 함께 공유 / Android: url 무시되나 클립보드로 전달
            await navigator.share(sharePayload);
            // Android Chrome은 files+url 동시 지원 안 함 → 클립보드 복사 안내
            if (deepUrl) showToast('📤 공유 완료! 링크는 클립보드에도 복사됐어요 📋', 4000);
            closeSharePreview();
            return;
        } catch (e) {
            if (e.name === 'AbortError') return; // 사용자가 공유 취소
        }
    }
    // 웹 공유 API 미지원 또는 실패 시 다운로드
    const a = document.createElement('a');
    a.download = shareFile.name;
    a.href = shareCanvas.toDataURL('image/png');
    a.click();
    closeSharePreview();
}

// ─── #148 전체 콘티 악보 PDF 다운로드 ─────────────────────────────────────

// 전체 콘티 악보 PDF로 다운로드
async function downloadContiPdf() {
    if (typeof jspdf === 'undefined') {
        showToast('⚠️ PDF 라이브러리가 로드되지 않았습니다');
        return;
    }
    
    const title = document.getElementById('setlist-title').value.trim() || '제목 없는 콘티';
    const rawContent = document.getElementById('song-input').value.trim();
    
    if (!rawContent) {
        showToast('⚠️ PDF로 내보낼 콘티 내용이 없습니다');
        return;
    }
    
    // 곡 줄 추출
    const songLines = rawContent.split('\n').filter(line => {
        const trimmed = line.trim();
        return /^\d+/.test(trimmed) || /^찬\d+/.test(trimmed) || /^통\d+/.test(trimmed);
    });
    
    if (songLines.length === 0) {
        showToast('⚠️ 곡이 포함된 콘티만 PDF로 내보낼 수 있습니다');
        return;
    }
    
    showToast('🔄 PDF 생성 중... (이미지 로딩 대기)');
    
    try {
        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4'); // 세로 A4
        const pageWidth = pdf.internal.pageSize.getWidth();  // 210mm
        const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
        
        // ── 1페이지: 콘티 표지 ──────────────────────────────────────────
        const PALETTES = [
            { bg: [45, 74, 92], accent: [126, 200, 227] },
            { bg: [61, 43, 90], accent: [196, 168, 232] },
            { bg: [26, 58, 42], accent: [126, 207, 170] },
            { bg: [90, 45, 58], accent: [240, 168, 184] },
            { bg: [45, 58, 92], accent: [168, 191, 240] },
            { bg: [74, 48, 32], accent: [240, 200, 144] },
            { bg: [28, 44, 62], accent: [144, 200, 240] },
            { bg: [58, 32, 64], accent: [216, 168, 240] },
        ];
        const hashIdx = (str) => {
            let h = 0;
            for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
            return Math.abs(h) % PALETTES.length;
        };
        const { bg: BG, accent: AC } = PALETTES[hashIdx(title)];
        
        // 배경
        pdf.setFillColor(...BG);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // 제목
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(28);
        pdf.text(title, pageWidth / 2, 80, { align: 'center' });
        
        // 곡 수
        pdf.setFontSize(14);
        pdf.setTextColor(...AC);
        pdf.text(`총 ${songLines.length}곡`, pageWidth / 2, 100, { align: 'center' });
        
        // ── 2페이지 이후: 악보 이미지 ─────────────────────────────────
        let pageNum = 1;
        const margin = 10;
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = pageHeight - margin * 2;
        
        for (const songLine of songLines) {
            // 곡 번호 추출
            const match = songLine.match(/^(?:통|찬)?(\d+)/);
            if (!match) continue;
            
            const num = match[1].padStart(3, '0');
            const prefix = songLine.includes('통') ? '통' : songLine.includes('찬') ? '찬' : '';
            const imgKey = prefix + num;
            
            // 이미지 경로
            const basePath = prefix === '찬' ? 'images/hymn/' : prefix === '통' ? 'images/tongil/' : 'images/';
            const extensions = ['.jpg', '.png', '.gif', '.jfif', '.JPG', '.PNG', '.GIF', '.JFIF'];
            
            // 이미지 찾기
            let imgSrc = null;
            for (const ext of extensions) {
                const testSrc = basePath + num + ext;
                try {
                    const loaded = await loadImageAsync(testSrc);
                    if (loaded) {
                        imgSrc = testSrc;
                        break;
                    }
                } catch {}
            }
            
            if (imgSrc) {
                pdf.addPage();
                pageNum++;
                
                // 이미지 추가
                try {
                    pdf.addImage(imgSrc, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
                } catch (err) {
                    console.warn('PDF 이미지 추가 실패:', imgSrc, err);
                    // 이미지 실패 시 빈 페이지 또는 텍스트
                    pdf.setFontSize(12);
                    pdf.setTextColor(100);
                    pdf.text(`악보 이미지 로드 실패: ${imgKey}`, pageWidth / 2, pageHeight / 2, { align: 'center' });
                }
            }
        }
        
        // PDF 다운로드
        const safeTitle = title.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 30);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        pdf.save(`${safeTitle}_${dateStr}.pdf`);
        
        showToast(`✅ PDF 다운로드 완료! (${pageNum}페이지)`);
        
    } catch (error) {
        console.error('PDF 생성 오류:', error);
        showToast('⚠️ PDF 생성 중 오류가 발생했습니다');
    }
}

// 이미지 비동기 로드 헬퍼
function loadImageAsync(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
        // 타임아웃
        setTimeout(() => resolve(false), 3000);
    });
}
