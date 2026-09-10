# 지식 베이스 (.knowledge/)

프로젝트 개발 과정에서 발생하는 재사용 가능한 코드 패턴과 문제 해결 가이드(Gotchas)를 축적하는 공간입니다. AI 에이전트는 작업 시작 전 이 폴더를 반드시 확인합니다.

---

## 디렉토리 구조

```
.knowledge/
├── README.md               # 이 파일 (인덱스)
├── patterns/               # 추천 아키텍처 및 구현 패턴
│   ├── api-route.md        # API 라우트 표준 작성 패턴
│   ├── error-handling.md   # 통합 에러 처리 및 Result 타입 패턴
│   └── service-layer.md    # DB/외부 API 접근 서비스 레이어 패턴
└── gotchas/                # 알려진 함정, 버그 및 주의사항
    ├── hydration-mismatch.md      # SSR / 클라이언트 하이드레이션 불일치 방지
    ├── supabase-rls-security.md   # Supabase RLS 정책 및 보안 키 분리 주의점
    └── server-client-boundary.md  # Server/Client 컴포넌트 경계선 및 보안
```

---

## 추가 규칙
1. 새로운 공통 유틸이나 복잡한 모듈 패턴을 완성했을 때는 `patterns/`에 템플릿을 추가합니다.
2. 디버깅에 30분 이상 소요된 함정이나 라이브러리 간 호환성 이슈는 `gotchas/`에 원인과 해결책을 기록합니다.
