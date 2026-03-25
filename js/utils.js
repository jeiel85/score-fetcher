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
    document.getElementById('setlist-title').value = '';
    document.getElementById('song-input').value = '';
    document.getElementById('result-container').innerHTML = '';
    sheetList = [];
    document.getElementById('app-layout').classList.remove('ls-active');
}

function isTabletLandscape() { return window.innerWidth >= 768; }

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
