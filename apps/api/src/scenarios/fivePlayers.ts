import type { Scenario } from "../../../../packages/shared/src/types";

export const fivePlayersScenario = {
  id: "manual-five-snowbound-lodge",
  title: "백설산장의 마지막 코코아",
  theme: "폭설로 고립된 산장 살인 사건",
  playerCount: 5,
  intro:
    "폭설로 길이 막힌 백설산장에서 투자자 한도윤이 식사 도중 쓰러졌다. 구조대는 아침이 되어야 올 수 있고, 전기가 끊긴 산장에는 다섯 명의 손님과 직원만 남아 있다.",
  victim: {
    name: "한도윤",
    description:
      "산장 매입을 추진하던 리조트 개발 투자자. 저녁 식사 전, 오래된 화재 보험금과 산사태 경고 기록을 공개하겠다고 말했다.",
    deathDescription:
      "21:30경 식당 라운지에서 독성 식물 추출물이 든 코코아를 마신 뒤 쓰러져 숨졌다.",
  },
  characters: [
    {
      id: "lodge-seoyeon-jeong",
      name: "정서연",
      occupation: "백설산장 관리인",
      publicProfile:
        "산장을 혼자 관리해 온 직원이다. 손님들의 취향과 동선을 모두 알고 있으며, 한도윤의 개발 계획에 가장 강하게 반대했다.",
      privateScript:
        "당신이 범인이다. 한도윤은 몇 년 전 산장 화재 보험금 청구에 당신이 관여했다는 것을 알고 있었고, 개발 계약을 강요하며 이를 폭로하겠다고 했다. 21:30 식당 라운지에서 그의 코코아에 독성 식물 추출물을 섞어 치명적인 반응을 일으키게 했다. 컵을 씻고 저장실의 기록을 없앤 것이 숨겨야 할 사실이다. 코코아를 가져온 이유는 난방이 꺼져 손님들을 챙긴 것뿐이라고 주장하라.",
      secret:
        "과거 화재 때 보험금을 받기 위해 피해 규모를 부풀린 기록을 숨기고 있다.",
      objectives: [
        "산장 관리인이라서 누구에게나 음료를 건넬 수 있었다는 점을 평범한 일로 보이게 한다.",
        "발전기와 산사태 경고를 둘러싼 다른 사람들의 거짓말에 논의를 집중시킨다.",
      ],
      isCulprit: true,
    },
    {
      id: "lodge-dohyun-lee",
      name: "이도현",
      occupation: "산악 가이드",
      publicProfile:
        "산장의 겨울 프로그램을 맡는 산악 가이드다. 길이 막힌 상황에서 침착하게 행동하지만, 산사태 경고를 무시했다는 비난을 받고 있다.",
      privateScript:
        "당신은 지난주 위험 구역 경고 표지판을 치우고 손님들을 안내했다. 21:35에 발전기실로 가서 그 흔적이 남은 점검표를 찢었고, 혜진이 복도에서 당신이 발전기실로 가는 것을 봤다. 한도윤을 죽이지는 않았지만 경고를 무시한 사실은 숨기고 싶다.",
      secret:
        "예약 취소를 막기 위해 산사태 위험 경고를 축소 보고했다.",
      objectives: [
        "발전기실에 간 이유를 살인과 무관한 점검으로 포장한다.",
        "서연이 식사 뒤 컵을 직접 치운 이유를 묻는다.",
      ],
      isCulprit: false,
    },
    {
      id: "lodge-hyejin-yoon",
      name: "윤혜진",
      occupation: "여행 전문 기자",
      publicProfile:
        "산장의 겨울 특집을 취재하러 온 기자다. 한도윤과 금전 문제로 격하게 다투는 모습이 목격됐다.",
      privateScript:
        "한도윤은 당신이 예전에 받은 협찬금을 기사에서 밝히지 않았다는 증거를 가지고 있었다. 21:35에 발전기실로 향하는 도현을 복도에서 봤고, 21:45에는 식당 라운지에서 쓰러진 한도윤을 촬영하려다 카메라 메모리카드를 숨겼다. 당신은 그를 죽이지 않았지만, 그가 협찬 의혹을 폭로할까 두려웠다.",
      secret:
        "긍정적 기사를 쓰는 대가로 리조트 회사의 협찬을 받았다.",
      objectives: [
        "메모리카드를 숨긴 일을 유족 보호를 위한 판단처럼 설명한다.",
        "도현의 발전기실 알리바이와 서연의 음료 동선을 대조한다.",
      ],
      isCulprit: false,
    },
    {
      id: "lodge-minseok-choi",
      name: "최민석",
      occupation: "개발사 공동 투자자",
      publicProfile:
        "한도윤과 함께 산장을 인수하려던 투자자다. 겉으로는 사업 파트너였지만, 최근 투자금 사용처를 두고 다툼이 있었다.",
      privateScript:
        "당신은 투자금 일부를 개인 빚을 막는 데 썼다. 21:15에 약품 상자를 찾는다는 핑계로 치료실 근처에 갔고, 아라가 보일러실에서 나와 당신을 봤다. 한도윤에게 빚 문제를 들킨 것은 사실이나 살인은 하지 않았다. 빈 투자 계좌 내역을 감춰라.",
      secret:
        "개발 투자금 일부를 도박 빚 상환에 사용했다.",
      objectives: [
        "치료실 근처에 간 진짜 이유를 끝까지 감춘다.",
        "한도윤이 여러 사람의 약점을 이용해 사업을 밀어붙였다고 강조한다.",
      ],
      isCulprit: false,
    },
    {
      id: "lodge-ara-kang",
      name: "강아라",
      occupation: "응급의학과 의사",
      publicProfile:
        "휴가차 산장을 찾은 의사다. 한도윤이 쓰러진 뒤 가장 먼저 처치했으며, 사망 원인이 단순 심장마비는 아니라고 생각한다.",
      privateScript:
        "당신은 한도윤이 예전에 환자 정보를 이용해 투자 제안을 강요한 일을 알고 있어 그를 경멸했다. 21:15에 보일러실에서 난방 밸브를 확인하다 민석과 마주쳤고, 21:45에 식당 라운지에서 응급 처치를 했다. 그의 사망이 독성 반응일 수 있다는 판단을 처음에는 확신하지 못해 말하지 않았다.",
      secret:
        "한도윤의 투자 제안과 관련된 환자 정보 유출 정황을 알고도 신고하지 못했다.",
      objectives: [
        "의학적 소견은 단정하지 말고, 발견된 흔적과 함께 단계적으로 공개한다.",
        "민석이 치료실 근처에 온 이유를 추궁한다.",
      ],
      isCulprit: false,
    },
  ],
  clues: [
    {
      id: "lodge-cocoa-residue",
      title: "코코아 잔의 침전물",
      content:
        "한도윤의 잔 바닥에서 쓴맛이 나는 초록빛 침전물이 발견됐다. 산장 저장실의 차 재료와 치료실의 식물 표본 모두에서 비슷한 색이 난다.",
      revealPhase: "investigation",
      pointsTo: ["lodge-seoyeon-jeong", "lodge-ara-kang", "lodge-minseok-choi"],
    },
    {
      id: "lodge-washed-cup",
      title: "너무 깨끗한 머그컵",
      content:
        "설거지통에서 다른 잔보다 유난히 깨끗이 닦인 머그컵이 발견됐다. 주방을 자유롭게 드나든 사람과 식사 뒤 남아 있던 사람이 모두 후보가 된다.",
      revealPhase: "investigation",
      pointsTo: ["lodge-seoyeon-jeong", "lodge-hyejin-yoon", "lodge-dohyun-lee"],
    },
    {
      id: "lodge-generator-log",
      title: "발전기 점검표 조각",
      content:
        "발전기실에서 찢긴 점검표가 발견됐다. 오후의 경고등 기록과, 저녁에 누군가 기록을 지우려 한 흔적이 함께 남아 있다.",
      revealPhase: "discussion",
      pointsTo: ["lodge-dohyun-lee", "lodge-seoyeon-jeong"],
    },
    {
      id: "lodge-insurance-file",
      title: "화재 보험 서류",
      content:
        "난로 장작 상자 밑에서 과거 화재 피해액이 서로 다르게 적힌 보험 서류 두 장이 나왔다. 한 장에는 관리인의 필체, 다른 장에는 투자사의 결재 도장이 있다.",
      revealPhase: "voting",
      pointsTo: ["lodge-seoyeon-jeong", "lodge-minseok-choi"],
    },
    {
      id: "lodge-cocoa-order",
      title: "마지막 주문 메모",
      content:
        "주방 메모에는 한도윤만 설탕 없는 코코아를 요청했다고 적혀 있다. 서연이 그의 잔을 따로 준비했고, 아라는 응급 처치 뒤 그 잔을 확인했다.",
      revealPhase: "reveal",
      pointsTo: ["lodge-seoyeon-jeong", "lodge-ara-kang"],
    },
  ],
  truth: {
    culpritId: "lodge-seoyeon-jeong",
    motive:
      "한도윤이 과거 화재 보험금 조작을 이용해 서연에게 개발 계약을 강요하고, 거절하면 경찰에 알리겠다고 협박했기 때문이다.",
    method:
      "서연은 한도윤에게만 따로 준비한 설탕 없는 코코아에 독성 식물 추출물을 섞고, 그가 쓰러진 뒤 잔을 닦아 흔적을 줄이려 했다.",
    timeline: [
      {
        time: "20:55",
        characterId: "lodge-seoyeon-jeong",
        location: "식당 라운지",
        action: "폭설 상황을 설명하며 손님들의 저녁 자리를 준비했다.",
        witnessedBy: ["lodge-dohyun-lee", "lodge-hyejin-yoon", "lodge-minseok-choi", "lodge-ara-kang"],
      },
      {
        time: "20:55",
        characterId: "lodge-dohyun-lee",
        location: "식당 라운지",
        action: "서연의 폭설 안내를 듣고 산장 출입문을 점검하겠다고 말했다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-hyejin-yoon", "lodge-minseok-choi", "lodge-ara-kang"],
      },
      {
        time: "20:55",
        characterId: "lodge-hyejin-yoon",
        location: "식당 라운지",
        action: "한도윤과 개발 기사를 두고 말다툼한 뒤 자리에 앉아 있었다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-dohyun-lee", "lodge-minseok-choi", "lodge-ara-kang"],
      },
      {
        time: "20:55",
        characterId: "lodge-minseok-choi",
        location: "식당 라운지",
        action: "투자 계약서를 챙기며 한도윤의 전화를 기다렸다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-dohyun-lee", "lodge-hyejin-yoon", "lodge-ara-kang"],
      },
      {
        time: "20:55",
        characterId: "lodge-ara-kang",
        location: "식당 라운지",
        action: "한도윤이 불편해 보인다고 말했지만 특별한 진찰은 하지 않았다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-dohyun-lee", "lodge-hyejin-yoon", "lodge-minseok-choi"],
      },
      {
        time: "21:15",
        characterId: "lodge-minseok-choi",
        location: "치료실 앞 복도",
        action: "약품 상자를 찾는다는 핑계로 치료실 근처를 살폈다.",
        witnessedBy: ["lodge-ara-kang"],
      },
      {
        time: "21:15",
        characterId: "lodge-ara-kang",
        location: "치료실 앞 복도",
        action: "보일러실에서 돌아와 민석이 치료실 근처에 있는 것을 봤다.",
        witnessedBy: ["lodge-minseok-choi"],
      },
      {
        time: "21:25",
        characterId: "lodge-seoyeon-jeong",
        location: "주방 저장실",
        action: "한도윤의 설탕 없는 코코아에 넣을 재료를 따로 챙겼다.",
        witnessedBy: [],
      },
      {
        time: "21:30",
        characterId: "lodge-seoyeon-jeong",
        location: "식당 라운지",
        action: "한도윤에게만 따로 준비한 코코아를 건넸다.",
        witnessedBy: ["lodge-hyejin-yoon", "lodge-minseok-choi", "lodge-ara-kang"],
      },
      {
        time: "21:30",
        characterId: "lodge-hyejin-yoon",
        location: "식당 라운지",
        action: "서연이 한도윤의 잔을 따로 내는 모습을 봤다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-minseok-choi", "lodge-ara-kang"],
      },
      {
        time: "21:30",
        characterId: "lodge-minseok-choi",
        location: "식당 라운지",
        action: "한도윤에게 계약서에 서명하라고 재촉했다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-hyejin-yoon", "lodge-ara-kang"],
      },
      {
        time: "21:30",
        characterId: "lodge-ara-kang",
        location: "식당 라운지",
        action: "한도윤이 코코아를 마시는 모습을 보고 그의 안색을 살폈다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-hyejin-yoon", "lodge-minseok-choi"],
      },
      {
        time: "21:35",
        characterId: "lodge-dohyun-lee",
        location: "발전기실 앞 복도",
        action: "점검표를 없애기 위해 발전기실로 향하다 혜진과 마주쳤다.",
        witnessedBy: ["lodge-hyejin-yoon"],
      },
      {
        time: "21:35",
        characterId: "lodge-hyejin-yoon",
        location: "발전기실 앞 복도",
        action: "카메라를 가지러 가다 발전기실로 들어가는 도현을 봤다.",
        witnessedBy: ["lodge-dohyun-lee"],
      },
      {
        time: "21:45",
        characterId: "lodge-ara-kang",
        location: "식당 라운지",
        action: "쓰러진 한도윤에게 응급 처치를 하며 잔의 냄새를 확인했다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-minseok-choi"],
      },
      {
        time: "21:45",
        characterId: "lodge-seoyeon-jeong",
        location: "식당 라운지",
        action: "혼란 속에서 한도윤의 잔을 치울 기회를 살폈다.",
        witnessedBy: ["lodge-ara-kang", "lodge-minseok-choi"],
      },
      {
        time: "21:45",
        characterId: "lodge-minseok-choi",
        location: "식당 라운지",
        action: "계약서를 감추고 아라의 응급 처치를 지켜봤다.",
        witnessedBy: ["lodge-seoyeon-jeong", "lodge-ara-kang"],
      },
    ],
  },
} satisfies Scenario;
