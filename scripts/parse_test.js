const fs = require('fs');
const html = fs.readFileSync('scripts/daum_tongil.html', 'utf8');
// Parse: <A href='...nid=NNN'>...<FONT>TITLE</FONT>...</A> / NNN장
const re = /nid=(\d+)[^>]*>.*?<FONT[^>]*>([^<]+)<\/FONT>.*?<\/A>\s*\/\s*(\d+)장/g;
let m;
const songs = [];
while ((m = re.exec(html)) !== null) {
  songs.push({ nid: m[1], title: m[2].trim(), num: m[3].padStart(3,'0') });
}
console.log('Found:', songs.length, 'songs');
songs.slice(0, 5).forEach(s => console.log(s.num, s.title, s.nid));
songs.slice(-5).forEach(s => console.log(s.num, s.title, s.nid));
