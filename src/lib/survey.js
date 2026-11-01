// 우리 아이 성향·생활 설문 — 문항과 해석 규칙 (자체 설문 초안. 표준화 검사·진단이 아님)
// 앱 화면(app/template.html), 관리자 화면(public/admin.html)이 같은 코드를 쓴다 (빌드 때 끼워 넣음).
// 서버 검사(supabase/functions/submit)는 문항 번호·답 보기·지원 키만 따로 확인한다 — 문항을 바꾸면 거기도 맞출 것.

export const SCALE = ['거의 없음', '가끔', '자주', '대부분', '관찰 기회 없음'];
export const HIGH = new Set(['자주', '대부분']);
export const LOW = new Set(['거의 없음', '가끔']);
export const SUPPORTS = {
  gradual_adapt: { name: '적응 지원', q: '처음 적응 기간에 단계적 등원이나 보호자 동반, 사전 방문이 가능한가요?' },
  transition_notice: { name: '활동 전환 안내', q: '활동을 바꿀 때 미리 알려 주시나요? 하던 놀이를 마무리할 시간을 주시나요?' },
  movement: { name: '움직임 기회', q: '하루에 바깥놀이·신체활동 시간은 얼마나 되고, 앉아서 하는 활동 중 잠깐 움직이거나 쉴 수 있나요?' },
  choice_play: { name: '자유놀이·선택', q: '자유놀이 시간은 하루에 얼마나 되고, 아이가 놀이를 고르고 오래 이어 갈 수 있나요?' },
  quiet_space: { name: '조용한 휴식 공간', q: '시끄럽거나 지칠 때 쉴 수 있는 조용한 공간이 있나요? 참여 방식을 조정해 주시나요?' },
  sensory: { name: '재료·촉감 배려', q: '싫어하는 촉감·재료 활동은 다른 활동을 고를 수 있나요?' },
  small_group: { name: '친구 사귀기 도움', q: '소그룹 활동이 있나요? 처음에 친구와 이어지도록 도와주시나요?' },
  express_help: { name: '도움 요청 살피기', q: '아이가 불편을 말로 잘 표현하지 못할 때 선생님이 어떻게 알아채고 도와주시나요?' },
  conflict: { name: '갈등·감정 지원', q: '친구와 의견이 부딪치면 어떻게 중재하고, 감정 표현을 어떻게 도와주시나요?' },
  retry: { name: '재도전 지원', q: '뜻대로 안 돼서 그만두려 할 때 어떻게 격려하시나요? 결과보다 과정을 말해 주시나요?' },
  presentation: { name: '발표 부담 조정', q: '발표·공연처럼 여러 사람 앞에서 하는 활동은 참여 방식을 조정해 줄 수 있나요?' },
  hands_on: { name: '직접 해보는 활동', q: '설명 위주보다 직접 보고 해보는 활동이 많은 편인가요?' },
};
// type: strength(강점·선호) comfort(편안한 조건) help(도움이 필요한 상황). low: 낮게 답했을 때의 해석(있는 문항만)
export const ITEMS = [
  [1, '새로운 장소에서 먼저 지켜본 뒤 참여한다.', 'comfort', '새 장소에서는 먼저 지켜볼 시간이 있으면 편안해한다', 'gradual_adapt'],
  [2, '낯선 어른과 있을 때 보호자 가까이에 머무르려 한다.', 'help', '낯선 어른과 있을 때 보호자 곁을 찾는다 — 익숙해질 시간이 필요할 수 있다', 'gradual_adapt'],
  [3, '보호자와 헤어진 뒤 익숙한 어른의 도움을 받아 놀이한다.', 'strength', '헤어진 뒤 익숙한 어른의 도움으로 놀이를 이어 간다', 'gradual_adapt'],
  [4, '새로운 활동을 미리 설명하면 참여하기 수월해진다.', 'comfort', '새 활동을 미리 설명해 주면 참여가 수월하다', 'transition_notice'],
  [5, '달리기·오르기 등 움직이는 놀이를 스스로 찾는다.', 'strength', '몸을 움직이는 놀이를 스스로 찾는다', 'movement'],
  [6, '앉아서 하는 활동 중 움직이거나 쉬고 싶어 한다.', 'help', '앉아서 하는 활동 중에 움직이거나 쉴 기회가 필요하다', 'movement'],
  [7, '좋아하는 놀이를 오래 이어가려 한다.', 'strength', '좋아하는 놀이에 오래 몰입한다', 'choice_play'],
  [8, '여러 활동 중 자신이 할 활동을 고르려 한다.', 'strength', '할 활동을 스스로 고르려 한다', 'choice_play'],
  [9, '놀이가 갑자기 끝나면 불편함을 표현한다.', 'help', '놀이가 갑자기 끝나면 힘들어한다', 'transition_notice'],
  [10, '전환을 미리 알려주면 다음 활동으로 이동하기 수월하다.', 'comfort', '다음 활동을 미리 알려 주면 옮겨 가기 수월하다', 'transition_notice'],
  [11, '소리나 사람이 많은 공간에서 물러나거나 쉬려 한다.', 'help', '소리나 사람이 많은 곳에서는 물러나 쉬려 한다', 'quiet_space'],
  [12, '특정 촉감이나 재료의 활동을 피한다.', 'help', '특정 촉감이나 재료를 피한다', 'sensory'],
  [13, '단체활동 후 조용한 곳에서 쉬려 한다.', 'comfort', '단체활동 뒤 조용히 쉬면 회복한다', 'quiet_space'],
  [14, '휴식 후 다시 활동에 참여한다.', 'strength', '쉬고 나면 다시 활동에 참여한다', 'quiet_space'],
  [15, '처음 만난 또래보다 익숙한 한두 명과 먼저 놀이한다.', 'comfort', '익숙한 한두 명과 먼저 놀며 시작한다', 'small_group'],
  [16, '놀이에 참여할 때 어른의 소개나 도움을 활용한다.', 'comfort', '어른의 소개·도움이 있으면 놀이에 들어가기 쉽다', 'small_group'],
  [17, '불편하거나 도움이 필요할 때 어른에게 표현한다.', 'strength', '불편하거나 도움이 필요할 때 어른에게 말한다', 'express_help', '도움이 필요할 때 표현하는 것을 어른이 먼저 살펴 줄 필요가 있을 수 있다'],
  [18, '친구와 의견이 다를 때 어른의 중재가 필요하다.', 'help', '친구와 의견이 다를 때 어른의 중재가 도움이 된다', 'conflict'],
  [19, '활동이 뜻대로 되지 않으면 그만하려 한다.', 'help', '뜻대로 안 되면 그만두려 한다', 'retry'],
  [20, '과정을 격려하거나 도와주면 다시 시도한다.', 'comfort', '과정을 격려하거나 도와주면 다시 시도한다', 'retry'],
  [21, '여러 사람 앞에서 말하거나 보여주는 활동을 부담스러워한다.', 'help', '여러 사람 앞에서 말하거나 보여 주는 활동을 부담스러워한다', 'presentation'],
  [22, '자신의 방식으로 만들거나 탐색하는 활동을 즐긴다.', 'strength', '자기 방식으로 만들고 탐색하는 것을 즐긴다', 'choice_play'],
  [23, '긴 설명보다 직접 보고 해볼 때 참여하기 수월하다.', 'comfort', '긴 설명보다 직접 보고 해볼 때 수월하다', 'hands_on'],
  [24, '관심 있는 주제로 질문하거나 놀이를 확장한다.', 'strength', '관심 있는 주제로 질문하고 놀이를 넓혀 간다', 'choice_play'],
].map(([n, text, type, hi, sup, lo]) => ({ n, text, type, hi, sup, lo }));

export function analyze(rec) {
  const out = { strength: [], comfort: [], help: [], unseen: [], sup: {} };
  for (const it of ITEMS) {
    const a = rec.answers[it.n];
    if (!a) continue;
    if (a === '관찰 기회 없음') { out.unseen.push(it); continue; }
    const note = rec.notes?.[it.n] ? ` (예: ${rec.notes[it.n]})` : '';
    if (HIGH.has(a)) {
      out[it.type].push(it.hi + note);
      if (it.type !== 'strength' || it.sup === 'quiet_space') (out.sup[it.sup] ??= []).push(it.n);
    } else if (it.lo && LOW.has(a)) {
      out.help.push(it.lo + note); (out.sup[it.sup] ??= []).push(it.n);
    }
  }
  return out;
}
