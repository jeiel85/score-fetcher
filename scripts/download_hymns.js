/**
 * 새찬송가 악보 다운로드 스크립트
 * 출처: https://nybethel.org/data/Nhymn/{번호}.jpg
 * 저장 위치: images/hymn/001.jpg ~ 645.jpg
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://nybethel.org/data/Nhymn/';
const OUTPUT_DIR = path.join(__dirname, '..', 'images', 'hymn');
const TOTAL = 645;
const CONCURRENCY = 5; // 동시 다운로드 수 (서버 부하 최소화)
const DELAY_MS = 300;  // 요청 간 딜레이

// 출력 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`디렉토리 생성: ${OUTPUT_DIR}`);
}

function pad(n) {
  return String(n).padStart(3, '0');
}

function download(num) {
  return new Promise((resolve, reject) => {
    const filename = `${pad(num)}.jpg`;
    const outPath = path.join(OUTPUT_DIR, filename);

    // 이미 다운로드된 파일은 스킵
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      process.stdout.write(`  [SKIP] ${filename}\n`);
      return resolve({ num, status: 'skip' });
    }

    const url = `${BASE_URL}${filename}`;
    const file = fs.createWriteStream(outPath);

    const req = https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          process.stdout.write(`  [OK]   ${filename} (${res.headers['content-length']} bytes)\n`);
          resolve({ num, status: 'ok' });
        });
      } else if (res.statusCode === 404) {
        file.close();
        fs.unlink(outPath, () => {});
        process.stdout.write(`  [404]  ${filename}\n`);
        resolve({ num, status: '404' });
      } else {
        file.close();
        fs.unlink(outPath, () => {});
        process.stdout.write(`  [ERR]  ${filename} (HTTP ${res.statusCode})\n`);
        resolve({ num, status: `http_${res.statusCode}` });
      }
    });

    req.on('error', (err) => {
      file.close();
      fs.unlink(outPath, () => {});
      process.stdout.write(`  [ERR]  ${filename} - ${err.message}\n`);
      resolve({ num, status: 'error', err: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      file.close();
      fs.unlink(outPath, () => {});
      process.stdout.write(`  [TIMEOUT] ${filename}\n`);
      resolve({ num, status: 'timeout' });
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log(`\n새찬송가 악보 다운로드 시작 (1~${TOTAL}장)`);
  console.log(`저장 위치: ${OUTPUT_DIR}`);
  console.log(`동시 다운로드: ${CONCURRENCY}개, 딜레이: ${DELAY_MS}ms\n`);

  const results = { ok: 0, skip: 0, notFound: 0, error: 0 };
  const failed = [];

  for (let i = 1; i <= TOTAL; i += CONCURRENCY) {
    const batch = [];
    for (let j = i; j < i + CONCURRENCY && j <= TOTAL; j++) {
      batch.push(download(j));
    }

    const batchResults = await Promise.all(batch);
    for (const r of batchResults) {
      if (r.status === 'ok') results.ok++;
      else if (r.status === 'skip') results.skip++;
      else if (r.status === '404') { results.notFound++; failed.push(r.num); }
      else { results.error++; failed.push(r.num); }
    }

    // 진행률 표시
    const done = Math.min(i + CONCURRENCY - 1, TOTAL);
    const pct = ((done / TOTAL) * 100).toFixed(1);
    console.log(`--- 진행: ${done}/${TOTAL} (${pct}%) | 성공: ${results.ok} 스킵: ${results.skip} 없음: ${results.notFound} 오류: ${results.error}`);

    if (i + CONCURRENCY <= TOTAL) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== 다운로드 완료 ===');
  console.log(`성공: ${results.ok}개`);
  console.log(`스킵(기존): ${results.skip}개`);
  console.log(`404(없음): ${results.notFound}개`);
  console.log(`오류: ${results.error}개`);

  if (failed.length > 0) {
    console.log(`\n실패/없음 목록: ${failed.map(pad).join(', ')}`);
  }

  // 결과 리포트 저장
  const report = {
    date: new Date().toISOString(),
    total: TOTAL,
    results,
    failed: failed.map(pad),
  };
  fs.writeFileSync(
    path.join(__dirname, 'hymn_download_report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('\n리포트 저장: scripts/hymn_download_report.json');
}

run().catch(console.error);
