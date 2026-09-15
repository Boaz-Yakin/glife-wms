# 구글 시트 ➡️ Supabase 마이그레이션 브리핑

구글 시트를 데이터베이스로 사용하는 기존 방식에서 Supabase(PostgreSQL)로 이전하기 위해 고려해야 할 보안/구조적 개선 사항과 단계별 마이그레이션 계획을 정리했습니다.

---

## 1. 기존 구글 시트 방식의 한계 및 보완해야 할 점

### 🚨 보안 및 권한 제어 (Security & RLS)
- **현재 문제**: 구글 시트는 통상적으로 앱에 내장된 하나의 서비스 계정을 통해 시트 전체에 접근합니다. 누군가 앱 소스코드에서 API 키를 탈취하면 전체 데이터를 변조하거나 삭제할 수 있습니다.
- **보완 사항**: Supabase의 **RLS (Row Level Security)** 를 적용해야 합니다. 예를 들어, `Orders` 테이블은 "로그인한 유저 본인이 주문한 내역만" 볼 수 있도록 DB 레벨에서 접근을 차단해야 합니다. `Users` 탭의 비밀번호(PASSWORD_HASH) 역시 자체 해싱보다 Supabase의 내장 **Auth** 시스템으로 이관하여 안전하게 관리해야 합니다.

### 🔗 데이터 정규화 및 무결성 (Normalization & Integrity)
- **현재 문제**: `Orders` 탭에 주문을 기록할 때 `STORE_NAME`, `STORE_ADDRESS`, `ITEM_NAME` 등 원본 데이터가 중복해서 복사/저장됩니다. 또한 오타가 발생하거나, 삭제된 상품의 코드가 입력되는 것을 막을 수 없습니다.
- **보완 사항**: 관계형 DB의 **외래키(Foreign Key)** 제약조건을 사용해야 합니다.
  - 매장명이나 주소 등은 `Stores` 테이블에만 두고, `Orders` 테이블에는 `store_id` (매장 고유 식별자)만 저장합니다.
  - 하나의 주문에 여러 상품이 들어갈 수 있으므로, `Orders`(주문서) 테이블과 `Order_Items`(주문 상세 상품) 테이블을 분리하는 **1:N 관계** 모델링이 필요합니다.

### ⚡ 동시성 문제 (Concurrency)
- **현재 문제**: 여러 사용자가 동시에 주문(Write)을 생성할 경우 구글 시트 특성상 데이터가 꼬이거나 충돌(Race Condition)이 발생할 수 있습니다.
- **보완 사항**: PostgreSQL은 트랜잭션(Transaction) 처리를 완벽하게 지원하므로 다중 사용자의 동시 접근 시 데이터 무결성을 보장합니다.

---

## 2. Supabase 데이터베이스 테이블 설계안 (제안)

기존 4개의 시트 탭을 아래와 같이 관계형 스키마로 재설계하는 것을 권장합니다.

| 분류 | 테이블명 | 주요 컬럼 (Schema) | 설명 및 RLS 권한 정책 |
| :--- | :--- | :--- | :--- |
| **인증** | `auth.users` | `id`, `email`, `phone`, `encrypted_password` | Supabase 내장 시스템 (직접 관리 불필요) |
| **유저 정보** | `profiles` | `id` (FK: auth.users.id), `name`, `role`, `status` | 로그인한 유저는 본인 정보만 Read/Update |
| **매장 정보** | `stores` | `id` (PK), `no`, `address` | 누구나 (또는 인증된 유저만) **Read-Only** |
| **상품 정보** | `items` | `id` (PK), `sku`, `upc`, `name_en`, `name_kr`, `box_price`, `unit_price` 등 | 누구나 (또는 인증된 유저만) **Read-Only** |
| **주문 내역** | `orders` | `id` (PK), `user_id` (FK), `store_id` (FK), `order_date`, `status`, `note` | 생성자 본인만 **Read/Write**, 관리자는 전체 Read |
| **주문 상세** | `order_items`| `id` (PK), `order_id` (FK), `item_id` (FK), `qty`, `uom`, `price` | *정규화를 위해 새로 추가된 테이블* |

> **Tip**: `order_items`에 `price`를 따로 두는 이유는, 나중에 상품 테이블의 단가가 오르더라도 "과거에 주문했을 당시의 가격"을 보존하기 위함입니다.

---

## 3. 마이그레이션 진행 단계별 구현 사항

성공적이고 안정적인 이전을 위해 아래와 같은 5단계로 진행하는 것을 추천합니다.

### Phase 1: 스키마 설계 및 인프라 구축 (DB / Auth)
- [ ] Supabase 프로젝트 생성 및 PostgreSQL 테이블(Schema) 구성.
- [ ] 테이블 간 외래키(Foreign Key) 관계 및 제약 조건(Not Null, Unique) 설정.
- [ ] Supabase Auth 설정 (전화번호/이메일 기반 로그인 시스템 활성화).

### Phase 2: 보안 정책 (RLS) 적용
- [ ] 테이블별 Row Level Security(RLS) 정책 작성 및 활성화.
- [ ] 환경 변수(`.env`) 세팅 및 클라이언트/서버 키 분리.
  - *프로젝트 룰(GEMINI.md)에 따라 외부 API(DB) 직접 접근은 `app/api/` 또는 Server Component 로직으로 보호해야 합니다.*

### Phase 3: 기존 데이터 클렌징 및 이관 (Data Migration)
- [ ] 구글 시트의 `Stores`, `Items` 탭 데이터를 CSV로 추출 후 Supabase에 Import.
- [ ] `Users` 시트에 있는 기존 회원 정보 마이그레이션 (Auth API를 통해 유저 생성 스크립트 작성).
- [ ] `Orders` 시트의 주문 내역을 파싱하여, 앞서 생성된 `stores`, `items`, `users`의 `id`값과 매핑하여 DB에 Insert하는 스크립트 실행.

### Phase 4: 애플리케이션 로직 리팩토링 (Code Migration)
- [ ] 기존 `dashboard/src/utils/googleSheets.ts` 로직을 `@supabase/supabase-js` 또는 서버사이드 로직으로 전면 교체.
- [ ] 자체 비밀번호 검증 코드를 Supabase Auth API (`signInWithPassword` 등)로 변경.
- [ ] 신규 데이터를 `Orders`와 `Order_Items` 테이블로 분리해서 트랜잭션 단위로 Insert 하도록 로직 수정.

### Phase 5: 병행 테스트 및 실 서비스 전환 (Cut-over)
- [ ] 기존 구글 시트와 새 Supabase DB가 동일한 결과를 뱉는지 대조 테스트 (QA).
- [ ] RLS 권한이 정상 작동하여 다른 유저의 주문 내역이 보이지 않는지 테스트.
- [ ] 구글 시트 API 연동 중단 후 완전한 서비스 전환.
