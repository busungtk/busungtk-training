// 학습 단위 정본 — 편성기(planner)·기록 장치(tracker)·주간 보고(report)가 모두 이 목록을 본다.
// 분량(ko)은 각 페이지 본문의 한글 글자 수 실측(2026-10-11), 문제 수(q)는 그 구역의 문제 개수.
// practiceH 는 교재에 적힌 실습·수업 시간(시간 단위). 앱 단원은 직접 눌러 보는 실습 시간 추정.
// prio: 필수 / 권장 / 심화 — 시간이 모자라면 심화 → 권장 순서로 뺀다. 필수는 빼지 않는다.
// roles: tech = 현장 기술직, office = 사무직
// span: 여러 주에 걸친 단원(현장 OJT)의 주 수 — 편성기가 실습 시간을 그 주들에 나눠 놓는다
// topics: cases-data.js 주제 id — 그 단원에 실제 홈페이지 사례를 붙인다.
(function () {
  // 숙지 시간 계산 기준 (효율 학습 기준 문서와 같은 값)
  const RULE = {
    readCpm: 150,     // 공부하며 읽는 속도 (한글 글자/분). 소설 읽기의 절반 이하로 잡는다
    digest: 1.5,      // 읽은 시간 × 1.5 = 「왜」를 생각하고 헷갈림을 적는 시간까지
    perQuiz: 1.5,     // 문제 한 개 푸는 시간(분)
    reviewPerQuiz: 3, // 간격 복습 3회(다음날·3일·7일) × 1분
  };

  const U = [];
  const add = (o) => U.push(Object.assign({ q: 0, span: 1, practiceH: 0, prereq: [], topics: [], roles: ['tech', 'office'] }, o));

  // ── 입사 전·첫 주 (사무·기술 공통) ─────────────────────────────
  add({ id: 'rec:perf', page: 'recruiting.html', anchor: 'perf', week: 0, prio: '권장', ko: 807, title: '부성티케이는 이렇게 일해 왔습니다',
    why: '우리 고객 대부분은 한 번 거래로 끝나지 않고 설치 뒤에도 A/S·교체·새 매장으로 다시 찾아옵니다. 그 이유를 알아야 「이번 일만 끝내면 된다」가 아니라 「다음에 또 부를 회사」로 일하게 됩니다.' });
  add({ id: 'rec:contract', page: 'recruiting.html', anchor: 'contract', week: 0, prio: '필수', ko: 982, title: '계약 조건',
    why: '수습 기간·근무시간·임금 방식을 첫날 정확히 알아야 연장근무 신청이나 휴가를 쓸 때 헷갈리지 않습니다. 나중의 「몰랐다」가 가장 큰 오해의 씨앗입니다.' });
  add({ id: 'rec:culture', page: 'recruiting.html', anchor: 'welfare', week: 0, prio: '권장', ko: 633, title: '복지·사내문화',
    why: '어떤 지원을 받을 수 있는지 알아야 필요할 때 요청합니다.' });
  add({ id: 'on:week1', page: 'onboarding.html', anchor: 'week1', week: 1, prio: '필수', ko: 816, title: '첫 주에 이것부터',
    why: '첫 주에 계정·도구·인사를 끝내 두지 않으면 둘째 주부터 현장에 따라가도 기록을 남길 수가 없습니다.' });
  add({ id: 'on:company', page: 'onboarding.html', anchor: 'company', week: 1, prio: '필수', ko: 387, title: '부성티케이는 어떤 회사인가',
    why: '고객에게 「어느 회사에서 왔어요?」를 들었을 때 한 문장으로 설명할 수 있어야 합니다. 우리는 설비를 파는 회사가 아니라 고객 주방을 같이 운영하는 회사입니다.' });
  add({ id: 'on:docs', page: 'onboarding.html', anchor: 'docs', week: 1, prio: '필수', ko: 873, title: '문서 규칙',
    why: '견적서·완료보고가 사람마다 다르게 쓰이면 다음 사람이 찾지 못하고 홈페이지 사례로도 못 씁니다. 첫날부터 같은 규칙으로 써야 내 기록이 회사 자산이 됩니다.' });
  add({ id: 'on:process', page: 'onboarding.html', anchor: 'process', week: 1, prio: '필수', ko: 398, title: '경영지원 프로세스',
    why: '경비·서류가 정해진 길로 들어오지 않으면 정산이 늦어지고 내 돈도 늦게 돌아옵니다.' });
  add({ id: 'on:method', page: 'onboarding.html', anchor: 'method', week: 2, prio: '권장', ko: 1122, title: '일하는 방법 (기획 직군)', roles: ['office'],
    why: '사무직의 일은 눈에 안 보이기 쉽습니다. 정해진 방식으로 일을 쪼개고 남겨야 다른 사람이 이어받을 수 있습니다.' });
  add({ id: 'on:notion', page: 'onboarding.html', anchor: 'notion', week: 1, prio: '필수', ko: 327, title: '담당자에게 받을 자료',
    why: '회사 서류와 거래처 연락처는 이 사이트에 없습니다. 무엇을 누구에게 받고 어느 앱에서 보는지 알아야 매번 헤매지 않습니다.' });

  // ── 사내 앱·업무 도구 (apps.html) — ko 는 apps.html 단원별 실측. 포털 단원은 맨 앞 「일의 흐름」 절(321자)을 합친 값 ──
  add({ id: 'app:portal', page: 'apps.html', anchor: 'portal', week: 1, prio: '필수', ko: 595, practiceH: 0.2, title: '업무 포털 — 모든 앱의 입구',
    why: '앱 주소를 외울 필요가 없습니다. 포털 하나만 휴대폰 홈 화면에 두면 모든 앱으로 들어갑니다.' });
  add({ id: 'app:overtime', page: 'apps.html', anchor: 'overtime', week: 1, prio: '필수', ko: 1431, q: 3, practiceH: 0.7, title: '근태관리 — 연장근무·휴가·경비·급여명세서',
    why: '연장근무와 휴가는 이 앱에 신청해야 승인되고 급여에 반영됩니다. 말로만 하면 기록이 없어 수당도 연차도 계산되지 않습니다.' });
  add({ id: 'app:dispatch', page: 'apps.html', anchor: 'dispatch', week: 1, prio: '필수', ko: 1093, q: 2, practiceH: 0.5, title: '일정·배차 — 누가 언제 어느 차로',
    why: '차는 다섯 대이고 사람은 여럿입니다. 일정과 휴가가 배차판에 없으면 같은 차를 두 팀이 잡거나 쉬는 사람을 현장에 배정하게 됩니다.' });
  add({ id: 'app:daily', page: 'apps.html', anchor: 'daily', week: 1, prio: '필수', ko: 606, q: 1, practiceH: 0.3, title: '일일보고 — 오늘 한 일·해야 할 일',
    why: '현장 일은 끝나면 사라집니다. 그날 적어 두지 않으면 견적·세금계산서·A/S 이력 어디에도 남지 않습니다.' });
  add({ id: 'app:report', page: 'apps.html', anchor: 'report', week: 1, prio: '필수', ko: 728, q: 1, practiceH: 0.3, title: '채널톡 완료보고 — 내 사진이 홈페이지 사례가 된다', roles: ['tech'], topics: ['open'],
    why: '현장에서 올린 완료보고 사진과 내용이 그대로 홈페이지 사례가 됩니다. 사진이 흔들리거나 내용이 빠지면 사례로 쓸 수 없고 다음 고객이 볼 증거도 사라집니다.' });
  add({ id: 'app:visit', page: 'apps.html', anchor: 'visit', week: 2, prio: '필수', ko: 611, q: 0, practiceH: 0.3, title: '출입·내방 신청 — 보안 사업장에 들어가는 법',
    why: '대기업 사업장은 미리 신청하지 않으면 정문에서 못 들어갑니다. 신청이 늦으면 일정 전체가 밀리고 고객 앞에서 신뢰를 잃습니다.' });
  add({ id: 'app:asms', page: 'apps.html', anchor: 'asms', week: 2, prio: '필수', ko: 908, q: 2, practiceH: 1, title: 'ASMS — A/S 접수부터 세금계산서까지', topics: ['cold', 'heat'],
    why: '홈페이지 A/S 사례만 수백 건입니다. 접수·견적·방문·완료·세금계산서가 한 줄로 이어져야 빠진 수금이나 잊힌 고객이 생기지 않습니다.' });
  add({ id: 'app:order', page: 'apps.html', anchor: 'order', week: 3, prio: '권장', ko: 387, q: 0, practiceH: 0.3, title: '발주 추적 — 부품·장비가 언제 오나',
    why: '부품이 언제 도착하는지 알아야 고객에게 방문 날짜를 약속할 수 있습니다.' });
  add({ id: 'app:vehicle', page: 'apps.html', anchor: 'vehicle', week: 1, prio: '권장', ko: 213, q: 0, practiceH: 0.2, title: '차량 점검', roles: ['tech'],
    why: '현장 가는 길에 차가 서면 그날 일정이 전부 무너집니다. 출발 전 점검 기록이 그걸 막습니다.' });
  add({ id: 'app:crm', page: 'apps.html', anchor: 'crm', week: 2, prio: '필수', ko: 647, q: 1, practiceH: 0.8, title: 'CRM — 문의가 계약이 되기까지', roles: ['office'],
    why: '문의 하나를 놓치면 그 고객의 다음 매장까지 놓칩니다. 누가 언제 무슨 연락을 했는지 남아야 다음 사람이 이어받습니다.' });

  // ── Phase 1 입문 (1주차) ─────────────────────────────────────
  // 편성 변경: 안전(Day 2)을 기술 첫 단원으로 당긴다 — 공구·현장을 보기 전에 다쳐서는 안 된다
  add({ id: 'p1:day2', page: 'phase1_training.html', anchor: 'day2', week: 1, prio: '필수', ko: 890, q: 1, practiceH: 8, title: 'Day 2 · 안전이 제일', roles: ['tech'],
    why: '주방은 가스·전기·물·칼·뜨거운 기름이 한 공간에 있습니다. 무엇이 위험한지 모르고 들어가면 다치는 것은 나이고, 고객 영업도 멈춥니다. 그래서 모든 기술 교육보다 먼저 배웁니다.' });
  add({ id: 'p1:day1', page: 'phase1_training.html', anchor: 'day1', week: 1, prio: '필수', ko: 1078, practiceH: 8, title: 'Day 1 · 우리 회사 알아보기',
    why: '우리가 어떤 고객의 어떤 일을 하는지 알아야 현장에서 하는 작은 일 하나가 왜 중요한지 보입니다.' });
  add({ id: 'p1:day3', page: 'phase1_training.html', anchor: 'day3', week: 1, prio: '필수', ko: 2697, q: 1, practiceH: 8, title: 'Day 3 · 주방이라는 공간', topics: ['open'],
    why: '설비는 혼자 있지 않습니다. 동선·물·불·배기가 어떻게 이어지는지 알아야 장비 하나를 놓을 때도 「여기 놓으면 안 되는 이유」가 보입니다.' });
  add({ id: 'p1:day4', page: 'phase1_training.html', anchor: 'day4', week: 1, prio: '필수', ko: 1738, q: 1, practiceH: 8, title: 'Day 4 · 주방설비 한눈에 보기', prereq: ['p1:day3'], topics: ['cold', 'heat', 'wash'],
    why: '고객은 장비 이름을 정확히 말하지 않습니다. 「밥 하는 기계가 이상해요」를 듣고 무슨 장비인지 떠올려야 맞는 공구와 부품을 챙겨 갑니다.' });
  add({ id: 'p1:day5', page: 'phase1_training.html', anchor: 'day5', week: 1, prio: '필수', ko: 897, practiceH: 8, title: 'Day 5 · 주방설비는 어떻게 작동할까', prereq: ['p1:day4'], roles: ['tech'], topics: ['cold', 'heat'],
    why: '원리를 알면 처음 보는 장비도 「열을 만드는 곳·식히는 곳·제어하는 곳」으로 나눠 볼 수 있습니다. 고장 진단은 여기서 시작합니다.' });
  add({ id: 'p1:day6', page: 'phase1_training.html', anchor: 'day6', week: 1, prio: '필수', ko: 984, q: 1, practiceH: 8, title: 'Day 6 · 공구 사용법', prereq: ['p1:day2'], roles: ['tech'], topics: ['steel'],
    why: '공구를 잘못 쓰면 장비가 망가지고 사람이 다칩니다. 선배가 「그거 줘」 할 때 바로 건넬 수 있어야 현장에 따라갈 수 있습니다.' });
  add({ id: 'tech:c0', page: 'tech.html', anchor: '#/ch/0', week: 1, prio: '필수', ko: 892, q: 8, title: '기술 교재 0장 · 모든 현장에 공통인 원칙',
    why: '어느 현장이든 지키는 원칙이 있습니다. 첫 현장 동행 전에 읽어 두면 선배가 왜 그렇게 하는지 보입니다.' });
  add({ id: 'tech:c9', page: 'tech.html', anchor: '#/ch/9', week: 1, prio: '권장', ko: 724, q: 10, title: '부록 · 현장 용어집',
    why: '선배·고객·협력사가 쓰는 말을 못 알아들으면 지시를 놓칩니다. 처음 일주일 동안 틈틈이 봅니다.' });

  // ── Phase 2 설비 기초 (2~3주차) — 같은 주제의 기술 교재 장을 바로 붙여 읽는다 ──
  add({ id: 'p2:sec1', page: 'phase2_training.html', anchor: 'sec1', week: 2, prio: '필수', ko: 1532, q: 1, practiceH: 11, title: '냉동설비 설치 기초', prereq: ['p1:day5'], roles: ['tech'], topics: ['cold'],
    why: '홈페이지 사례에서 가장 많은 주제가 냉장·냉동입니다. 우리 일에서 가장 자주 만나는 장비라 가장 먼저 배웁니다.' });
  add({ id: 'tech:c1', page: 'tech.html', anchor: '#/ch/1', week: 2, prio: '필수', ko: 2199, q: 15, title: '기술 교재 1장 · 냉장·냉동', prereq: ['p2:sec1'], roles: ['tech'], topics: ['cold'],
    why: '설치 기초 다음에 실제 A/S 견적과 사례에서 뽑은 고장 패턴을 붙여 읽습니다. 원리 다음에 실제 고장을 보면 오래 기억에 남습니다.' });
  add({ id: 'p2:sec7', page: 'phase2_training.html', anchor: 'sec7', week: 2, prio: '필수', ko: 834, practiceH: 6, title: '가스 작업 안전', prereq: ['p1:day2'], roles: ['tech'], topics: ['heat'],
    why: '가열설비를 만지기 전에 가스부터 배웁니다. 가스는 실수 한 번이 사고입니다. 그래서 원래 마지막에 있던 이 단원을 가열설비 앞으로 당겼습니다.' });
  add({ id: 'p2:sec2', page: 'phase2_training.html', anchor: 'sec2', week: 2, prio: '필수', ko: 1488, q: 1, practiceH: 8, title: '조리·가열설비 기초', prereq: ['p2:sec7'], roles: ['tech'], topics: ['heat'],
    why: '구내식당은 솥·렌지·오븐이 멈추면 점심 배식이 멈춥니다. 냉장 다음으로 사례가 많은 주제입니다.' });
  add({ id: 'p2:sec6', page: 'phase2_training.html', anchor: 'sec6', week: 3, prio: '필수', ko: 786, practiceH: 6, title: '급수·배수 기초', prereq: ['p1:day3'], roles: ['tech'], topics: ['water'],
    why: '세척기·싱크·제빙기 고장의 상당수는 장비가 아니라 물 길이 원인입니다. 물이 어디서 와서 어디로 가는지 알아야 헛수리를 막습니다.' });
  add({ id: 'tech:c2', page: 'tech.html', anchor: '#/ch/2', week: 3, prio: '권장', ko: 1024, q: 9, title: '기술 교재 2장 · 배관·수전·배수', prereq: ['p2:sec6'], roles: ['tech'], topics: ['water'],
    why: '급배수 기초를 실제 견적에 나온 부품·작업과 연결합니다.' });
  add({ id: 'p2:sec3', page: 'phase2_training.html', anchor: 'sec3', week: 3, prio: '필수', ko: 1184, practiceH: 6, title: '전처리·세척설비', prereq: ['p2:sec6'], roles: ['tech'], topics: ['wash', 'prep'],
    why: '세척기는 물·전기·세제·열이 한꺼번에 얽힌 장비입니다. 급배수를 먼저 배운 뒤에 보면 훨씬 쉽게 이해됩니다.' });
  add({ id: 'p2:sec4', page: 'phase2_training.html', anchor: 'sec4', week: 3, prio: '권장', ko: 824, practiceH: 6, title: '후드와 환기', prereq: ['p1:day3'], roles: ['tech'], topics: ['hood'],
    why: '배기가 약하면 주방이 덥고 연기가 차서 일하는 사람이 버티지 못합니다. 시공 견적에 자주 들어가는 항목입니다.' });
  add({ id: 'p2:sec5', page: 'phase2_training.html', anchor: 'sec5', week: 3, prio: '필수', ko: 947, practiceH: 7, title: '전기 배선 실습', prereq: ['p1:day2'], roles: ['tech'], topics: ['elec'],
    why: '신입은 전기를 직접 고치는 사람이 아니라 「보고 알리는 사람」입니다. 무엇을 만지면 안 되는지 아는 것이 이 단원의 목표입니다.' });
  add({ id: 'p2:sec8', page: 'phase2_training.html', anchor: 'sec8', week: 3, prio: '필수', ko: 1602, q: 1, practiceH: 6, title: '고장진단 첫걸음', prereq: ['p2:sec1', 'p2:sec2'], roles: ['tech'], topics: ['cold', 'heat', 'wash'],
    why: '고객은 「안 돼요」만 말합니다. 묻는 순서·보는 순서가 정해져 있어야 헛걸음 없이 원인에 닿습니다. 2주 동안 배운 장비를 한 번에 묶어 씁니다.' });

  // ── Phase 3 현장 OJT (4~8주차) ───────────────────────────────
  add({ id: 'p3:sec1', page: 'phase3_training.html', anchor: 'sec1', week: 4, prio: '필수', ko: 1781, practiceH: 28, title: '4주차 · 선배와 함께하는 첫 현장', prereq: ['p2:sec8'], roles: ['tech'], topics: ['cold', 'heat'],
    why: '책으로 배운 것을 실제 고객 앞에서 확인하는 첫 주입니다. 보는 것이 일이지만, 본 것을 그날 적어야 내 것이 됩니다.' });
  add({ id: 'tech:c7', page: 'tech.html', anchor: '#/ch/7', week: 5, prio: '필수', ko: 1104, q: 12, title: '기술 교재 7장 · 시공·납품 설치', prereq: ['p3:sec1'], roles: ['tech'], topics: ['open'],
    why: '시공·납품은 한 번 설치하면 몇 년을 갑니다. 처음 잘못 놓으면 그 몇 년 내내 A/S로 돌아옵니다.' });
  add({ id: 'p3:sec2', page: 'phase3_training.html', anchor: 'sec2', week: 5, span: 2, prio: '필수', ko: 1882, practiceH: 56, title: '5~6주차 · 직접 해보는 보조 시공', prereq: ['p3:sec1'], roles: ['tech'], topics: ['open', 'steel'],
    why: '선배 옆에서 손을 보태며 순서를 몸에 익히는 단계입니다. 여기서 실수한 것을 헷갈림 기록에 남겨야 독립 단계에서 반복하지 않습니다.' });
  add({ id: 'tech:c3', page: 'tech.html', anchor: '#/ch/3', week: 6, prio: '권장', ko: 893, q: 8, title: '기술 교재 3장 · 세척기·퇴식 컨베이어', prereq: ['p2:sec3'], roles: ['tech'], topics: ['wash'],
    why: '구내식당 세척 라인은 멈추면 식기가 쌓여 배식이 멈춥니다.' });
  add({ id: 'tech:c6', page: 'tech.html', anchor: '#/ch/6', week: 7, prio: '권장', ko: 958, q: 8, title: '기술 교재 6장 · 기물·용접·바퀴', prereq: ['p1:day6'], roles: ['tech'], topics: ['steel'],
    why: '작업대·선반·바퀴는 사소해 보여도 사례 수가 많습니다. 가장 자주 손대는 일입니다.' });
  add({ id: 'p3:sec3', page: 'phase3_training.html', anchor: 'sec3', week: 7, span: 2, prio: '필수', ko: 2185, q: 1, practiceH: 61, title: '7~8주차 · 독립 시공 도전', prereq: ['p3:sec2'], roles: ['tech'], topics: ['open'],
    why: '혼자 맡아 보며 무엇이 아직 비어 있는지 확인하는 단계입니다. 부족한 것을 찾는 것이 이 단계의 목표입니다.' });

  // ── Phase 4 심화·수료 (9~12주차) ─────────────────────────────
  add({ id: 'tech:c5', page: 'tech.html', anchor: '#/ch/5', week: 9, prio: '권장', ko: 1072, q: 9, title: '기술 교재 5장 · 가스 화구·스팀솥', prereq: ['p2:sec7'], roles: ['tech'], topics: ['heat'],
    why: '가스 안전을 배운 뒤 실제 가스 장비 고장을 봅니다.' });
  add({ id: 'tech:c8', page: 'tech.html', anchor: '#/ch/8', week: 9, prio: '권장', ko: 514, q: 6, title: '기술 교재 8장 · 전기', prereq: ['p2:sec5'], roles: ['tech'], topics: ['elec'],
    why: '전기 고장은 「보고 알리는」 것이 신입의 일입니다. 무엇을 보고 무엇을 알릴지 정리합니다.' });
  add({ id: 'p4:section1', page: 'phase4_training.html', anchor: 'section1', week: 9, span: 2, prio: '심화', ko: 2796, q: 2, practiceH: 64, title: '주방설비 고장의 원리', prereq: ['p3:sec3'], roles: ['tech'], topics: ['cold', 'heat', 'elec'],
    why: '여기서부터는 「시킨 대로」가 아니라 「왜 고장 났는지」를 스스로 설명하는 단계입니다.' });
  add({ id: 'tech:c4', page: 'tech.html', anchor: '#/ch/4', week: 10, prio: '심화', ko: 1061, q: 9, title: '기술 교재 4장 · 온장·보온·소독', prereq: ['p2:sec2'], roles: ['tech'], topics: ['warm'],
    why: '배식대·온장고는 급식 현장의 기본 장비입니다.' });
  add({ id: 'p4:section2', page: 'phase4_training.html', anchor: 'section2', week: 11, prio: '심화', ko: 1266, practiceH: 48, title: '현장을 이끄는 기술', prereq: ['p4:section1'], roles: ['tech'],
    why: '고객과 협력사 사이에서 현장을 정리하는 사람이 되는 단계입니다.' });
  add({ id: 'p4:section3', page: 'phase4_training.html', anchor: 'section3', week: 12, prio: '필수', ko: 1447, q: 1, practiceH: 24, title: '종합 평가 + 수료', prereq: ['p3:sec3'], roles: ['tech'],
    why: '12주 동안 쌓은 것을 확인하고, 남은 빈 곳을 다음 분기 목표로 넘깁니다.' });

  // ── 냉동 참고 자료 (refs.html) — 회사 원드라이브 「교육자료」 폴더의 슬라이드 PDF·엑셀. 2026-10-11 전 쪽 확인
  // studyMin = 쪽마다 그림·회로 밀도를 보고 정한 공부 시간(분). 개정판이 있는 옛 판 2개·건물 공조 카탈로그 1개는 넣지 않았다
  var R = function (o) { add(Object.assign({ page: 'refs.html', ko: 0, roles: ['tech'], topics: ['cold'] }, o)); };
  R({ id: 'ref:basic', anchor: 'basic', week: 2, prio: '필수', studyMin: 15, q: 1, prereq: ['p1:day5'], title: '참고 · 냉동 장비 기초 교육',
    why: '압축기·응축기·팽창밸브·증발기 네 부품과 냉매가 도는 순서를 처음으로 한 장에 정리하는 자료입니다. 이 순서를 모르면 뒤의 모든 냉동 자료가 읽히지 않습니다.' });
  R({ id: 'ref:cycle', anchor: 'cycle', week: 2, prio: '필수', studyMin: 40, prereq: ['ref:basic'], title: '참고 · 표준냉동장치 구성',
    why: '수액기·필터드라이어·사이트글라스·팽창밸브가 사이클의 어디에 붙는지 그림으로 봅니다. 현장에서 배관을 따라가며 「이게 왜 여기 있나」를 설명할 수 있게 됩니다.' });
  R({ id: 'ref:panel', anchor: 'panel', week: 3, prio: '권장', studyMin: 30, prereq: ['p1:day2'], topics: ['elec'], title: '참고 · 제어반 전기부품 (차단기·릴레이·스위치)',
    why: '제어반을 열었을 때 차단기·릴레이·표시등을 알아봐야, 고장을 「보고 알릴」 때 무엇이 어떻게 됐는지 정확히 말할 수 있습니다.' });
  R({ id: 'ref:tc', anchor: 'tc', week: 3, prio: '필수', studyMin: 45, prereq: ['ref:cycle'], title: '참고 · 온도조절기',
    why: '「안 시원해요」·「너무 얼어요」 신고의 상당수가 설정·편차·보정값 문제입니다. 자료 가운데 A/S 현장과 가장 가깝습니다.' });
  R({ id: 'ref:lps', anchor: 'lps', week: 3, prio: '권장', studyMin: 35, q: 1, prereq: ['ref:tc'], title: '참고 · 저압스위치(LPS) 제어',
    why: '온도가 맞았는데 압축기가 잠시 더 도는 이유, 저압이 낮아 멈추는 이유를 알면 정상 동작을 고장으로 오해하지 않습니다.' });
  R({ id: 'ref:hps', anchor: 'hps', week: 3, prio: '권장', studyMin: 35, q: 1, prereq: ['ref:tc'], title: '참고 · 고압스위치(HPS) 제어',
    why: '고압 정지가 걸렸을 때 리셋부터 누르면 같은 고장이 반복됩니다. 리셋 전에 원인을 먼저 보는 순서를 배웁니다.' });
  R({ id: 'ref:diag', anchor: 'diag', week: 3, prio: '필수', studyMin: 40, prereq: ['ref:cycle'], title: '참고 · 냉동장비 고장진단 및 대처방법',
    why: '고압·저압·과열도 숫자를 보고 원인 후보를 좁히는 법이 들어 있습니다. 고장진단 첫걸음 단원과 같은 주에 붙여 읽습니다.' });
  R({ id: 'ref:comp', anchor: 'comp', week: 4, prio: '권장', studyMin: 22, q: 1, prereq: ['ref:diag'], title: '참고 · 압축기 교체 때 부품도 같이 바꾸는 이유',
    why: '「압축기만 갈면 또 고장 난다」를 그림으로 설명합니다. 고객에게 필터·오일까지 왜 필요한지 설명할 근거가 됩니다.' });
  R({ id: 'ref:maint', anchor: 'maint', week: 4, prio: '권장', studyMin: 20, prereq: ['ref:diag'], title: '참고 · 압축기 관리와 부품 교체 주기',
    why: '오일·필터·전자접촉기를 언제 바꾸는지 기준이 있습니다. 정기 점검 때 무엇을 볼지 체크표를 만들 수 있습니다.' });
  R({ id: 'ref:drawing', anchor: 'drawing', week: 4, prio: '권장', studyMin: 10, prereq: ['ref:tc'], topics: ['cold', 'elec'], title: '참고 · 워크인 냉동고 제어반 회로도 (실물 도면)',
    why: '자료 가운데 우리 현장 장비에 가장 가까운 실제 도면입니다. 앞에서 배운 스위치·릴레이를 실물 도면에서 찾아봅니다.' });
  R({ id: 'ref:ctrl', anchor: 'ctrl', week: 9, prio: '심화', studyMin: 35, prereq: ['ref:lps', 'ref:hps'], topics: ['cold', 'elec'], title: '참고 · 냉동 장치 제어 회로 (종합)',
    why: '펌프다운 방식 제어회로 전체를 읽습니다. 고장 원리를 스스로 설명하는 심화 단계에서 봅니다.' });
  R({ id: 'ref:compin', anchor: 'compin', week: 9, prio: '심화', studyMin: 20, prereq: ['ref:comp'], title: '참고 · 압축기 분해 조립과 이상 사례',
    why: '압축기 안쪽 부품 이름과 손상 모양, 실제 이상 사례의 점검 순서를 봅니다.' });
  R({ id: 'ref:load', anchor: 'load', week: 10, prio: '심화', studyMin: 45, prereq: ['ref:cycle'], title: '참고 · 냉장·냉동실 부하계산 엑셀',
    why: '창고 크기·단열·물건에 따라 냉동기 용량이 왜 달라지는지 숫자로 봅니다. 장비 크기를 고르는 이유를 이해하는 심화 자료입니다.' });

  // ── 주차별 학습 목표 — 주간 보고의 「이번 주 목표」 기준. goal = 주말에 할 수 있어야 하는 것, check = 사수가 확인하는 방법
  const WEEKS = {
    tech: [
      { wk: 1, goal: '다치지 않는 법과 회사의 일 흐름을 설명하고, 매일 쓰는 앱 다섯 개에 혼자 들어가 기록할 수 있다', check: '안전 문제 전부 정답 · 근태관리 로그인 · 일일보고 1회 제출 · 배차판에서 내 일정 찾기' },
      { wk: 2, goal: '냉장·냉동과 가열설비가 어떻게 돌아가는지 그림 없이 말로 설명하고, 가스 작업 전 확인할 것을 순서대로 말할 수 있다', check: '기술 교재 1장 문제 80% 이상 · 사수 앞에서 냉동 사이클 설명 · 출입신청 질문 4개 답 받기' },
      { wk: 3, goal: '물 길·전기·세척기·배기의 기본을 알고, 고객의 「안 돼요」를 들었을 때 묻는 순서와 보는 순서를 쓸 수 있다', check: '고장진단 문제 정답 · 실제 사례 하나를 골라 진단 순서를 헷갈림 기록에 적기' },
      { wk: 4, goal: '선배 현장에 동행해 본 것을 그날 완료보고와 일일보고로 남길 수 있다', check: '동행한 날마다 일일보고 제출 · 사진 전·중·완료 구분이 맞는 완료보고 1건' },
      { wk: 5, goal: '보조 시공에서 다음에 무엇이 필요한지 말하기 전에 건넬 수 있다', check: '시공·납품 설치 교재 문제 80% 이상 · 사수 평가 「일부」 이상' },
      { wk: 6, goal: '보조 시공 순서를 혼자 적어 볼 수 있고, 내가 한 실수를 기록으로 남겼다', check: '그 주 헷갈림 기록 3건 이상과 사수 답 · 세척 라인 교재 문제' },
      { wk: 7, goal: '작은 작업 하나를 혼자 맡아 시작부터 완료보고까지 끝낼 수 있다', check: '단독 작업 1건 완료보고 · ASMS 작업완료 처리에 내 이름' },
      { wk: 8, goal: '혼자 하면서 비어 있던 것을 목록으로 만들고 다음 달 목표로 옮겼다', check: '빈 곳 목록을 주간 보고에 첨부 · 사수 피드백' },
      { wk: 9, goal: '고장이 왜 났는지 원인을 스스로 설명할 수 있다 (시킨 대로가 아니라)', check: '고장 원리 문제 · 실제 A/S 사례 2건의 원인 설명' },
      { wk: 10, goal: '가스·전기·보온 장비의 고장을 보고 무엇을 알려야 하는지 정리할 수 있다', check: '가스·전기·보온 교재 문제 80% 이상' },
      { wk: 11, goal: '고객·협력사 사이에서 현장 하루를 정리하는 순서를 설명할 수 있다', check: '사수와 함께 현장 하루 일정 짜 보기' },
      { wk: 12, goal: '12주 동안 남은 빈 곳을 알고, 다음 분기 목표를 스스로 정했다', check: '종합 평가 · 수료 면담' },
    ],
    office: [
      { wk: 1, goal: '회사의 일이 어떤 앱을 거쳐 흘러가는지 설명하고, 매일 쓰는 앱에 혼자 기록할 수 있다', check: '근태관리 로그인 · 일일보고 1회 제출 · 일의 흐름을 말로 설명' },
      { wk: 2, goal: '문의 한 건을 CRM에 등록하고 첫 연락 기한을 지켜 기록할 수 있다', check: 'CRM 문제 정답 · 사수와 문의 등록 실습 · ASMS 상태 흐름 설명' },
      { wk: 3, goal: '발주와 견적서가 A/S·시공 흐름의 어디에 들어가는지 알고 빠진 칸을 찾아낼 수 있다', check: '지난주 A/S 한 건을 접수부터 계산서까지 따라가며 빠진 것 찾기' },
    ],
  };

  // studyMin 이 있으면(슬라이드 PDF·엑셀처럼 글자 수로 못 재는 자료) 쪽마다 보고 정한 추정값을 쓴다
  function theoryMin(u) {
    if (u.studyMin) return Math.round(u.studyMin + u.q * (RULE.perQuiz + RULE.reviewPerQuiz));
    return Math.round((u.ko / RULE.readCpm) * RULE.digest + u.q * (RULE.perQuiz + RULE.reviewPerQuiz));
  }
  function totalMin(u) { return theoryMin(u) + Math.round(u.practiceH * 60); }

  window.CURRICULUM = { RULE, UNITS: U, WEEKS, theoryMin, totalMin, byId: Object.fromEntries(U.map(u => [u.id, u])) };
})();
