/**
 * 새찬송가 제목 크롤링 스크립트
 * 출처: https://nybethel.org/240
 * 결과: hymn_list.json 생성
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// 장 범위별 페이지 URL
const PAGES = [
  { url: 'https://nybethel.org/240/11', range: '001~100' },
  { url: 'https://nybethel.org/240/10', range: '101~200' },
  { url: 'https://nybethel.org/240/9',  range: '201~300' },
  { url: 'https://nybethel.org/240/8',  range: '301~400' },
  { url: 'https://nybethel.org/240/7',  range: '401~500' },
  { url: 'https://nybethel.org/240/6',  range: '501~600' },
  { url: 'https://nybethel.org/240/5',  range: '601~645' },
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let html = '';
      res.setEncoding('utf8');
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve(html));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

function parseTitles(html) {
  const songs = [];
  // "../data/Nhymn/NNN.jpg" href를 가진 <a> 태그 전체 캡처 (내부 태그 포함)
  const re = /href="[^"]*\/(\d{3})\.jpg"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const number = m[1];
    const raw = stripTags(m[2]).trim();
    // "001 장 : 만복의 근원 하나님" or "001 장 : 제목 (통1)" → title만 추출
    const titleMatch = raw.match(/^\d+\s*장\s*:\s*(.+)$/);
    const title = titleMatch ? titleMatch[1].trim() : raw;
    if (title) songs.push({ number, title });
  }
  return songs;
}

async function run() {
  console.log('새찬송가 제목 크롤링 시작...\n');

  const allSongs = [];

  for (const page of PAGES) {
    process.stdout.write(`페이지 크롤링: ${page.range} (${page.url}) ... `);
    try {
      const html = await fetchPage(page.url);
      const songs = parseTitles(html);
      allSongs.push(...songs);
      console.log(`${songs.length}개 찾음`);
    } catch (err) {
      console.log(`실패: ${err.message}`);
    }
    // 요청 간 딜레이
    await new Promise(r => setTimeout(r, 500));
  }

  // 번호순 정렬 및 중복 제거
  allSongs.sort((a, b) => a.number.localeCompare(b.number));
  const unique = [];
  const seen = new Set();
  for (const s of allSongs) {
    if (!seen.has(s.number)) {
      seen.add(s.number);
      unique.push(s);
    }
  }

  console.log(`\n총 ${unique.length}개 곡 수집 완료`);

  // hymn_list.json 저장
  const output = {
    metadata: {
      total: unique.length,
      source: 'https://nybethel.org/240',
      crawled_at: new Date().toISOString(),
    },
    songs: unique.map(s => ({
      number: s.number,
      title: s.title,
    })),
  };

  const outPath = path.join(__dirname, '..', 'hymn_list.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`저장 완료: hymn_list.json`);

  // 간단한 txt 버전도 생성 (hymn_names.txt)
  const txtLines = unique.map(s => `${s.number} ${s.title}`);
  fs.writeFileSync(
    path.join(__dirname, '..', 'hymn_names.txt'),
    txtLines.join('\n'),
    'utf8'
  );
  console.log('저장 완료: hymn_names.txt');

  // 샘플 출력
  console.log('\n--- 샘플 (처음 5개) ---');
  unique.slice(0, 5).forEach(s => console.log(`  ${s.number}: ${s.title}`));
  console.log('--- 샘플 (마지막 5개) ---');
  unique.slice(-5).forEach(s => console.log(`  ${s.number}: ${s.title}`));
}

run().catch(console.error);
