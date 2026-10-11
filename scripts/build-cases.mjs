// 홈페이지 공개 사례(시공·납품·A/S)를 교육 주제별로 묶어 cases-data.js 를 만든다.
// 입력: ../busungtk-landing/portfolio/data-{as,sigong,napum}.json (이미 익명화돼 공개된 자료)
// 실행: node scripts/build-cases.mjs   (사례가 늘면 다시 돌린다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const SRC = path.resolve(ROOT, '..', 'busungtk-landing', 'portfolio');
const SITE = 'https://busungtk.website/cases';

// generate-case-pages.mjs 의 slugifyTitle 과 같은 규칙 (바꾸면 링크가 깨진다)
function slugifyTitle(title) {
  return title
    .replace(/["""''()（）[\]【】<>《》「」『』·•※~!@#$%^&*+=|\/?.,;:]/g, ' ')
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-/, '').slice(0, 50).replace(/-$/, '');
}

// 주제 = 교재 단원과 맞물리는 묶음. 제목에서 낱말로 판정한다 (위에서부터 먼저 맞는 것 하나만이 아니라 여러 개 허용)
const TOPICS = [
  { id: 'cold',   name: '냉장·냉동',        re: /냉장|냉동|워크인|쇼케이스|제빙|아이스|콜드|칠러|응축|컴프|냉매|김치냉장|육수냉장|테이블냉|보냉|실외기|팽창변|증발기|냉각기|슬러시|에어컨/ },
  { id: 'heat',   name: '가열·가스 조리',    re: /가스|화구|레인지|렌지|버너|솥|그릴|석쇠|열탕|라면조리|라면기|커피 브루어|누들바|스팀|취반|밥솥|오븐|그리들|튀김|프라이어|부침|국솥|볶음|인덕션|컨벡션/ },
  { id: 'wash',   name: '세척·퇴식',        re: /세척|식세기|컨베이어|퇴식|디스포저|소독|살균/ },
  { id: 'prep',   name: '전처리·면 설비',    re: /전처리|절단기|세미기|김밥|제면|면반죽|해면|믹서|간택기|성형기|반죽/ },
  { id: 'hood',   name: '후드·환기',        re: /후드|닥트|덕트|배기|급기|환기|휠터|필터박스|팬/ },
  { id: 'water',  name: '급수·배수·배관',    re: /배관|수전|배수|급수|그리스|트랩|하수|누수|온수|정수|싱크|씽크|드레인|수도|트렌치|세정대|펌프|워터릴|덤프스테이션/ },
  { id: 'warm',   name: '온장·보온·배식',    re: /온장|보온|배식|워머|온수조|중탕|자율배식/ },
  { id: 'steel',  name: '기물·용접·작업대',   re: /작업대|상판|선반|용접|바퀴|캐스터|스텐|보호대|기물|랙|카트|테이블(?!냉)/ },
  { id: 'elec',   name: '전기',             re: /전기|스위치|차단기|배선|콘센트|전등|조명|누전|분전|전원|안정기|PCB|컨트롤|램프|LED|평판등|서모스탯|모터|소켓/ },
  { id: 'open',   name: '신규·리뉴얼·설치·철거', re: /신규|오픈|리뉴얼|완전시공|전체시공|주방 시공|일괄|철거|반입|반출|재설치|조성|주방 설비 설치|주방기기 설치|납품·시공|주방시공|주방 세팅|창업|반찬가게 시공|납품 및 시공/ },
];

// 공개 자료지만 한 번 더 막는다 — 보안 코드가 섞이면 빌드를 멈춘다
const BLOCK = /폴라리스|투게더|오아시스|\bR[3-6]\b|SR6/i;

const TYPE = { as: 'A/S', sigong: '시공', napum: '납품' };
const out = [];
for (const t of Object.keys(TYPE)) {
  const arr = JSON.parse(fs.readFileSync(path.join(SRC, `data-${t}.json`), 'utf8'));
  for (const c of arr) {
    if (!c || !c.title || !c.idx) continue;
    if (BLOCK.test(c.title) || BLOCK.test(c.body || '')) { console.error('보안 낱말 발견 — 중단:', c.idx); process.exit(1); }
    const topics = TOPICS.filter(x => x.re.test(c.title)).map(x => x.id);
    // 본문 첫 질문 줄 (「~어디부터 볼까요?」 꼴) 이 있으면 교재의 「왜」 질문으로 쓴다
    const q = ((c.body || '').split('\n').find(l => /\?$/.test(l.trim())) || '').trim();
    out.push({ i: c.idx, t, ti: c.title, d: c.date || '', tp: topics, q, u: `${SITE}/${t}/${c.idx}-${slugifyTitle(c.title)}`, n: c.imageCount || 0 });
  }
}
out.sort((a, b) => (b.d || '').localeCompare(a.d || ''));

const stat = {};
for (const x of TOPICS) {
  const hit = out.filter(c => c.tp.includes(x.id));
  stat[x.id] = { name: x.name, total: hit.length, as: hit.filter(c => c.t === 'as').length, sigong: hit.filter(c => c.t === 'sigong').length, napum: hit.filter(c => c.t === 'napum').length };
}
const none = out.filter(c => !c.tp.length).length;

const js = `// 자동 생성 — scripts/build-cases.mjs. 손으로 고치지 말 것.\n// 출처: 홈페이지 공개 사례 (busungtk.website/cases). 생성 ${new Date().toISOString().slice(0, 10)}\n` +
  `window.CASES_TOPICS=${JSON.stringify(TOPICS.map(({ id, name }) => ({ id, name })))};\n` +
  `window.CASES_STAT=${JSON.stringify(stat)};\nwindow.CASES_UNSORTED=${none};\n` +
  `window.CASES=${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(ROOT, 'cases-data.js'), js);
console.log('사례', out.length, '건 · 주제 미분류', none, '건');
for (const [k, v] of Object.entries(stat)) console.log(k.padEnd(6), v.name.padEnd(12), '합', v.total, '· A/S', v.as, '· 시공', v.sigong, '· 납품', v.napum);
