// 2027학년도 유치원 모집요강에서 사람이 읽고 옮긴 값 (2026-10-26 확인)
// - 값마다 출처 키(src)를 단다. 출처는 sources 에 게시일·URL과 함께 둔다.
// - 요강에 없는 값은 넣지 않는다(문서에서 '미확인'으로 표시). 0·없음으로 채우지 않는다.
// - 요강 원문 파일: data/raw/notices/<유치원>/ (공개 저장소 제외)
// - 반 이름: 요강의 '3세반'은 만 나이 기준(2023년생). 옛 세는나이 '5세반'과 다르다.

export const CHECKED_AT = '2026-10-28';
export const SCHOOL_YEAR = 2027;

/** 충남 공통 일정 (요강 8곳에서 같은 값 확인) */
export const COMMON_SCHEDULE = [
  { step: '모집요강 조회·찜하기 (유보통합포털)', when: '2026-10-28(수) 09:00부터' },
  { step: '우선모집 접수', when: '2026-11-02(월) 09:00 ~ 11-04(수) 18:00', note: '첫날 10시 이후 접수 권고, 마감 후 무작위 추첨(선착순 아님)' },
  { step: '우선모집 발표', when: '2026-11-09(월) 15:00' },
  { step: '우선모집 등록', when: '2026-11-10(화) 09:00 ~ 11-11(수) 18:00', note: '1곳만 등록, 등록하면 일반모집 지원 불가' },
  { step: '일반모집 접수', when: '2026-11-17(화) 09:00 ~ 11-23(월) 18:00' },
  { step: '일반모집 발표', when: '2026-11-26(목) 15:00' },
  { step: '일반모집 등록', when: '2026-11-27(금) 09:00 ~ 11-30(월) 18:00' },
  { step: '대기자 관리', when: '2026-12-01 ~ 12-31', note: '대기번호 12월 31일까지 유효' },
  { step: '추가모집', when: '2026-12-01 ~ 2027-02-12' },
];
export const COMMON_RULES = [
  '국·공·사립 관계없이 최대 3곳, 희망 순서대로 지원 (재학 중인 유치원에 계속 다닐 아이는 2곳)',
  '우선모집 조건이 2개 이상이면 1가지만 골라 지원',
  '온라인 접수에 보호자 명의 인증서·휴대전화 필요',
  '증빙서류는 제출일로부터 3개월 이내 발급분',
  '다자녀(충남 조례): 18세 미만 자녀 2명 이상 + 충청남도 주소',
];
export const TWINS_COMMON = '쌍생아는 각각 접수하거나 하나의 군(묶음)으로 접수 중 보호자가 선택. 군으로 접수하면 연속 번호로 추첨하지만 한 명만 선발될 수 있음 (우선모집은 선발/미선발, 일반모집은 대기 번호)';

const 우선공통 = '최우선: 본원 재학 유아·교육지원청 배치 특수교육대상자 / 1순위 법정저소득층(모집인원 내 100%) / 2순위 국가보훈대상자 / 3순위 북한이탈주민';

