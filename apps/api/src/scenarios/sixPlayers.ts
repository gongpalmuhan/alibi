import type { Scenario } from "../../../../packages/shared/src/types";

export const sixPlayersScenario = {
  id: "manual-six-gallery-after-hours",
  title: "폐관 후 사라진 진품",
  theme: "폐장 후 미술관 살인 사건",
  playerCount: 6,
  intro:
    "국립 새벽미술관의 비공개 전시가 끝난 뒤, 수석 큐레이터 최윤아가 조각 전시실 바닥에서 발견됐다. 폭우로 외부 출입문은 자동 잠금 상태였고, 남은 여섯 명은 모두 작품과 얽힌 이유가 있다.",
  victim: {
    name: "최윤아",
    description:
      "전시품의 진위와 출처를 재조사하던 수석 큐레이터. 폐관 직전 누군가가 진품을 바꿔치기했다는 증거를 공개하겠다고 알렸다.",
    deathDescription:
      "20:35경 조각 전시실에서 청동 문진에 맞아 숨진 채 발견됐다.",
  },
  characters: [
    {
      id: "gallery-jihun-oh",
      name: "오지훈",
      occupation: "수석 복원가",
      publicProfile:
        "미술관의 핵심 복원가로, 피해자와 전시품 상태를 두고 자주 충돌했다. 손기술이 뛰어나지만 최근 복원실 출입 기록을 바꿨다는 소문이 있다.",
      privateScript:
        "당신이 범인이다. 윤아는 당신이 진품 습작을 개인 구매자에게 넘기고 정교한 복제품으로 바꿔치기한 사실을 밝혀냈다. 20:35 조각 전시실에서 윤아와 만나 청동 문진으로 그를 살해한 뒤, 선반에서 떨어진 사고처럼 보이게 장면을 꾸몄다. 동기는 경력과 불법 거래를 지키기 위해서다. 복원실에서 준비한 도구, 윤아와의 약속, 그리고 조각 전시실에 있었던 일을 숨겨라.",
      secret:
        "복원 중이라는 명목으로 진품 습작을 빼돌려 개인 수집가에게 팔았다.",
      objectives: [
        "보안 카메라 공백과 이사장의 회계 비리를 서로 연결해 다른 사람을 의심하게 만든다.",
        "복원실의 안료와 청동 문진이 일상 업무 도구였다고 설명한다.",
      ],
      isCulprit: true,
    },
    {
      id: "gallery-seojin-park",
      name: "박서진",
      occupation: "미술관 관장",
      publicProfile:
        "전시를 성사시킨 관장이다. 기부금 유치에는 능하지만, 피해자가 최근 회계 자료를 요구하자 크게 동요했다.",
      privateScript:
        "당신은 기부금 일부를 다른 전시 예산으로 돌려 쓴 영수증을 위조했다. 20:10 보안실에서 준호와 카메라 화면을 확인했고, 20:30에는 관장실에서 장부를 숨겼다. 윤아가 회계도 조사한다는 사실을 알고 있었지만 그를 죽이지 않았다. 위조 영수증을 감춰라.",
      secret:
        "기부금 영수증을 조작해 전시 예산의 공백을 메웠다.",
      objectives: [
        "보안실에 간 이유를 전시 안전 점검으로 설명한다.",
        "윤아가 작품뿐 아니라 회계도 조사했다는 사실을 공개해 동기를 넓힌다.",
      ],
      isCulprit: false,
    },
    {
      id: "gallery-junho-lee",
      name: "이준호",
      occupation: "야간 보안팀장",
      publicProfile:
        "폐관 후 보안을 책임지는 팀장이다. 사건 직전 조각 전시실 카메라가 짧게 꺼진 사실을 알면서도 처음엔 말하지 않았다.",
      privateScript:
        "당신은 불법 거래를 하는 지인에게 미술관 동선 정보를 넘기려 20:10 보안실에서 카메라 한 대를 일시적으로 비활성화했다. 서진 관장이 그 자리에 있었고, 20:45에 조각 전시실을 순찰해 윤아를 발견했다. 카메라 공백과 지인에게 정보를 준 일을 숨기고 싶지만 살인은 하지 않았다.",
      secret:
        "보안 동선 정보를 외부 미술상에게 돈을 받고 넘겼다.",
      objectives: [
        "카메라 공백이 살인을 위한 것은 아니었다고 설명한다.",
        "20:45 현장 상태가 누군가에게 이미 꾸며졌을 수 있음을 지적한다.",
      ],
      isCulprit: false,
    },
    {
      id: "gallery-yura-han",
      name: "한유라",
      occupation: "미술 평론가",
      publicProfile:
        "전시의 혹평을 예고한 평론가다. 피해자가 자신의 과거 표절 의혹을 알고 있다는 말을 듣고 전시장을 떠돌았다.",
      privateScript:
        "당신은 몇 년 전 윤아의 연구 문장을 출처 없이 인용했고, 윤아는 이를 알고 있었다. 20:15 제3전시실에서 전시 메모를 훼손했고, 20:30에는 물품보관실에서 찢긴 원고를 숨겼다. 살인은 하지 않았지만 표절 의혹 때문에 윤아를 만나려 했던 일을 감추고 있다.",
      secret:
        "윤아의 미발표 연구를 베껴 평론에 사용했다.",
      objectives: [
        "훼손한 메모가 살인 증거가 아니라 표절 관련 자료였다고 주장한다.",
        "복원가만이 진품과 복제품의 미세한 차이를 알고 있었다는 점을 묻는다.",
      ],
      isCulprit: false,
    },
    {
      id: "gallery-taesung-kim",
      name: "김태성",
      occupation: "개인 수집가",
      publicProfile:
        "이번 전시에 작품을 대여한 수집가다. 윤아가 대여 작품의 출처를 재검토하겠다고 하자 유난히 예민하게 반응했다.",
      privateScript:
        "당신의 대여 작품 중 하나는 출처 문서가 조작된 것이다. 20:20 서비스 엘리베이터에서 나리와 함께 운송 상자를 확인했고, 20:40에는 조각 전시실 문이 닫혀 있는 것을 봤다. 윤아가 거래를 취소할까 두려웠지만 그를 죽이지 않았다. 가짜 출처 증명서를 숨겨라.",
      secret:
        "대여한 작품의 출처 증명서 한 장이 위조됐다.",
      objectives: [
        "서비스 엘리베이터 알리바이를 나리와 확인한다.",
        "전시실 문이 닫혀 있던 시각과 카메라 공백을 대조한다.",
      ],
      isCulprit: false,
    },
    {
      id: "gallery-nari-choi",
      name: "최나리",
      occupation: "전시 코디네이터",
      publicProfile:
        "전시 자료와 작품 이동을 맡은 코디네이터다. 피해자의 신임을 받았지만, 오늘 밤 몇몇 운송 기록을 몰래 수정한 흔적이 있다.",
      privateScript:
        "당신은 태성의 부탁으로 운송 기록의 시간을 고쳐 줬다. 20:20 서비스 엘리베이터에서 태성과 상자를 확인했고, 20:40에는 자료보관실에서 윤아가 남긴 상태 보고서를 숨겼다. 보고서가 누군가의 바꿔치기를 암시한다는 것은 알았지만 범인이 누구인지는 확신하지 못했다. 기록 수정과 보고서 은닉을 숨겨라.",
      secret:
        "대여 작품의 실제 반입 시각을 감추기 위해 운송 기록을 수정했다.",
      objectives: [
        "태성의 출처 문제와 자신의 기록 수정은 다르다고 설득한다.",
        "윤아의 상태 보고서에 적힌 복원 흔적을 적절한 때 공개한다.",
      ],
      isCulprit: false,
    },
  ],
  clues: [
    {
      id: "gallery-camera-gap",
      title: "18분의 카메라 공백",
      content:
        "조각 전시실 카메라는 20:18부터 20:36까지 기록이 비어 있다. 보안실 조작 기록과 관장 승인 화면이 동시에 남아 있다.",
      revealPhase: "investigation",
      pointsTo: ["gallery-junho-lee", "gallery-seojin-park", "gallery-jihun-oh"],
    },
    {
      id: "gallery-bronze-residue",
      title: "청동 문진의 안료 가루",
      content:
        "전시실의 청동 문진 바닥에서 복원용 청색 안료와 닦아 낸 섬유 조각이 발견됐다. 같은 안료는 복원실과 훼손된 전시 메모 양쪽에 묻어 있다.",
      revealPhase: "investigation",
      pointsTo: ["gallery-jihun-oh", "gallery-yura-han"],
    },
    {
      id: "gallery-shipping-record",
      title: "수정된 운송 기록",
      content:
        "대여 작품의 반입 시각이 두 번 고쳐져 있다. 수정 권한은 코디네이터에게 있었고, 작품의 출처에는 수집가의 서명이 있다.",
      revealPhase: "discussion",
      pointsTo: ["gallery-nari-choi", "gallery-taesung-kim"],
    },
    {
      id: "gallery-condition-report",
      title: "숨겨진 상태 보고서",
      content:
        "윤아가 남긴 보고서에는 습작 뒷면의 복원 흔적이 최근 것이며, 원래 작품과 바뀌었을 가능성이 있다고 적혀 있다. 복원 책임자와 작품을 대여한 수집가 모두에게 불리하다.",
      revealPhase: "voting",
      pointsTo: ["gallery-jihun-oh", "gallery-taesung-kim", "gallery-nari-choi"],
    },
    {
      id: "gallery-meeting-note",
      title: "20:35의 약속 메모",
      content:
        "윤아의 수첩에는 '복원실 기록을 가진 사람과 조각 전시실에서 20:35에 만남'이라고 적혀 있다. 그 시간에 복원실 출입 권한을 가진 사람은 지훈뿐이지만, 카메라 기록은 없다.",
      revealPhase: "reveal",
      pointsTo: ["gallery-jihun-oh", "gallery-junho-lee"],
    },
  ],
  truth: {
    culpritId: "gallery-jihun-oh",
    motive:
      "윤아가 지훈의 진품 습작 바꿔치기와 개인 거래를 밝혀내고 이를 공개하려 했기 때문이다.",
    method:
      "지훈은 조각 전시실에서 윤아를 청동 문진으로 살해한 뒤 선반에서 떨어진 사고처럼 현장을 꾸몄다.",
    timeline: [
      {
        time: "20:00",
        characterId: "gallery-seojin-park",
        location: "중앙 홀",
        action: "폐관 안내를 마치고 남은 관계자들에게 비공개 전시 일정을 설명했다.",
        witnessedBy: ["gallery-junho-lee", "gallery-yura-han", "gallery-taesung-kim", "gallery-nari-choi", "gallery-jihun-oh"],
      },
      {
        time: "20:00",
        characterId: "gallery-junho-lee",
        location: "중앙 홀",
        action: "관장의 폐관 안내를 들으며 야간 순찰 순서를 확인했다.",
        witnessedBy: ["gallery-seojin-park", "gallery-yura-han", "gallery-taesung-kim", "gallery-nari-choi", "gallery-jihun-oh"],
      },
      {
        time: "20:00",
        characterId: "gallery-yura-han",
        location: "중앙 홀",
        action: "전시 메모를 들고 관장의 안내를 들었다.",
        witnessedBy: ["gallery-seojin-park", "gallery-junho-lee", "gallery-taesung-kim", "gallery-nari-choi", "gallery-jihun-oh"],
      },
      {
        time: "20:00",
        characterId: "gallery-taesung-kim",
        location: "중앙 홀",
        action: "대여 작품 보험 서류를 확인하며 폐관 안내를 들었다.",
        witnessedBy: ["gallery-seojin-park", "gallery-junho-lee", "gallery-yura-han", "gallery-nari-choi", "gallery-jihun-oh"],
      },
      {
        time: "20:00",
        characterId: "gallery-nari-choi",
        location: "중앙 홀",
        action: "운송 상자 목록을 들고 관장의 안내를 들었다.",
        witnessedBy: ["gallery-seojin-park", "gallery-junho-lee", "gallery-yura-han", "gallery-taesung-kim", "gallery-jihun-oh"],
      },
      {
        time: "20:00",
        characterId: "gallery-jihun-oh",
        location: "중앙 홀",
        action: "복원 장갑을 챙긴 채 폐관 안내를 들었다.",
        witnessedBy: ["gallery-seojin-park", "gallery-junho-lee", "gallery-yura-han", "gallery-taesung-kim", "gallery-nari-choi"],
      },
      {
        time: "20:10",
        characterId: "gallery-seojin-park",
        location: "보안실",
        action: "준호와 함께 전시실 카메라 화면을 확인했다.",
        witnessedBy: ["gallery-junho-lee"],
      },
      {
        time: "20:10",
        characterId: "gallery-junho-lee",
        location: "보안실",
        action: "서진이 보는 앞에서 조각 전시실 카메라를 비활성화했다.",
        witnessedBy: ["gallery-seojin-park"],
      },
      {
        time: "20:15",
        characterId: "gallery-yura-han",
        location: "제3전시실",
        action: "표절 의혹을 담은 전시 메모를 훼손했다.",
        witnessedBy: [],
      },
      {
        time: "20:20",
        characterId: "gallery-taesung-kim",
        location: "서비스 엘리베이터",
        action: "나리와 함께 대여 작품 운송 상자를 확인했다.",
        witnessedBy: ["gallery-nari-choi"],
      },
      {
        time: "20:20",
        characterId: "gallery-nari-choi",
        location: "서비스 엘리베이터",
        action: "태성과 운송 상자를 확인하며 수정한 기록을 감췄다.",
        witnessedBy: ["gallery-taesung-kim"],
      },
      {
        time: "20:25",
        characterId: "gallery-jihun-oh",
        location: "복원실",
        action: "청동 문진과 복원 장갑을 챙겨 윤아를 만날 준비를 했다.",
        witnessedBy: [],
      },
      {
        time: "20:30",
        characterId: "gallery-seojin-park",
        location: "관장실",
        action: "위조 영수증이 든 장부를 서랍에 숨겼다.",
        witnessedBy: [],
      },
      {
        time: "20:30",
        characterId: "gallery-yura-han",
        location: "물품보관실",
        action: "찢긴 원고 조각을 보관함에 숨겼다.",
        witnessedBy: [],
      },
      {
        time: "20:35",
        characterId: "gallery-jihun-oh",
        location: "조각 전시실",
        action: "윤아를 살해하고 선반 사고처럼 현장을 꾸몄다.",
        witnessedBy: [],
      },
      {
        time: "20:40",
        characterId: "gallery-taesung-kim",
        location: "조각 전시실 앞 복도",
        action: "닫힌 전시실 문 앞을 지나가며 안쪽의 낮은 소리를 들었다.",
        witnessedBy: [],
      },
      {
        time: "20:40",
        characterId: "gallery-nari-choi",
        location: "자료보관실",
        action: "윤아의 상태 보고서를 찾아 자신의 서류함에 숨겼다.",
        witnessedBy: [],
      },
      {
        time: "20:45",
        characterId: "gallery-junho-lee",
        location: "조각 전시실",
        action: "순찰 중 윤아를 발견하고 비상 호출을 했다.",
        witnessedBy: [],
      },
    ],
  },
} satisfies Scenario;
