# CJ Fulfillment & 460 Slots Warehouse Architecture Spec
## CJ 브랜치 3PL 소분 풀필먼트 & 460 슬롯 재고관리 아키텍처

> **문서 버전**: v2.0.0  
> **최종 수정일**: 2026-11-24  
> **참조 원본**: `c:\Users\boazn\Projects\CJ-Inv\docs\DEVELOPMENT_PLAN.md`  
> **대상**: WMS 백엔드 및 CJ-Inv 프론트엔드 연동 통합 사양서  

---

### 1. 운영 비즈니스 모델 요약
1. **화주사 (CJ 본청)**:
   * 재고 보충(Push Inbound) 및 지점별 수요 할당을 전담 (창고는 결품/수요예측 부담 없음).
   * 각 지점/브랜치로 출고가 필요할 때, **Pick Ticket(피킹 지시서)**과 **BOL(Bill of Lading, 화물운송장)**을 창고에 제공.
2. **내 물류센터 (3PL 풀필먼트 센터)**:
   * **Picking(소분 피킹) $\rightarrow$ Packing(합포장) $\rightarrow$ Delivery(배송 상차)** 전담.
   * 실물 재고의 분실, 파손, 오출고를 방지하고 책임 소재를 명확히 하기 위해 **자체 전산 재고관리(Self Inventory Management)** 필수 병행.
3. **시범 운영 계획**:
   * **초기 2개 매장(Sandy Springs 직영점 외 1곳) 시범 파일럿** 런칭 $\rightarrow$ 피킹/패킹/BOL 안정화 후 전 매장 확대.

---

### 2. 가용 슬롯 공간 분할 (초기 460 슬롯 기준, 동적 확장 아키텍처)
* **슬롯 가변성 및 실제 맵 제외 원칙**:
  * **전용 예약 슬롯 배정 (총 16개 슬롯)**:
    * **1R-01(F,A,B,C) & 1R-02(F,A,B,C)**: 아일 1 전용 예약 슬롯 (8슬롯 `RESERVED`).
    * **2L-02(F,A,B,C) & 2R-02(F,A,B,C)**: 아일 2 전용 예약 슬롯 (8슬롯 `RESERVED`).
  * **아일별 가용 슬롯 집계**: 아일 1(193: 1R-01/02 8슬롯 예약 반영) + 아일 2(187: 2L/2R-02 8슬롯 예약 반영) + 아일 3(72) = **총 452 가용 슬롯** (전용 예약 16슬롯 별도 분리 관리).
  * 슬롯 수(현재 452개)는 고정 상수가 아니며, 창고 랙 증설 및 레이아웃 변경에 따라 동적으로 N개까지 증가할 수 있도록 DB `locations` 테이블 기반으로 설계.
* **Reserve Zone (가용 392 슬롯 + 예약 16 슬롯)**: 랙 상단단 (B, C단). 미개봉 Full Pallet 적치, LPN 관리, 3PL 보관료 정산 대상. (랙 증설 시 우선 확장 구역)
* **Active Pick-Face Zone (초기 40 슬롯)**: 랙 1단 (FLOOR/A단). `cj_inventory.xlsx`의 30개 자재 마스터 전용 고정 슬롯(Fixed Bins). 박스 오픈 및 팩(`PAC`)/낱개(`EA`) 단위 보관. (신규 SKU 입고 시 슬롯 추가 할당)
* **Staging / Dispatch Zone (초기 20 슬롯)**: 출하 도크 앞. 매장별 피킹/패킹 완료 토트 보관, CJ BOL 라벨 부착 및 상차 대기. (매장 수 증가에 따라 버퍼 슬롯 유연 조정)

---

### 3. UOM 계층 및 30개 자재 품목
* `Pallet` $\rightarrow$ `Box` $\rightarrow$ `PAC` $\rightarrow$ `EA`
* `ROH2` (포장재 19종), `HIBE` (소모품/비품 11종), `HAWA` (MD 1종).
* 매장 요청 단위: `PAC` 또는 `BOX`.

---

### 4. 엔드투엔드 출고 파이프라인
1. **CJ 본청**: 2개 시범 매장의 Pick Ticket 및 BOL 발행.
2. **WMS**: 460 슬롯 위치 기반 S-Shape 피킹 작업 지시서 생성.
3. **보충 (필요 시)**: Reserve 상단 랙 $\rightarrow$ Floor 피킹 슬롯으로 팔렛/박스 하역.
4. **소분 피킹**: 작업자가 1단 슬롯에서 매장별 필요 수량(PAC/BOX) 피킹.
5. **합포장 및 패킹**: 매장별 배송 박스에 패킹 후 CJ BOL 라벨 부착.
6. **상차 및 출고 확정**: 트럭 상차 시 WMS 출고 확정 (`DISPATCHED`) $\rightarrow$ 실물 재고 영구 차감.

---

### 5. 자체 재고관리 및 오차 통제
* **이중 원장 (Dual Ledger)**: Reserve(미개봉 팔렛) vs Pick-Face(소분 수량).
* **주간 순환 실사 (Cycle Counting)**: 30개 품목 대상 3분 고속 실사.
* **파손/감모 로깅 (Damaged Goods Logging)**: 사유 코드 기록 및 CJ 보고서 정산.
