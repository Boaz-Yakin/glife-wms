# UI/UX 디자인 가이드
<!-- 컴포넌트 작성 전 반드시 읽어라. 디자인 일관성은 이 문서에서 시작된다 -->
<!-- 상세 UX 설계(플로우, 인터랙션)는 docs/03_TRD.md 및 docs/현장_재고_조사_UI_UX_설계.md를 참고한다 -->

> [!NOTE]
> 현장 재고 조사(Inventory Inspection & Cycle Count) 모듈의 구체적인 와이어프레임 및 인터랙션 상세 명세는 **[현장_재고_조사_UI_UX_설계.md](현장_재고_조사_UI_UX_설계.md)**를 참고하십시오.

## 디자인 원칙

1. **도구성 우선 (Utility First)**: "현장 작업자가 장갑을 끼고 한 손으로 쓰는 산업용 도구이지, 화려한 마케팅 웹페이지가 아니다."
2. **정보 밀도 & 시인성 (High Contrast & Legibility)**: 5.5인치 모바일 화면 기준 스크롤 없이 핵심 데이터(로케이션, 상품명, 수량)를 28px+ 대형 폰트로 즉각 파악 가능해야 한다.
3. **즉시 피드백 (Sub-50ms Tri-Feedback)**: 모든 바코드 스캔과 카운트 액션은 0.05초 이내에 시각(화면 플래시), 사운드(고주파 비프), 진동(햅틱) 3중으로 피드백된다.
4. **터치 타겟 극대화 (48px+ Touch Targets)**: 현장 장갑 착용 및 이동 중 흔들림을 고려하여 모든 인터랙션 버튼은 최소 높이 48px(주요 버튼 56px)을 보장한다.

---

## AI 슬롭 안티패턴 — 절대 사용 금지

> [!CAUTION]
> 아래 패턴은 "AI 템플릿 티가 나는" 비실용적 요소들이다. WMS 산업용 앱에서는 절대 사용하지 않는다.

| 금지 패턴 | 금지 이유 | 산업용 대안 |
|----------|---------|------|
| `backdrop-filter: blur()` / Glassmorphism | 저사양 PDA 성능 저하 및 텍스트 가독성 저해 | 불투명 고대비 배경 사용 (`bg-[#13161F]`) |
| 텍스트에 그라데이션 적용 | 산업용 현장 조명 아래 시인성 급감 | 단색 고대비 텍스트 (`#F8FAFC`) |
| Box-shadow 네온 글로우 효과 | 불필요한 렌더링 부하 및 장식적 요소 | 단색 1px 테두리 또는 명확한 배경색 변화 |
| 보라/인디고 브랜드 색상 | "AI SaaS = 보라색" 클리셰 | 산업 표준 블루(`Blue 600`), 에메랄드 그린, 앰버 사용 |
| 모든 카드에 동일한 `rounded-2xl` | 낭비되는 패딩 공간 및 장난감 같은 느낌 | 직관적이고 밀도 높은 `rounded-lg` 또는 `rounded-md` |
| 배경 gradient orb (blur 원형) | 산업용 업무 도구에 부적합한 장식 | 단색 칠흑 다크 배경 (`#090A0F`) |
| 불필요한 긴 애니메이션 | 작업 속도 지연 (1초에 수 차례 스캔해야 함) | 0.15초 이내의 즉각적인 상태 전환 트랜지션만 허용 |

---

## 색상 시스템 (WMS Dark Industrial System)

물류센터의 어두운 통로 및 강한 형광등 조명 환경에서 눈의 피로를 최소화하고, OLED/LCD 배터리를 절약하기 위해 **고대비 다크 테마**를 기본으로 채택한다.

### 1. 배경 (Background)
| 토큰 | Tailwind v4 / HEX | 사용처 |
|------|-------------------|--------|
| `bg-page` | `#090A0F` | 전체 뷰포트 배경 (칠흑 다크) |
| `bg-surface` | `#13161F` | 카드, 실사 패널, 테이블 컨테이너 |
| `bg-elevated` | `#1E2333` | 입력창, 모달 팝업, 퀵 카운트 패드 |
| `bg-hover` | `#282E44` | 터치 피드백, 목록 선택 상태 |

### 2. 텍스트 (Text)
| 토큰 | Tailwind v4 / HEX | 사용처 |
|------|-------------------|--------|
| `text-primary` | `#F8FAFC` (Slate-50) | 실물 수량(대형), 로케이션 코드, 품목명 |
| `text-secondary` | `#94A3B8` (Slate-400) | 규격, 바코드 번호, 본문 텍스트 |
| `text-muted` | `#64748B` (Slate-500) | 단위(BOX/EA), 필드 레이블, 등록 일시 |
| `text-disabled` | `#334155` (Slate-700) | 비활성 버튼 및 텍스트 |