export const KINDER = {
  배방유치원: {
    sources: {
      yogang: { title: '2027학년도 배방유치원 유아모집 요강 (PDF)', posted: '2026-10-21', url: 'http://baebang.cnekids.kr' },
      leaflet: { title: '2027 배방유치원 유아모집 안내자료 (PDF)', posted: '2026-10-23', url: 'http://baebang.cnekids.kr' },
    },
    recruit: [
      { age: '3세반', birth: '2023년생', classes: 2, capacity: 28, staying: '(특수 1)', recruit: 27, src: 'yogang' },
      { age: '4세반', birth: '2022년생', classes: 2, capacity: 36, staying: '28 (특수 3)', recruit: 8, src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: 2, capacity: 40, staying: '36 (특수 4)', recruit: 4, src: 'yogang' },
    ],
    priority3: [우선공통, '4순위 본원 재학 유아의 형제·자매 10%', '5순위 다자녀(3자녀 이상) 20%', '6순위 60%: 건강취약·다자녀(쌍생아, 2자녀)·사회적 배려·다문화·장애부모·통학차량 미이용'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정 08:40~12:40 + 방과후 12:40~16:40', src: 'leaflet' },
    care: { value: '아침 07:40~08:40 · 저녁 16:40~18:40 (요강: 1일 11~12시간), 저소득·맞벌이·한부모·보호자 취업준비 가정 우선, 보호자 부담 0원', src: 'leaflet' },
    bus: { value: '45인승 1대. 1코스 금호어울림 101동·꿈비채(월천지구 정류장)·롯데캐슬 정문·더샵센트로·자이2차 건너편(800마트)·푸르지오1차 103동 / 2코스 중앙하이츠1차 105동·푸르지오2차 정문·한성필하우스5차 정문. 한라비발디·메이루즈·한양수자인·한도·삼정그린코아(도보권)는 미운행. 정원 초과 시 원거리 유아 우선', src: 'yogang' },
    cost: { value: '방과후·온종일 돌봄 보호자 부담금 0원 (안내자료). 요강은 "유치원알리미 확인"', src: 'leaflet' },
    program: { value: '놀이중심 교육과정, 숲체험·밧줄놀이·흙놀이·텃밭 등 생태교육, 독서교육, 디지털 기반 교육(AI놀이터), 방과후 특성화(영어·체육·음악·뮤지컬 등), 찾아오는 체험 연 12회·현장체험 연 8회 (빈도는 안내자료 표기)', src: 'leaflet' },
    calendar: { value: '2027 학사일정(예정): 입학식 3/2, 여름방학 7/20~7/23(4일), 겨울방학 1/24~1/25 및 2/21~2/29', src: 'leaflet' },
    events: [],
    notes: ['현장 접수 가능(교차 접수 가능)'],
  },
  아산세교유치원: {
    sources: {
      yogang: { title: '2027학년도 유치원 유아모집 요강 (10.26. 17시 기준, HWP)', posted: '2026-10-26', url: 'http://assgk.cnekids.kr' },
      intro: { title: '2027학년도 아산세교유치원 교육과정 운영 안내 (PDF)', posted: '2026-10-20', url: 'http://assgk.cnekids.kr' },
    },
    classNames: { value: '3세 신나는반(정원 14) · 4세 즐거운반(18) · 5세 행복한반(20)', src: 'intro' },
    recruit: [
      { age: '3세반', birth: '2023년생', classes: 5, capacity: 70, staying: '(특수 2)', recruit: 68, src: 'yogang' },
      { age: '4세반', birth: '2022년생', classes: 4, capacity: 72, staying: '70 (특수 2)', recruit: 2, src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: 5, capacity: 100, staying: '72 (특수 1)', recruit: 28, src: 'yogang' },
    ],
    priority3: [우선공통, '4순위 다자녀(3자녀 이상) 7%', '5순위 40%: 다자녀(2자녀 이상)·쌍생아·본원 재학 유아 형제·장애부모·다문화·사회적 배려', '6순위 40%: 아산시 배방읍 세교리 주소지 유아'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정 08:40~12:40 + 방과후 12:40~16:40', src: 'intro' },
    care: { value: '아침 07:40~08:40 · 저녁 16:40~19:40, 입학 확정 유아 중 맞벌이·취업 중 한부모 가정, 과원 시 추첨 가능, 신청은 추후 안내', src: 'yogang' },
    bus: { value: '없음', src: 'yogang' },
    cost: { value: '수익자 부담금 없음', src: 'yogang' },
    program: { value: '독서교육(주 1회 지혜놀이터 등), 디지로그 놀이(언플러그드·코딩 로봇), 방과후 특성화(외부강사: 체육·음악·영어 등, 2026 기준)', src: 'intro' },
    events: [{ what: '유치원 교육과정 설명회', when: '2026-12-03(목) 13:30 예정', src: 'yogang' }],
    notes: ['현장 접수: 2층 교무실, 접수 기간 중 13:00~16:40', '요강을 10.26. 17시에 수정해 다시 게시함 → 최종본 확인 필요'],
  },
  아산월천유치원: {
    sources: {
      yogang: { title: '2027학년도 유아모집 요강 (HWP)', posted: '2026-10-26', url: 'http://aswc.cnekids.kr' },
      leaflet: { title: '2027 유치원 유아모집 안내자료 (PDF)', posted: '2026-10-26', url: 'http://aswc.cnekids.kr' },
    },
    recruit: [
      { age: '3세반', birth: '2023년생', classes: '2 (특수 1)', capacity: '13 (특수 2)', staying: '2 (특수 2)', recruit: '11 (특수 2)', src: 'yogang' },
      { age: '4세반', birth: '2022년생', classes: '4 (특수 2)', capacity: '30 (특수 6)', staying: '14 (특수 6)', recruit: '16 (특수 6)', src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: '4 (특수 2)', capacity: '34 (특수 6)', staying: '30 (특수 6)', recruit: '4 (특수 6)', src: 'yogang' },
    ],
    priority3: [우선공통 + ' (2·3순위 각 20%)', '4순위 다자녀(3자녀 이상) 20%', '5순위 30%: 쌍생아·다자녀(2자녀)·건강취약·재원 유아 형제·사회적 배려·다문화·장애부모·보호자 동행 도보 등하원(차량 미이용)'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정 08:40~12:40 + 방과후 12:40~16:40', src: 'leaflet' },
    care: { value: '아침 07:40~08:40 · 저녁 16:40~18:40, 맞벌이·한부모(취업)·법정저소득 자녀', src: 'yogang' },
    bus: { value: '1코스 금호어울림·한라비발디·중앙하이츠1차·푸르지오2차·한성필5차·배방자이2차 / 2코스 배방자이1차·롯데캐슬·더샵', src: 'yogang' },
    cost: { value: '"유치원알리미 확인"', src: 'yogang' },
    program: { value: '특수교육대상 유아와 일반 유아가 같은 교실에서 생활하는 완전통합유치원. 놀이중심·독서·문화예술·디지털·생태환경 교육, 특성화(체육·영어·미술·한글·수·블럭) — 안내자료는 2026학년도 기준', src: 'leaflet' },
    events: [{ what: '유치원 교육과정 설명회', when: '2026-12-22(화) 13:30 예정', src: 'yogang' }],
    notes: ['현장 접수 16:30 마감', '별도 시설 개방 없음 — 입학 확정 후 설명회 때 개방 (안내자료)'],
  },
  한들물빛유치원: {
    sources: { yogang: { title: '2027학년도 한들물빛유치원 유아모집 요강(우선모집) (HWP·PDF)', posted: '2026-10-26', url: 'http://hmk.cnekids.kr' } },
    recruit: [
      { age: '3세', birth: '2023년생', classes: 4, capacity: 56, staying: '0', recruit: 56, src: 'yogang' },
      { age: '4세', birth: '2022년생', classes: 4, capacity: 72, staying: '57 (특수 2)', recruit: 15, src: 'yogang' },
      { age: '5세', birth: '2021년생', classes: 4, capacity: 80, staying: '71 (특수 2)', recruit: 9, src: 'yogang' },
    ],
    priority3: [우선공통, '4순위 다자녀(3자녀 이상) 7%', '5순위 33%: 다자녀(2자녀 이상)·쌍생아·본원 재학 유아 형제·장애부모·다문화', '6순위 40%: 한들물빛도시 거주(주소에 "한들"·"한들물빛")하며 통학차량 미이용 — 합격 시 졸업까지 차량 이용 불가'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정+방과후 09:00~17:00 (보호자 동의 시 2시간 이내 조기 귀가 가능, 2026 기준)', src: 'yogang' },
    care: { value: '온종일 돌봄 08:00~19:30, 법정저소득·취업 한부모·맞벌이, 입학 확정 후 안내 (2026 기준)', src: 'yogang' },
    bus: { value: '45인승 1대(정원 초과 시 조정·추첨). 1코스 지웰시티센트럴푸르지오(102동·201동·2·3단지 사이·302동)·하늘채 210동 / 2코스 예미지 101동·시티프라디움 101동·111동·예미지 105동·하늘채 210동', src: 'yogang' },
    cost: { value: '"유치원알리미 확인"', src: 'yogang' },
    events: [{ what: '유치원 교육과정 설명회 (선발 유아 보호자 대상)', when: '2026-12-09(수) 14:00, 3층 강당', src: 'yogang' }],
    notes: ['현장 접수 10:00~16:30, 2층 교무실'],
  },
  아산공수초등학교병설유치원: {
    sources: {
      yogang: { title: '2027 아산공수초등학교병설유치원 유아모집(우선모집) 요강 (PDF)', posted: '2026-10-23', url: 'http://asangongsucho.cnees.kr' },
      open: { title: '2027학년도 공개의 날 운영 안내', posted: '2026-10-02', url: 'http://asangongsucho.cnees.kr' },
    },
    recruit: [
      { age: '3세반', birth: '2023년생', classes: 1, capacity: 14, staying: '(1)', recruit: 13, src: 'yogang' },
      { age: '4세반', birth: '2022년생', classes: 1, capacity: 18, staying: '14', recruit: 4, src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: 2, capacity: 40, staying: '18 (2)', recruit: 22, src: 'yogang' },
    ],
    priority3: [우선공통 + ' (2·3순위 각 5%)', '4순위 50%(7명): 다자녀(3자녀 이상)·본교·본원 재학생 형제·도보 등하원(졸업까지 차량 미이용)·아산공수초 학구 내 유아·사회적 배려', '5순위 20%(3명): 다자녀(2자녀 이상)·쌍생아·다문화·장애부모'],
    twins: '요강 본문의 쌍생아 접수 방식은 이 문서에서 옮기지 못함 — 원문 확인',
    hours: { value: '교육과정+방과후 08:40~16:40', src: 'yogang' },
    care: { value: '저녁돌봄 16:40~18:40, 입학 확정 유아 중 맞벌이, 추후 신청', src: 'yogang' },
    bus: { value: '2027 승하차 장소·시간은 선발 후 안내. 2026 기준: 푸르지오2차(우방 Mom’s Station 앞)·한성1(2차 앞)·한성3차·한성5차·효성', src: 'yogang' },
    cost: { value: '별도의 학부모 부담금 없음', src: 'yogang' },
    events: [{ what: '유치원 공개의 날', when: '2026-10-23(금) 14:00~15:30 (지남)', src: 'open' }, { what: '교육과정 설명회 (입학 확정 유아 보호자)', when: '추후 문자 안내', src: 'yogang' }],
    notes: ['서류 온라인 간편제출 11월 6일(금) 18:00까지', '현장 접수 15:00까지(방문 전 전화)'],
  },
  탕정미래초등학교병설유치원: {
    sources: { yogang: { title: '2027학년도 유아모집 요강(최종) (PDF)', posted: '2026-10-15', url: 'http://tjmirae.cnees.kr' } },
    recruit: [
      { age: '3세반', birth: '2023년생', classes: 1, capacity: 14, staying: '0 (특수 1)', recruit: 13, src: 'yogang' },
      { age: '4세반', birth: '2022년생', classes: 1, capacity: 18, staying: '14', recruit: 4, src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: 1, capacity: 20, staying: '18 (특수 3)', recruit: 2, src: 'yogang' },
    ],
    priority3: [우선공통 + ' (2·3순위 각 3%)', '4순위 40%: 다자녀(3자녀 이상)·2027 본원 재학 유아 형제·건강취약·사회적 배려', '5순위 40%: 다자녀(2자녀)·다문화·장애부모 (쌍생아 별도 표기 없음)'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정+방과후 08:40~16:40', src: 'yogang' },
    care: { value: '저녁돌봄 16:40~18:40', src: 'yogang' },
    bus: { value: '미운행', src: 'yogang' },
    cost: { value: '전액 무상교육', src: 'yogang' },
    events: [],
    notes: ['서류 직접 제출은 11월 6일(금) 16:00 도착분까지'],
  },
  금곡초등학교병설유치원: {
    sources: { yogang: { title: '2027학년도 유치원 유아 모집요강 (HWP)', posted: '2026-10-19', url: 'http://www.keumgok.cnees.kr' } },
    recruit: [{ age: '3~5세 혼합반', birth: '2021~2023년생', classes: 2, capacity: 14, staying: '1', recruit: 13, src: 'yogang' }],
    priority3: [우선공통 + ' (2·3순위 모집인원 내 100%)', '4순위 다자녀(3자녀 이상) 20%', '5순위 이하 70%: 다자녀(2자녀)·건강취약·쌍생아·재원 유아 형제·사회적 배려·다문화·장애부모 등'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정+방과후 08:30~16:30', src: 'yogang' },
    bus: { value: '등원: 배방자이1차 후문(103~104동)→푸르지오2차 정문→초원아파트(1·2차) 206동→유치원 / 하원은 역순', src: 'yogang' },
    cost: { value: '별도의 학부모 부담금 없음', src: 'yogang' },
    events: [],
    notes: ['혼합연령반 — 2023년생이 함께 지내는 연령 구성은 원에 확인', '현장 접수 16:00까지'],
  },
  일심유치원: {
    sources: { page: { title: '홈페이지 「모집요강」 화면 (2027년도 원아모집요강)', posted: null, url: 'https://ilsim.kidsnote.ac/home/admission' } },
    classNames: { value: '2023년(3세) 밝은햇살반·어린새싹반·푸른잎새반 / 2022년(4세) 예쁜꽃잎반·알찬열매반 / 2021년(5세) 흙내음반·솔내음반', src: 'page' },
    recruit: [
      { age: '3세', birth: '2023년생', classes: 3, capacity: 45, staying: null, recruit: 45, src: 'page' },
      { age: '4세', birth: '2022년생', classes: 2, capacity: 44, staying: null, recruit: 16, src: 'page' },
      { age: '5세', birth: '2021년생', classes: 2, capacity: 50, staying: null, recruit: 20, src: 'page' },
    ],
    priority3: ['우선모집 90% · 일반모집 10%', 우선공통 + ' (2·3순위 최소 3%)', '4순위(3·4세) 본원 재학생 동생 10%', '5순위(3·4세) 다자녀(3자녀 이상) 5%', '6순위(3·4세) 30%: 쌍생아·형제자매 동시입학·다문화·외국국적'],
    twins: '쌍생아·형제자매 동시입학이 6순위에 포함 (접수 방식은 유보통합포털 요강 확인)',
    hours: { value: '평일 07:30~19:30 (온종일 돌봄유치원, 아침죽·급식·오후간식·저녁간식)', src: 'page' },
    bus: { value: '자이1·2차, 롯데캐슬, 더샵센트로, 중앙1~3차, 꿈비채, 한성필리버시티, 연화마을7·8단지, 탕정지웰1~3단지, 탕정시티프라디움, 예미지, 탕정하늘채, 별하신도시하늘채, 엘리프, 금강펜테리움, 로제비앙, 힐스테이트자이아산센텀, 탕정e편한세상, 한성1~6차, 푸르지오1·2차, 삼정그린코아, 우방아이유쉘1·2차, 북수리·풍세 한양수자인, 탕정더샵인피니티시티2차, 탕정푸르지오리버파크', src: 'page' },
    cost: { value: '특성화비 월 40,000원 외 일체 비용 없음(가방·현장학습비·교통비 등) — 홈페이지 표기', src: 'page' },
    events: [],
    notes: ['홈페이지의 모집대상 출생일 표기("2023년 1월 1일 ~ 2022년 12월 31일" 등)는 오기로 보임 → 반 구성표 기준 2023년생=3세. 전화 확인 권장', '방과후반은 맞벌이 아닌 유아도 지원 가능, 서류는 주민등록등본 (홈페이지 표기)'],
  },
  삼성샛별유치원: {
    sources: { seminar: { title: '<2027학년도 유치원 입학설명회 신청> (입학안내 게시판)', posted: '2026-10-06', url: 'https://samsungkid.kidsnote.ac' } },
    events: [{ what: '2027학년도 입학설명회 (유아모집·교육활동 안내, 교실 참관, 입학상담)', when: '2026-10-28(수) 17:30~, 3층 강당 — 신청 10/6~10/23 구글 폼(마감)', src: 'seminar' }],
    notes: ['2027 모집요강은 홈페이지에 아직 없음(10/28 확인) — 유보통합포털(enter.childinfo.go.kr) 요강 조회에서 확인 필요(이 환경에서는 포털 접속 차단)'],
  },
  이순신초등학교병설유치원: {
    sources: { yogang: { title: '2027학년도 이순신초등학교병설유치원 유아모집 요강 (PDF)', posted: '2026-10-27', url: 'http://yisunsin.cnees.kr/boardCnts/view.do?boardID=256961&boardSeq=45260965&lev=0&s=yisunsin_e' } },
    recruit: [
      { age: '3세반', birth: '2023년생', classes: 1, capacity: null, staying: null, recruit: 14, src: 'yogang' },
      { age: '4세반', birth: '2022년생', classes: 1, capacity: null, staying: null, recruit: 4, src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: 2, capacity: null, staying: null, recruit: 21, src: 'yogang' },
      { age: '특수반', birth: '2021~2023년생', classes: 1, capacity: null, staying: null, recruit: '교육지원청 배정', src: 'yogang' },
    ],
    priority3: [우선공통, '2·3순위 각 5%(3세 1명) / 4순위 다자녀(3자녀 이상) 15%(2명)', '5순위 60%(8명): 다자녀(2자녀 이상)·쌍생아·본원 재학 유아 형제자매·사회적 배려·다문화·장애부모'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정 08:30~12:30 + 방과후 12:30~16:30 (1일 8시간)', src: 'yogang' },
    care: { value: '아침 07:30~08:30 · 저녁 16:30~18:30 (2026학년도 기준), 입학 확정 유아 중 취업 중인 한부모·맞벌이 가정', src: 'yogang' },
    bus: { value: '없음 (통학차량 노선 없음)', src: 'yogang' },
    cost: { value: '별도의 보호자 부담금 없음 (유아학비·유치원운영비에서 지출)', src: 'yogang' },
    events: [],
    notes: ['현장 접수 13:00~15:00', '서류 온라인 간편제출 11월 6일(금) 18:00까지', '정원·재원 예정 인원은 요강에 없음(모집인원만 표기)'],
  },
  동덕초등학교병설유치원: {
    sources: {
      yogang: { title: '2027학년도 유아모집 계획 (HWP)', posted: '2026-10-27', url: 'http://dongdeok.cnees.kr/boardCnts/view.do?boardID=116603&boardSeq=45260482&lev=0&s=dongdeok' },
      poster: { title: '2027 유아모집 포스터 (PDF)', posted: '2026-10-27', url: 'http://dongdeok.cnees.kr/boardCnts/view.do?boardID=116603&boardSeq=45260482&lev=0&s=dongdeok' },
    },
    recruit: [
      { age: '3·4세반 (혼합)', birth: '2022~2023년생', classes: 1, capacity: 16, staying: '2 (특수 2)', recruit: 14, src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: 1, capacity: 20, staying: '4 (특수 1)', recruit: 16, src: 'yogang' },
      { age: '특수반', birth: '2021~2023년생', classes: 1, capacity: '(4)', staying: '(3)', recruit: '(1)', src: 'yogang' },
    ],
    priority3: [우선공통 + ' (2·3순위 3%)', '4순위 다자녀(3자녀 이상) 20%', '5순위 60%: 다자녀(2자녀 이상)·다문화·장애부모·사회적 배려(한부모 포함)·2027 재원생 및 재학생 형제자매·쌍생아'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정+방과후 08:40~16:40', src: 'yogang' },
    care: { value: '저녁 돌봄 16:40~18:40 (신청 인원에 따라 운영 여부 변경 가능)', src: 'yogang' },
    bus: { value: '동덕초 학구 안 운행(삼일·장미·홍익·농심), 2026 노선 중심·지정 장소에서만 승하차, 시간은 추후 안내', src: 'yogang' },
    cost: { value: '전액 무상교육', src: 'yogang' },
    program: { value: '찾아오는 체험학습 월 3회 이상, 찾아오는 생태교육 월 1회(동물·밧줄·흙), 매일 한글·수 교육(교육과정·방과후 연계), 특성화: 유아음악·유아체육·한글·수·유아과학', src: 'poster' },
    events: [{ what: '예비소집 및 신입생 보호자 오리엔테이션 (개별 방문)', when: '2026-12-22(화) 14:00, 본교 2층 원무실', src: 'yogang' }],
    notes: ['3·4세가 한 반(혼합) — 모집 미달 시 3~5세 혼합 1학급으로 편성될 수 있음', '현장 접수 16:00까지'],
  },
  아산갈산초등학교병설유치원: {
    sources: { yogang: { title: '2027학년도 아산갈산초등학교병설유치원 유아모집요강 (PDF) + 순위별 세부조건·증빙서류 안내', posted: '2026-10-28', url: 'http://asgs.cnees.kr/boardCnts/view.do?boardID=253287&boardSeq=45261209&lev=0&s=asgs' } },
    recruit: [
      { age: '3세반', birth: '2023년생', classes: 1, capacity: 14, staying: '1 (특수 1)', recruit: 13, src: 'yogang' },
      { age: '4세반', birth: '2022년생', classes: 1, capacity: 18, staying: '15 (특수 2)', recruit: 3, src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: 1, capacity: 20, staying: '18 (특수 1)', recruit: 2, src: 'yogang' },
    ],
    priority3: [우선공통 + ' (2·3순위 각 3%)', '4순위 다자녀(3자녀 이상) 30%', '5순위 40%: 아산갈산초 학구 안 유아·본원 재학 유아(2026 3·4세) 형제자매·사회적 배려·다자녀(2자녀, 쌍생아 포함)·다문화·장애부모'],
    twins: TWINS_COMMON + ' — 이 원은 쌍생아를 우선모집 5순위로 명시',
    hours: { value: '교육과정+방과후 08:30~16:30', src: 'yogang' },
    care: { value: '저녁 돌봄교실 16:30~18:30, 입학 확정 유아 중 저소득·맞벌이·한부모 가정 등 (신청 방법 추후 안내)', src: 'yogang' },
    cost: { value: '"유치원알리미 확인"', src: 'yogang' },
    events: [{ what: '유치원 시설참관·교육과정 설명회 (입학 확정 유아 보호자)', when: '2026-12-23(수) 17:00~18:00 예정, 유희실', src: 'yogang' }],
    notes: ['현장 접수 09:00~16:00 (방문 전 전화)', '증빙서류: 온라인 간편제출 11월 6일(금) 18:00까지, 방문·메일은 11월 4일 16:00 도착분까지', '요강에 통학차량 안내 없음 — 원에 확인'],
  },
  한들물빛초등학교병설유치원: {
    sources: { yogang: { title: '2027학년도 한들물빛초등학교병설유치원 유아모집 요강(우선) (PDF)', posted: '2026-10-27', url: 'http://hme.caees.kr/boardCnts/view.do?boardID=222553&boardSeq=31505711&lev=0&s=hme' } },
    recruit: [
      { age: '3세반', birth: '2023년생', classes: 1, capacity: 14, staying: '1 (특수 1)', recruit: '6 (우선모집 인원)', src: 'yogang' },
      { age: '4세반', birth: '2022년생', classes: 1, capacity: 18, staying: '13', recruit: '2 (우선모집 인원)', src: 'yogang' },
      { age: '5세반', birth: '2021년생', classes: 1, capacity: 20, staying: '17 (특수 1)', recruit: '2 (우선모집 인원)', src: 'yogang' },
      { age: '특수반', birth: '2021~2023년생', classes: 1, capacity: '(4)', staying: '(2)', recruit: '교육청 배치', src: 'yogang' },
    ],
    priority3: [우선공통 + ' (2·3순위 각 15%)', '4순위 다자녀(3자녀 이상) 25%', '5순위 25%: 다자녀(2자녀 이상)·사회적 배려·다문화·장애부모'],
    twins: TWINS_COMMON,
    hours: { value: '교육과정+방과후 08:30~16:30 (2026학년도 기준)', src: 'yogang' },
    care: { value: '저녁 돌봄 16:30~18:30 (2026학년도 기준), 맞벌이 가정 우선', src: 'yogang' },
    bus: { value: '없음 (통학차량 미운영 — 등·하원 모두 보호자 인계)', src: 'yogang' },
    cost: { value: '유아학비에서 전액 지원 (학습준비물·급간식·특성화·현장체험학습비 등)', src: 'yogang' },
    events: [{ what: '교육과정 설명회 (신입생·재입학생 보호자)', when: '2026-12-10(목) 14:00 예정, 1층 한들물빛 어울림터', src: 'yogang' }],
    notes: ['3세반 정원 14명 중 우선모집 6명 — 나머지는 일반모집 인원으로 보임(요강 표 기준, 원에 확인)', '현장 접수 평일 10:00~15:00 (점심 11:30~12:30 제외)', '조기입학·취학유예·미숙아 하위연령 지원은 모집 대상 아님', '쌍생아·재원생 형제자매가 우선순위에 따로 적혀 있지 않음 — 원에 확인'],
  },
};

/** 아직 요강을 확인하지 못한 곳의 현재 상태 */
export const PENDING = {
  아산용연초등학교병설유치원: '홈페이지(유치원 공지사항·가정통신문)에 2027 모집 글 아직 없음 (10/28 확인) — 유보통합포털에서 확인',
  탕정초등학교병설유치원: '홈페이지(유치원 알림마당·소식)에 2027 모집 글 아직 없음 (10/28 확인) — 유보통합포털에서 확인',
  프라임유치원: '홈페이지 원아모집 게시판에 2027학년도 홍보영상만 있고 요강은 2026학년도 것만 있음 (10/27 확인)',
  세종유치원: '홈페이지 글을 자동으로 읽지 못함(화면을 스크립트로 불러옴)',
  아주나유치원: '유치원알리미에 홈페이지 공시 없음, 웹 검색에서도 못 찾음',
  자연유치원: '유치원알리미에 홈페이지 공시 없음, 웹 검색에서도 못 찾음',
  하나유치원: '유치원알리미에 홈페이지 공시 없음, 웹 검색에서도 못 찾음',
  연화초등학교병설유치원: '유치원알리미에 홈페이지 공시 없음',
};

/**
 * 우선순위를 화면이 계산할 수 있게 정리한 값 (3세반 기준, 위 priority3 문장과 같은 요강 근거)
 * pct: 모집인원 대비 선발 비율(요강 표기 그대로). 모르면 null. 합격 가능성을 뜻하지 않음.
 * 조건 키: low 법정저소득 · vet 국가보훈 · nk 북한이탈 · multi3 3자녀 이상 · multi2 2자녀 · twins 쌍생아 · sibling 재원생 형제자매
 *         health 건강취약 · social 사회적 배려 · multicultural 다문화 · disabledParent 장애부모 · walk 도보 등하원(차량 미이용)
 *         together 형제자매 동시입학 · foreign 외국국적 · local_segyo 세교리 주소 · local_handeul 한들물빛도시 거주+차량 미이용 · local_gongsu 공수초 학구
 */
export const PRIO = {
  배방유치원: [
    { rank: 1, pct: '모집인원 내 100%', keys: ['low'] }, { rank: 2, pct: '1명', keys: ['vet'] }, { rank: 3, pct: '1명', keys: ['nk'] },
    { rank: 4, pct: '10%', keys: ['sibling'] }, { rank: 5, pct: '20%', keys: ['multi3'] },
    { rank: 6, pct: '60%', keys: ['health', 'multi2', 'twins', 'social', 'multicultural', 'disabledParent', 'walk'] },
  ],
  아산세교유치원: [
    { rank: 1, pct: '모집인원 내 100%', keys: ['low'] }, { rank: 2, pct: '3%', keys: ['vet'] }, { rank: 3, pct: '3%', keys: ['nk'] },
    { rank: 4, pct: '7%', keys: ['multi3'] },
    { rank: 5, pct: '40%', keys: ['multi2', 'twins', 'sibling', 'disabledParent', 'multicultural', 'social'] },
    { rank: 6, pct: '40%', keys: ['local_segyo'] },
  ],
  아산월천유치원: [
    { rank: 1, pct: '모집인원의 100%', keys: ['low'] }, { rank: 2, pct: '20%', keys: ['vet'] }, { rank: 3, pct: '20%', keys: ['nk'] },
    { rank: 4, pct: '20%', keys: ['multi3'] },
    { rank: 5, pct: '30%', keys: ['twins', 'multi2', 'health', 'sibling', 'social', 'multicultural', 'disabledParent', 'walk'] },
  ],
  한들물빛유치원: [
    { rank: 1, pct: '모집인원 내 100%', keys: ['low'] }, { rank: 2, pct: null, keys: ['vet'] }, { rank: 3, pct: null, keys: ['nk'] },
    { rank: 4, pct: '7%', keys: ['multi3'] },
    { rank: 5, pct: '33%', keys: ['multi2', 'twins', 'sibling', 'disabledParent', 'multicultural', 'health', 'social'] },
    { rank: 6, pct: '40%', keys: ['local_handeul'] },
  ],
  아산공수초등학교병설유치원: [
    { rank: 1, pct: '모집인원 내 100%', keys: ['low'] }, { rank: 2, pct: '5%', keys: ['vet'] }, { rank: 3, pct: '5%', keys: ['nk'] },
    { rank: 4, pct: '50%(7명)', keys: ['multi3', 'sibling', 'walk', 'local_gongsu', 'social'] },
    { rank: 5, pct: '20%(3명)', keys: ['multi2', 'twins', 'multicultural', 'disabledParent'] },
  ],
  탕정미래초등학교병설유치원: [
    { rank: 1, pct: '모집인원 100%', keys: ['low'] }, { rank: 2, pct: '3%', keys: ['vet'] }, { rank: 3, pct: '3%', keys: ['nk'] },
    { rank: 4, pct: '40%', keys: ['multi3', 'sibling', 'health', 'social'] },
    { rank: 5, pct: '40%', keys: ['multi2', 'multicultural', 'disabledParent'], note: '쌍생아 별도 표기 없음 — 2자녀로 해당하는지 원에 확인' },
  ],
  이순신초등학교병설유치원: [
    { rank: 1, pct: '모집인원의 100%', keys: ['low'] }, { rank: 2, pct: '5%(1명)', keys: ['vet'] }, { rank: 3, pct: '5%(1명)', keys: ['nk'] },
    { rank: 4, pct: '15%(2명)', keys: ['multi3'] },
    { rank: 5, pct: '60%(8명)', keys: ['multi2', 'twins', 'sibling', 'social', 'multicultural', 'disabledParent'] },
  ],
  동덕초등학교병설유치원: [
    { rank: 1, pct: '모집인원의 100%', keys: ['low'] }, { rank: 2, pct: '3%', keys: ['vet'] }, { rank: 3, pct: '3%', keys: ['nk'] },
    { rank: 4, pct: '20%', keys: ['multi3'] },
    { rank: 5, pct: '60%', keys: ['multi2', 'multicultural', 'disabledParent', 'social', 'sibling', 'twins'] },
  ],
  아산갈산초등학교병설유치원: [
    { rank: 1, pct: '모집인원의 100%', keys: ['low'] }, { rank: 2, pct: '3%', keys: ['vet'] }, { rank: 3, pct: '3%', keys: ['nk'] },
    { rank: 4, pct: '30%', keys: ['multi3'] },
    { rank: 5, pct: '40%', keys: ['local_galsan', 'sibling', 'social', 'multi2', 'twins', 'multicultural', 'disabledParent'] },
  ],
  한들물빛초등학교병설유치원: [
    { rank: 1, pct: '모집인원 내 100%', keys: ['low'] }, { rank: 2, pct: '15%', keys: ['vet'] }, { rank: 3, pct: '15%', keys: ['nk'] },
    { rank: 4, pct: '25%', keys: ['multi3'] },
    { rank: 5, pct: '25%', keys: ['multi2', 'social', 'multicultural', 'disabledParent'], note: '쌍생아·재원생 형제자매 별도 표기 없음 — 원에 확인' },
  ],
  금곡초등학교병설유치원: [
    { rank: 1, pct: '모집인원 내 100%', keys: ['low'] }, { rank: 2, pct: '모집인원 내 100%', keys: ['vet'] }, { rank: 3, pct: '모집인원 내 100%', keys: ['nk'] },
    { rank: 4, pct: '20%', keys: ['multi3'] },
    { rank: 5, pct: '70%', keys: ['multi2', 'health', 'twins', 'sibling', 'social', 'multicultural', 'disabledParent'] },
  ],
  일심유치원: [
    { rank: 1, pct: '모집인원 내 100%', keys: ['low'] }, { rank: 2, pct: '최소 3%', keys: ['vet'] }, { rank: 3, pct: '최소 3%', keys: ['nk'] },
    { rank: 4, pct: '10%', keys: ['sibling'] }, { rank: 5, pct: '5%', keys: ['multi3'] },
    { rank: 6, pct: '30%', keys: ['twins', 'together', 'multicultural', 'foreign'] },
  ],
};
