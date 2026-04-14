const fs = require('fs');
const buf = fs.readFileSync(process.argv[2]);
const td = new TextDecoder('euc-kr');
const html = td.decode(buf);
// Find content area - between <b>내용</b> and 찬송가 목록보기
const start = html.indexOf('<b>내용</b>');
const end = html.indexOf('찬송가 목록보기');
if (start === -1 || end === -1) { process.stdout.write('NOT_FOUND'); process.exit(0); }
const content = html.substring(start, end);
// Extract plain text lyrics
let lyrics = content
  .replace(/<P[^>]*>/gi, '\n')
  .replace(/<BR\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/\r/g, '')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l.length > 0)
  .filter(l => !/^(미디듣기|파일받기|영문명|작사|작곡|HR)/.test(l))
  .join('\n')
  .trim();
process.stdout.write(lyrics);
