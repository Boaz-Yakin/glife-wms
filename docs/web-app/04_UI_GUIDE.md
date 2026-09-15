# UI Guide: web-app 디자인 가이드
<!-- 작성일: 2026-09-14 | 프로젝트: web-app (사무실 관리자용 백오피스 대시보드) -->

## 1. Design Principles (디자인 원칙)

백오피스 환경은 한 번에 많은 정보를 정확하게 전달하고 조작할 수 있어야 합니다.
- **Desktop-First**: 모바일 앱과 달리 가로 1024px 이상의 넓은 모니터 환경(PC/태블릿)에 최적화된 레이아웃을 구성합니다.
- **정보 밀도(Information Density)**: 여백을 적절히 줄이고 멀티 칼럼 데이터 테이블을 활용하여 한 화면에 최대한 유의미한 데이터를 노출합니다.
- **명확성(Clarity)**: 중요한 지표(결품 경고, 미처리 주문 수)는 눈에 띄는 색상과 뱃지로 강조하고, 그 외의 정보는 무채색 톤으로 차분하게 배치합니다.

## 2. Color System (색상 시스템)
`shadcn/ui`의 기본 테마 변수(`CSS Variables`)를 활용하며, 시인성이 높은 깔끔한 모던 테마(예: Zinc 또는 Slate 기반)를 채택합니다.
- **Primary**: Brand Color (e.g., 진한 파랑/검정) - 주요 액션 버튼(저장, 출력 등)
- **Destructive**: Red (e.g., #ef4444) - 삭제, 경고, 긴급 실사 알림
- **Success**: Green (e.g., #22c55e) - 정상 처리, 완료 상태
- **Background**: 라이트 모드(White/Gray-50) 중심이나, 장시간 모니터링 관리자를 위한 다크 모드(Dark Mode) 토글 지원 필수.

## 3. Typography (타이포그래피)
- **Font-Family**: 가독성이 뛰어난 산세리프 폰트 `Inter` 또는 `Pretendard` 적용.
- **Data Table Font**: 숫자나 바코드(UPC) 등의 고정 폭(Tabular) 정렬을 위해 테이블 내 데이터는 `font-variant-numeric: tabular-nums;` 적용.

## 4. Key UI Components (핵심 컴포넌트)

### 4.1 LNB (Left Navigation Bar)
좌측에 고정된 네비게이션(사이드바)을 통해 대시보드, 재고 현황, 마스터 관리 탭으로 빠르게 이동합니다.

### 4.2 Data Table (데이터 그리드)
- 상단 제어부: 글로벌 검색창, 기간 필터(Date Range Picker), 조건 필터(Select).
- 본문부: Sticky Header를 적용한 스크롤 가능한 테이블. 상태별 배지(Badge) 컴포넌트 적용.
- 하단 제어부: 페이지네이션(Pagination) 및 엑셀 다운로드 버튼 배치.

### 4.3 Dashboard Widgets
- **KPI 카드**: 당일 총 출고량, 결품 수 등 요약 수치를 보여주는 Card 컴포넌트 상단 배치.
- **시각화 차트**: Recharts 기반의 Line Chart(시간대별 피킹량) 및 Pie Chart(재고 상태 비율) 제공.