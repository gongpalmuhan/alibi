import type { Scenario } from "../../../../packages/shared/src/types";

export const fourPlayersScenario = {
  id: "manual-four-mansion-1920",
  title: "재가 된 장부",
  theme: "1920년대 저택 살인 사건",
  playerCount: 4,
  intro:
    "1927년, 애슈퍼드 저택의 가면무도회가 끝난 직후 집주인 빈센트 애슈퍼드가 서재에서 숨진 채 발견됐다. 폭풍으로 전화선이 끊긴 밤, 저택 안의 네 사람만이 진실을 알고 있다.",
  victim: {
    name: "빈센트 애슈퍼드",
    description:
      "저택 소유주이자 은행가로, 오래된 빚과 장부를 손에 쥔 채 손님들을 통제해 온 인물. 오후에 누군가의 횡령을 경찰에 알리겠다고 선언했다.",
    deathDescription:
      "22:18경 서재에서 황동 촛대에 맞아 숨진 채 발견됐다.",
  },
  characters: [
    {
      id: "mansion-clara-ashford",
      name: "클라라 애슈퍼드",
      occupation: "저택의 안주인",
      publicProfile:
        "빈센트의 조카이자 이번 가면무도회의 주최자다. 침착하게 손님들을 진정시키지만, 삼촌과의 관계가 최근 급격히 나빠졌다는 소문이 있다.",
      privateScript:
        "당신은 빈센트가 가족 신탁을 팔아넘기려 한다는 사실을 알고 있었다. 22:10에 그의 서재에서 신탁 관련 편지를 찾았고, 그곳에서 나오는 모습이 들킬까 봐 편지 한 장을 숨겼다. 살인은 하지 않았지만 서재에 갔다는 사실과 편지를 숨긴 일을 감춰야 한다.",
      secret:
        "신탁을 지키기 위해 빈센트의 서명이 든 오래된 빚 문서를 위조해 파기하려 했다.",
      objectives: [
        "신탁 편지를 숨긴 이유가 살해 동기로 보이지 않게 설명한다.",
        "빈센트가 자신의 재산을 둘러싸고 여러 사람을 협박했다는 점을 드러낸다.",
      ],
      isCulprit: false,
    },
    {
      id: "mansion-edmund-reed",
      name: "에드먼드 리드",
      occupation: "애슈퍼드 은행의 수석 회계사",
      publicProfile:
        "빈센트의 오랜 회계사로, 저택의 재정 사정에 가장 밝다. 오늘 밤 내내 지나치게 침착했고 장부 이야기가 나오면 화제를 바꾼다.",
      privateScript:
        "당신이 범인이다. 빈센트가 당신의 횡령을 발견해 다음 날 아침 경찰에 장부를 넘기려 하자, 22:18 서재에서 황동 촛대를 이용해 그를 살해했다. 동기는 수년간 빼돌린 공금을 감추기 위해서다. 장부 사본을 난로에 태웠고, 자신의 소매에 묻은 라벤더 향의 광택제를 지워야 했다. 22:12에 도서관에서 장부를 베끼던 일과 살해 뒤 서재에 있었던 일을 숨겨라.",
      secret:
        "가짜 투자 계좌로 은행 돈을 빼돌렸고, 빈센트는 이를 증명하는 원장을 금고에 보관하고 있었다.",
      objectives: [
        "태운 장부 조각을 클라라의 신탁 문제와 연결해 의심을 분산한다.",
        "자신의 시간대를 도서관과 복도로 자연스럽게 설명한다.",
      ],
      isCulprit: true,
    },
    {
      id: "mansion-beatrice-hale",
      name: "베아트리스 헤일",
      occupation: "재즈 가수",
      publicProfile:
        "무도회의 초청 가수로, 빈센트와 공개적으로 언쟁한 뒤 온실 쪽으로 사라졌다. 빈센트가 그녀의 계약을 취소하려 했다는 사실은 모두가 안다.",
      privateScript:
        "빈센트는 당신에게 빌려준 돈을 빌미로 비밀스러운 관계를 폭로하겠다고 협박했다. 22:15에 혼자 울기 위해 온실로 갔고 대니얼이 그곳에서 당신을 봤다. 당신은 빈센트의 계약서 사본을 찢어 화분에 숨겼다. 살인은 하지 않았지만 협박과 계약서 이야기는 마지막까지 감추고 싶다.",
      secret:
        "빈센트와의 관계 및 빚 때문에 그의 계약서 사본을 훔쳤다.",
      objectives: [
        "온실에 간 이유를 너무 일찍 밝히지 않고도 자신의 알리바이를 확보한다.",
        "에드먼드가 도서관에서 무엇을 베끼고 있었는지 다른 사람에게 묻는다.",
      ],
      isCulprit: false,
    },
    {
      id: "mansion-daniel-crowe",
      name: "대니얼 크로우",
      occupation: "저택의 집사",
      publicProfile:
        "애슈퍼드 가문을 오래 모신 집사다. 손님들의 동선을 가장 잘 알지만, 사건 직전 은식기 보관실 근처에서 수상하게 서성였다는 말을 들었다.",
      privateScript:
        "당신은 빈센트가 숨긴 은제 커프스 단추 한 쌍을 찾아 22:05에 서비스 복도에서 챙겼다. 22:15에 온실의 베아트리스를 봤고, 22:20 복도에서 서재 쪽을 살피는 클라라를 봤다. 절도 사실 때문에 진술을 늦추었지만 살인은 하지 않았다. 훔친 단추와 서비스 복도에 있었던 일을 감춰라.",
      secret:
        "도박 빚을 갚기 위해 은제 커프스 단추를 훔쳤다.",
      objectives: [
        "절도와 살인은 별개의 일임을 설득한다.",
        "베아트리스와 클라라를 본 정확한 시각을 필요할 때 공개한다.",
      ],
      isCulprit: false,
    },
  ],
  clues: [
    {
      id: "mansion-burned-ledger",
      title: "난로 속 장부 조각",
      content:
        "서재 난로에서 태운 장부 조각이 발견됐다. 조각에는 은행의 가공 계좌 번호와 애슈퍼드 신탁의 약자가 함께 적혀 있다.",
      revealPhase: "investigation",
      pointsTo: ["mansion-edmund-reed", "mansion-clara-ashford"],
    },
    {
      id: "mansion-garden-soil",
      title: "온실 흙자국",
      content:
        "온실 출입문과 서재 창가에서 같은 화분 흙이 발견됐다. 비가 오기 전 누군가가 창가에 접근했던 흔적이다.",
      revealPhase: "investigation",
      pointsTo: ["mansion-beatrice-hale", "mansion-daniel-crowe"],
    },
    {
      id: "mansion-polished-candlestick",
      title: "광택 낸 황동 촛대",
      content:
        "살해 도구로 보이는 황동 촛대에는 최근 닦아 낸 얼룩과 라벤더 향 광택제 냄새가 남아 있다. 그 광택제는 회계실과 안주인 방 모두에 비치돼 있다.",
      revealPhase: "discussion",
      pointsTo: ["mansion-edmund-reed", "mansion-clara-ashford"],
    },
    {
      id: "mansion-service-key",
      title: "서비스 복도 열쇠",
      content:
        "서재 옆 서비스 문은 안쪽에서 잠긴 채였고, 대니얼의 열쇠고리와 같은 규격의 예비 열쇠가 주방 서랍에서 사라져 있다.",
      revealPhase: "voting",
      pointsTo: ["mansion-daniel-crowe", "mansion-edmund-reed"],
    },
    {
      id: "mansion-ink-stain",
      title: "푸른 잉크 얼룩",
      content:
        "빈센트의 손등과 재가 된 장부 가장자리에서 같은 푸른 잉크가 검출됐다. 잉크는 금고 원장을 대조할 때 쓰던 표식용이었다.",
      revealPhase: "reveal",
      pointsTo: ["mansion-edmund-reed", "mansion-clara-ashford"],
    },
  ],
  truth: {
    culpritId: "mansion-edmund-reed",
    motive:
      "빈센트가 에드먼드의 가공 계좌 횡령을 밝혀 내고 원장을 경찰에 넘기려 했기 때문이다.",
    method:
      "에드먼드는 서재에서 빈센트를 황동 촛대로 살해한 뒤 장부 사본을 난로에 태우고 도구를 닦아 지문과 흔적을 지우려 했다.",
    timeline: [
      {
        time: "21:55",
        characterId: "mansion-clara-ashford",
        location: "응접실",
        action: "가면무도회 손님들을 배웅하며 빈센트와 재산 문제를 두고 짧게 다퉜다.",
        witnessedBy: ["mansion-edmund-reed", "mansion-beatrice-hale"],
      },
      {
        time: "21:55",
        characterId: "mansion-edmund-reed",
        location: "응접실",
        action: "클라라와 빈센트의 언쟁을 듣고 장부 이야기를 꺼내지 못하게 막았다.",
        witnessedBy: ["mansion-clara-ashford", "mansion-beatrice-hale"],
      },
      {
        time: "21:55",
        characterId: "mansion-beatrice-hale",
        location: "응접실",
        action: "연주를 마치고 두 사람의 언쟁을 지켜봤다.",
        witnessedBy: ["mansion-clara-ashford", "mansion-edmund-reed"],
      },
      {
        time: "22:05",
        characterId: "mansion-daniel-crowe",
        location: "서비스 복도",
        action: "은제 커프스 단추를 훔겨 챙겼다.",
        witnessedBy: [],
      },
      {
        time: "22:10",
        characterId: "mansion-clara-ashford",
        location: "서재",
        action: "신탁 편지를 찾기 위해 빈센트의 책상 서랍을 뒤졌다.",
        witnessedBy: [],
      },
      {
        time: "22:12",
        characterId: "mansion-edmund-reed",
        location: "도서관",
        action: "가공 계좌가 적힌 장부 사본을 베끼고 있었다.",
        witnessedBy: ["mansion-beatrice-hale"],
      },
      {
        time: "22:12",
        characterId: "mansion-beatrice-hale",
        location: "도서관",
        action: "온실로 가기 전 에드먼드가 장부를 베끼는 모습을 봤다.",
        witnessedBy: ["mansion-edmund-reed"],
      },
      {
        time: "22:15",
        characterId: "mansion-beatrice-hale",
        location: "온실",
        action: "계약서 사본을 화분에 숨기고 혼자 울었다.",
        witnessedBy: ["mansion-daniel-crowe"],
      },
      {
        time: "22:15",
        characterId: "mansion-daniel-crowe",
        location: "온실",
        action: "은식기 보관실에서 돌아오다 베아트리스를 발견했다.",
        witnessedBy: ["mansion-beatrice-hale"],
      },
      {
        time: "22:18",
        characterId: "mansion-edmund-reed",
        location: "서재",
        action: "빈센트를 살해하고 촛대를 닦은 뒤 장부 사본을 난로에 태웠다.",
        witnessedBy: [],
      },
      {
        time: "22:20",
        characterId: "mansion-clara-ashford",
        location: "중앙 복도",
        action: "서재 쪽에서 나는 소리를 확인하려다 대니얼과 마주쳤다.",
        witnessedBy: ["mansion-daniel-crowe"],
      },
      {
        time: "22:20",
        characterId: "mansion-daniel-crowe",
        location: "중앙 복도",
        action: "클라라가 서재 쪽을 바라보는 모습을 보고 함께 멈춰 섰다.",
        witnessedBy: ["mansion-clara-ashford"],
      },
    ],
  },
} satisfies Scenario;
