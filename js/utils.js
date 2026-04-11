// ─── 공통 유틸리티 ────────────────────────────────────────────────────────────

function showToast(msg, duration = 2500) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:14px 20px;border-radius:10px;z-index:9999;font-size:14px;max-width:90%;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);line-height:1.5;';
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
}
function showInstallToast(msg) { showToast(msg, 6000); }

function resetAll() {
    if (!confirm('입력한 콘티를 초기화할까요?')) return;
    document.getElementById('setlist-title').value = '';
    document.getElementById('song-input').value = '';
    document.getElementById('result-container').innerHTML = '';
    sheetList = [];
    document.getElementById('app-layout').classList.remove('ls-active');
    if (typeof clearLoadedConti === 'function') clearLoadedConti();
}

function isTabletLandscape() {
    // 최소 너비 480px 이상이면서 가로가 세로보다 길 때만 가로 레이아웃 적용 (폰 포함)
    return window.innerWidth >= 480 && window.innerWidth > window.innerHeight;
}

// Canvas 드로잉 유틸
function _roundRect(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, bl: r, br: r };
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
}

function _fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
}

// ─── 날짜 정규화: 다양한 형태 → yyyy-mm-dd ──────────────────────────────────
function normalizeDateInTitle(title) {
    if (!title || !title.trim()) return title;

    // Step 1: 구분자 있는 형태 (yyyy.m.d / yyyy/mm/dd / yyyy-mm-dd 등)
    // 이미 올바른 형태도 포함해서 month/day 0패딩 통일
    let result = title.replace(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/g, (_, y, m, d) => {
        const my = parseInt(y), mm = parseInt(m), md = parseInt(d);
        if (my >= 2000 && my <= 2099 && mm >= 1 && mm <= 12 && md >= 1 && md <= 31)
            return `${y}-${String(mm).padStart(2,'0')}-${String(md).padStart(2,'0')}`;
        return _;
    });

    // Step 2: yyyymmdd (8자리 연속 숫자)
    result = result.replace(/(?<!\d)(\d{4})(\d{2})(\d{2})(?!\d)/g, (_, y, m, d) => {
        const my = parseInt(y), mm = parseInt(m), md = parseInt(d);
        if (my >= 2000 && my <= 2099 && mm >= 1 && mm <= 12 && md >= 1 && md <= 31)
            return `${y}-${m}-${d}`;
        return _;
    });

    // Step 3: yymmdd (6자리 연속 숫자, 2000년대 가정)
    result = result.replace(/(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)/g, (_, y, m, d) => {
        const mm = parseInt(m), md = parseInt(d);
        if (mm >= 1 && mm <= 12 && md >= 1 && md <= 31)
            return `20${y}-${m}-${d}`;
        return _;
    });

    return result;
}

// ─── 콘티 텍스트 정규화: 곡번호 3자리 + 제목 자동 치환 ─────────────────────
// startSearch, saveConti 양쪽에서 공유 사용
function normalizeContiText(rawText) {
    let allLines = rawText.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        // 통일찬송가 줄: 통NNN 또는 통NN 형식
        const tongilMatch = trimmed.match(/^통(\d+)[\.\s]*(.*)/);
        if (tongilMatch) {
            const formattedNum = String(tongilMatch[1]).padStart(3, '0');
            let titlePart = tongilMatch[2].trim();
            if (typeof tongilArray !== 'undefined' && tongilArray.length > 0) {
                const found = tongilArray.find(s => s.startsWith(formattedNum + ' '));
                if (found) titlePart = found.substring(formattedNum.length + 1).trim();
            }
            return `통${formattedNum} ${titlePart}`;
        }

        // 새찬송가 줄: 찬NNN 또는 찬NN 형식
        const hymnMatch = trimmed.match(/^찬(\d+)[\.\s]*(.*)/);
        if (hymnMatch) {
            const formattedNum = String(hymnMatch[1]).padStart(3, '0');
            let titlePart = hymnMatch[2].trim();
            if (hymnArray.length > 0) {
                const found = hymnArray.find(s => s.startsWith(formattedNum + ' '));
                if (found) titlePart = found.substring(formattedNum.length + 1).trim();
            }
            return `찬${formattedNum} ${titlePart}`;
        }

        // CCM 찬양 줄
        const match = trimmed.match(/^(\d+)[\.\s]*(.*)/);
        if (match) {
            const formattedNum = String(match[1]).padStart(3, '0');
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
    return allLines.join('\n');
}
// ─── 버전 관리 ────────────────────────────────────────────────────────────
const APP_VERSION = "v1.11.2";
const BUILD_DATE  = "2026.04.11";

function initVersionDisplay() {
    // 모든 .app-version-badge를 APP_VERSION으로 동적 갱신 (#82)
    document.querySelectorAll('.app-version-badge').forEach(el => { el.textContent = APP_VERSION; });
    const footer = document.querySelector('footer');
    if (footer) {
        const verDiv = document.createElement('div');
        verDiv.classList.add('app-version-info');
        verDiv.style.cssText = 'font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 12px; font-family: "Inter", sans-serif;';
        verDiv.textContent = `${APP_VERSION} (Build ${BUILD_DATE})`;
        footer.appendChild(verDiv);
    }
}
// ─── 성능 최적화: 이미지 프리페칭 ──────────────────────────────────────────
const EXTENSIONS = ['.png', '.jpg', '.gif', '.jfif', '.PNG', '.JPG', '.GIF', '.JFIF'];
const _prefetchedSet = new Set();

function addDivider() {
    const textarea = document.getElementById('song-input');
    let currentText = textarea.value;
    if (currentText.length > 0 && !currentText.endsWith('\n')) currentText += '\n';
    textarea.value = currentText + '──────────────────';
    handleInputPrefetch(textarea.value);
}

async function prefetchImage(num) {
    if (!num || _prefetchedSet.has(num)) return;
    const s        = String(num);
    const isHymn   = s.startsWith('찬');
    const isTongil = s.startsWith('통');
    const rawNum   = (isHymn || isTongil) ? s.slice(1) : s;
    const numPadded = rawNum.padStart(3, '0');
    const basePath  = isHymn ? 'images/hymn/' : isTongil ? 'images/tongil/' : 'images/';
    _prefetchedSet.add(num);

    for (const ext of EXTENSIONS) {
        const url = `${basePath}${numPadded}${ext}`;
        try {
            const img = new Image();
            img.src = url;
        } catch(e) {}
    }
}
