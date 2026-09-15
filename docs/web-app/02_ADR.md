# ADR: web-app 아키텍처 결정 (Architecture Decision Records)
<!-- 작성일: 2026-09-14 | 프로젝트: web-app (사무실 관리자용 백오피스 대시보드) -->

## 1. Context & Problem Statement
현장 작업자 앱(`mobile-app`)의 트래픽과 기능을 극단적으로 경량화하기 위해, 복잡한 통계 처리와 마스터 데이터 관리를 담당할 별도의 백오피스 웹 애플리케이션(`web-app`) 구축이 필요해졌습니다. 데스크탑 환경에서 방대한 데이터를 빠르고 안정적으로 렌더링하며 직관적인 관리 경험을 제공하기 위한 아키텍처 결정을 기록합니다.

## 2. Decision Drivers (결정의 핵심 동인)
- **높은 정보 밀도**: 엑셀 수준의 다중 칼럼 테이블과 복잡한 필터링 요구.
- **생산성 및 유지보수**: 빠른 UI 개발과 일관성 있는 디자인 시스템 도입.
- **데이터 실시간성**: 현장(`mobile-app`)의 변화를 관리자가 지연 없이 확인.

---

## 3. Considered Options & Decision Outcome

### ADR-1: 프론트엔드 프레임워크 선택
- **선택**: **Next.js 15 (App Router)**
- **이유**: `mobile-app`과의 Monorepo 구조 하에서 기술 스택을 통일하여 러닝 커브와 유지보수 비용을 최소화합니다. Server Component를 적극 활용해 무거운 데이터 패칭을 서버 단에서 처리합니다.

### ADR-2: UI 컴포넌트 라이브러리 및 디자인 시스템
- **선택**: **shadcn/ui + Tailwind CSS**
- **이유**: 백오피스에 필수적인 Data Table, Date Picker, Select, Modal 등 복잡한 컴포넌트를 직접 구현하지 않고 높은 커스터마이징 자유도와 접근성(Radix UI 기반)을 확보할 수 있습니다.

### ADR-3: 상태 관리 (State Management)
- **선택**: **Zustand (클라이언트 전역 상태) + React Query (서버 상태)**
- **이유**: 필터, 검색 조건 등 UI 상태는 `Zustand`로 가볍게 관리하고, 방대한 DB 조회 및 캐싱(Pagination 포함)은 `React Query`를 통해 효율적으로 분리합니다.

### ADR-4: 데이터 테이블 렌더링 엔진
- **선택**: **TanStack Table (React Table v8)**
- **이유**: 수백 건 이상의 재고 및 주문 내역을 DOM 과부하 없이 렌더링(Virtualization 연동)하고, 정렬/필터링/선택 기능을 Headless하게 구현하기 위한 표준입니다.

## 4. Implications (영향)
- **긍정적 효과**: `shadcn/ui`와 `TanStack Table` 도입으로 백오피스 개발 속도가 비약적으로 상승하며, 데스크탑 최적화 UX를 보장합니다.
- **부정적/주의 효과**: `shadcn/ui`는 직접 코드를 소유(copy & paste)하는 방식이므로, 향후 컴포넌트 코드가 방대해질 수 있어 디렉토리 관리에 유의해야 합니다.