### 3. 브랜드 & 시맨틱 색상 (TRD §5.2 규격 동기화)
| 토큰 | Tailwind v4 / HEX | 의미 및 사용처 |
|------|-------------------|----------------|
| `brand-primary` | `#2563EB` (Blue-600) | 네비게이션 활성 탭, 주요 진행 CTA 버튼 |
| `status-success` | `#10B981` (Emerald-500) | **MATCH (일치)**: 바코드 일치, One-Tap 전산 일치, 실사 완료 |
| `status-error` | `#EF4444` (Rose-500) | **MISMATCH (오차/오류)**: 실물 오차 발생, 바코드 불일치, 결품 |
| `status-warning` | `#F59E0B` (Amber-500) | **PENDING/URGENT**: 긴급 실사 요청, 수량 불일치 검토 대기 |
| `status-info` | `#0EA5E9` (Sky-500) | 대기 중인 실사 큐 배지, 일반 안내 토스트 |

### 4. 테두리 (Border)
| 토큰 | Tailwind v4 / HEX | 사용처 |
|------|-------------------|--------|
| `border-subtle` | `#1E293B` (Slate-800) | 카드 구분선, 리스트 항목 구분선 |
| `border-default` | `#334155` (Slate-700) | 기본 입력창 테두리, 카드 외곽선 |
| `border-focus` | `#3B82F6` (Blue-500) | 스캔 포커스 활성 상태 |
| `border-success` | `#10B981` (Emerald-500) | 정상 스캔 시 즉시 점멸되는 테두리 |
| `border-error` | `#EF4444` (Rose-500) | 오류 스캔 시 즉시 점멸되는 테두리 |

---

## 타이포그래피

### 폰트 패밀리
- **일반 UI & 품목명**: `Pretendard`, `Inter`, -apple-system, sans-serif
- **식별 코드 & 수량**: `JetBrains Mono`, `Fira Code`, monospace (숫자 오독 방지, tabular-nums 필수)

### 타입 스케일 (WMS 실무 기준)
| 역할 | 클래스 | 크기/두께 | 적용 대상 |
|------|--------|-----------|-----------|
| Giant Metric | `text-4xl sm:text-5xl font-extrabold font-mono tracking-tight` | 36px~48px | 실물 실사 카운트 수량, 핵심 잔여 개수 |
| Location Badge | `text-2xl font-black font-mono tracking-wider` | 24px | 현재 조사 중인 로케이션 (예: `A01-05-B01`) |
| Page Title | `text-lg font-bold text-primary` | 18px | 상단 헤더 타이틀, 모달 타이틀 |
| Item Title | `text-base font-semibold text-primary line-clamp-2` | 16px | 상품명 (2줄 말줄임 허용) |
| Body / Value | `text-sm font-medium text-secondary` | 14px | 일반 정보, 전산 재고 비교 수치 |
| Caption / Unit | `text-xs font-medium text-muted` | 12px | 단위(BOX, EA), 바코드 숫자 |

---

## WMS 전용 특화 컴포넌트 패턴

### 1. 실물 수량 대형 디스플레이 (Giant Quantity Counter)
```html
<div class="flex flex-col items-center justify-center p-6 bg-[#13161F] border border-[#334155] rounded-xl">
  <span class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">실물 확인 수량</span>
  <div class="flex items-baseline gap-2">
    <span class="text-5xl font-black font-mono text-emerald-400 tracking-tight">42</span>
    <span class="text-base font-bold text-slate-400">BOX</span>
  </div>
  <div class="mt-2 text-xs font-mono text-slate-400">전산 재고: 42 BOX (차이: 0)</div>
</div>
```

### 2. 장갑 대응 퀵 카운트 패드 (Quick Stepper Pad)
모든 버튼은 장갑을 낀 엄지손가락으로 쉽게 누를 수 있도록 **최소 높이 52px**을 유지한다.
```html
<div class="grid grid-cols-4 gap-2 w-full">
  <button class="h-14 bg-[#1E2333] hover:bg-[#282E44] active:scale-95 text-rose-400 font-mono font-bold text-lg rounded-lg border border-slate-700 transition-all">-10</button>
  <button class="h-14 bg-[#1E2333] hover:bg-[#282E44] active:scale-95 text-rose-300 font-mono font-bold text-xl rounded-lg border border-slate-700 transition-all">-1</button>
  <button class="h-14 bg-[#1E2333] hover:bg-[#282E44] active:scale-95 text-emerald-300 font-mono font-bold text-xl rounded-lg border border-slate-700 transition-all">+1</button>
  <button class="h-14 bg-[#1E2333] hover:bg-[#282E44] active:scale-95 text-emerald-400 font-mono font-bold text-lg rounded-lg border border-slate-700 transition-all">+10</button>
</div>
```

