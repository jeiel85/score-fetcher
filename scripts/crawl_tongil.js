/**
 * 통일찬송가 번호/제목/가사 크롤링 스크립트
 * 출처: https://m.cafe.daum.net/sungmak2004/AkwB/1 (목록)
 *       http://kcm.kr/dic_view.php?nid=XXXXX (가사)
 * 결과: tongil_list.json, tongil_lyrics.json
 *
 * 실행: node scripts/crawl_tongil.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TONGIL_IMG_DIR = path.join(ROOT, 'images', 'tongil');
const DAUM_URL = 'https://m.cafe.daum.net/sungmak2004/AkwB/1';
const DELAY_MS = 250;

// ─────────────────────────────────────────────────
// 유틸

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** curl --http1.0 로 바이너리 다운로드 */
function fetchBinary(url) {
  try {
    const buf = execFileSync('curl', [
      '-s', '--http1.0', '--max-time', '20',
      '-A', 'Mozilla/5.0',
      url,
    ], { maxBuffer: 4 * 1024 * 1024 });
    return buf;
  } catch (e) {
    return null;
  }
}

/** curl로 UTF-8 페이지 다운로드 */
function fetchText(url) {
  try {
    const buf = execFileSync('curl', [
      '-s', '--max-time', '20',
      '-A', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      url,
    ], { maxBuffer: 4 * 1024 * 1024 });
    return buf.toString('utf8');
  } catch (e) {
    return null;
  }
}

// ─────────────────────────────────────────────────
// Step 1: 다음 카페 목록 페이지 파싱

function parseDaumIndex(html) {
  const songs = [];
  // <A href="http://kcm.kr/dic_view.php?nid=NID"><U><FONT ...>TITLE</FONT></U></A> / NUM장
  const re = /nid=(\d+)[^>]*>.*?<FONT[^>]*>([^<]+)<\/FONT>.*?<\/A>\s*\/\s*(\d+)장/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    songs.push({
      nid: m[1],
      title: m[2].trim(),
      num: m[3].padStart(3, '0'),
    });
  }
  return songs;
}

// ─────────────────────────────────────────────────
// Step 2: kcm.kr 가사 파싱 (EUC-KR 인코딩)

function parseKcmLyrics(buf) {
  if (!buf) return null;
  let html;
  try {
    const td = new TextDecoder('euc-kr');
    html = td.decode(buf);
  } catch (e) {
    html = buf.toString('latin1');
  }

  const start = html.indexOf('<b>내용</b>');
  const end = html.indexOf('찬송가 목록보기');
  if (start === -1 || end === -1) return null;

  const content = html.substring(start, end);
  const lines = content
    .replace(/<P[^>]*>/gi, '\n')
    .replace(/<BR\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l !== '내용')
    .filter(l => !/^(미디듣기|파일받기|영문명|작사|작곡)/.test(l));

  return lines.join('\n').trim() || null;
}

// ─────────────────────────────────────────────────
// Step 3: 이미지 파일 기반 pages 수 계산

function detectPages(numPadded) {
  const splitPath = path.join(TONGIL_IMG_DIR, `${numPadded}-1.gif`);
  if (fs.existsSync(splitPath)) return 2;
  return 1;
}

// ─────────────────────────────────────────────────
// 메인

async function run() {
  console.log('통일찬송가 크롤링 시작\n');

  // 1. 다음 카페 목록 파싱
  process.stdout.write('다음 카페 목록 페이지 다운로드... ');
  const daumHtml = fetchText(DAUM_URL);
  if (!daumHtml) {
    console.error('실패: 다음 카페 페이지를 가져올 수 없습니다.');
    process.exit(1);
  }
  const songs = parseDaumIndex(daumHtml);
  console.log(`${songs.length}개 찬송 발견`);

  if (songs.length === 0) {
    console.error('파싱 실패: 0개 결과');
    process.exit(1);
  }

  // 2. pages 수 추가 (이미지 파일 기반)
  for (const s of songs) {
    s.pages = detectPages(s.num);
  }
  const twoPageCount = songs.filter(s => s.pages === 2).length;
  console.log(`  └ 2페이지 악보: ${twoPageCount}곡`);

  // 3. kcm.kr 가사 크롤링
  console.log('\nkcm.kr 가사 크롤링...');
  const lyricsMap = {};
  let ok = 0, fail = 0;

  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    const pct = ((i + 1) / songs.length * 100).toFixed(0);
    process.stdout.write(`\r  [${(i+1).toString().padStart(3)}/${songs.length}] ${pct}%  ${s.num} ${s.title.padEnd(20).substring(0,20)} `);

    const url = `http://kcm.kr/dic_view.php?nid=${s.nid}`;
    const buf = fetchBinary(url);
    const lyrics = parseKcmLyrics(buf);

    if (lyrics) {
      lyricsMap[s.num] = lyrics;
      ok++;
    } else {
      fail++;
    }

    if (i < songs.length - 1) {
      await sleep(DELAY_MS);
    }
  }
  console.log(`\n  └ 성공: ${ok}, 실패: ${fail}`);

  // 4. tongil_list.json 저장
  const listOutput = {
    metadata: {
      total: songs.length,
      source: DAUM_URL,
      crawled_at: new Date().toISOString(),
    },
    songs: songs
      .sort((a, b) => a.num.localeCompare(b.num))
      .map(s => ({ number: s.num, title: s.title, pages: s.pages })),
  };
  const listPath = path.join(ROOT, 'tongil_list.json');
  fs.writeFileSync(listPath, JSON.stringify(listOutput, null, 2), 'utf8');
  console.log(`\n저장: tongil_list.json (${songs.length}곡)`);

  // 5. tongil_lyrics.json 저장
  const lyricsPath = path.join(ROOT, 'tongil_lyrics.json');
  fs.writeFileSync(lyricsPath, JSON.stringify(lyricsMap, null, 2), 'utf8');
  console.log(`저장: tongil_lyrics.json (${ok}곡 가사)`);

  // 6. 샘플 출력
  console.log('\n--- 샘플 (번호 순 처음 5개) ---');
  listOutput.songs.slice(0, 5).forEach(s =>
    console.log(`  ${s.num}: ${s.title}${s.pages > 1 ? ` [${s.pages}p]` : ''}`)
  );
  console.log('--- 샘플 (마지막 5개) ---');
  listOutput.songs.slice(-5).forEach(s =>
    console.log(`  ${s.num}: ${s.title}${s.pages > 1 ? ` [${s.pages}p]` : ''}`)
  );
  console.log(`\n가사 샘플 (001번):`);
  const firstNum = listOutput.songs[0]?.number;
  if (firstNum && lyricsMap[firstNum]) {
    console.log(lyricsMap[firstNum].substring(0, 150) + '...');
  }
}

run().catch(console.error);