### 3. 하단 고정 One-Tap 전산 일치 바 (One-Tap Match Bar)
전산 재고와 실물이 일치할 때 단 한 번의 터치로 조사를 끝낼 수 있는 **전체 너비 56px 높이**의 대형 버튼이다.
```html
<div class="fixed bottom-0 left-0 right-0 p-4 bg-[#090A0F]/95 border-t border-slate-800 z-50">
  <button class="w-full h-14 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all">
    <CheckCircle2 class="w-6 h-6" />
    <span>전산 재고와 일치 (42 BOX 확정)</span>
  </button>
</div>
```

### 4. 로케이션 & 바코드 칩 (Monospace Identity Chip)
```html
<!-- 로케이션 표시 -->
<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-950/60 border border-blue-800 text-blue-300 font-mono font-bold text-sm rounded-md tracking-wider">
  <MapPin class="w-4 h-4 text-blue-400" />
  A01-05-B01
</span>

<!-- 상품 바코드 표시 -->
<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-800 text-slate-300 font-mono text-xs rounded border border-slate-700 tracking-wider">
  <Barcode class="w-3.5 h-3.5 text-slate-400" />
  8801043014854
</span>
```

---

## 3중 즉각 피드백 규격 (Tri-Feedback System)

현장 작업자는 화면을 계속 응시할 수 없으므로, 모든 스캔/확정 이벤트는 **0.05초 이내에 3중 감각**으로 피드백되어야 한다.

```
[바코드 스캔 또는 수량 확정 이벤트 발생]
       │
       ├── 1. 시각 (Visual): 화면 테두리 0.1초 플래시 (일치: #10B981 / 오류: #EF4444)
       ├── 2. 청각 (Audio): Web Audio API 신디사이저 즉시 재생 (무지연)
       │       - 성공: 880Hz (A5) Sine파 80ms
       │       - 에러: 220Hz (A3) Sawtooth파 150ms 2회 반복
       └── 3. 촉각 (Haptic): Navigator.vibrate()
               - 성공: vibrate([60]) 단발 짧은 진동
               - 경고/오류: vibrate([150, 80, 150]) 2연속 강한 진동
```

---

## 레이아웃 및 반응형 브레이크포인트

| 사용자 역할 | 주요 디바이스 | 브레이크포인트 | 레이아웃 기준 |
|------------|---------------|---------------|---------------|
| **INSPECTOR (검수/실사)** | 5.0~6.5" PDA / 안드로이드 폰 | `360px ~ 430px` | **Mobile-First**: 전체 너비 100%, 하단 고정 액션바, 한 손 조작 |
| **PICKER (피킹 작업자)** | 5.5" 손목 거치형 단말기 | `360px ~ 430px` | **Mobile-First**: No-Click 초간결 단일 뷰, 스크롤 제로 |
| **ADMIN (관리자)** | 24~27" 모니터 / 태블릿 | `1024px ~ 1920px` | **Desktop-First**: 좌측 네비게이션, 멀티 칼럼 데이터 테이블 |

- **모바일 기본 여백**: `px-4 py-3`
- **모바일 하단 세이프존**: `pb-24` (고정형 One-Tap 버튼 공간 확보)
- **데스크톱 컨테이너**: `max-w-7xl mx-auto px-6`

---

## 애니메이션 및 상태 전환 규칙

- **허용 (즉각적 반응)**:
  - `transition-colors duration-150`: 터치 및 버튼 누름 피드백
  - `transition-transform duration-100 active:scale-95`: 버튼 클릭 햅틱 느낌 부여
  - `animate-fade-in duration-200`: 모달 및 토스트 메시지 등장
- **금지**:
  - 회전 루프 애니메이션 (무한 로딩 스피너 제외)
  - 0.3초 이상 걸리는 모든 딜레이 효과
  - 배경 그라데이션 이동 애니메이션

---

## 아이콘 시스템 (`lucide-react`)

- **패키지**: `lucide-react` (나무 흔들기 최적화 및 SVG 렌더링)
- **크기 표준**:
  - 인라인 아이콘: `w-4 h-4` (16px)
  - 버튼 내부 아이콘: `w-5 h-5` (20px)
  - 대형 상태 아이콘: `w-8 h-8` ~ `w-12 h-12` (오류/성공 모달)
- **두께 (strokeWidth)**: `2.0` (현장 가독성을 위해 기본 1.5보다 두꺼운 2.0 권장)
- **주요 아이콘 매핑**:
  - 바코드 스캔: `ScanBarcode`
  - 로케이션/위치: `MapPin`
  - 품목/박스: `Package`
  - 전산 일치: `CheckCircle2`
  - 오차/경고: `AlertTriangle`
  - 재고 이동: `ArrowRightLeft`
  - 새로고침/동기화: `RefreshCw`
