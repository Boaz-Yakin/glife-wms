# Gotcha: Hydration Mismatch (하이드레이션 불일치 방지)

## 문제 상황
Next.js (App Router/SSR) 환경에서 서버에서 렌더링한 HTML과 클라이언트에서 브라우저가 최초 렌더링한 Virtual DOM이 일치하지 않을 때 `Hydration failed because the initial UI does not match what was rendered on the server` 오류가 발생합니다.

## 주요 원인
1. **브라우저 전용 API 직접 참조**: `window`, `localStorage`, `document.cookie` 등을 컴포넌트 렌더 본문에서 직접 호출하여 UI를 분기하는 경우.
2. **시간/랜덤 값 렌더링**: `new Date()`, `Date.now()`, `Math.random()`을 직접 텍스트로 출력하는 경우 (서버 시각과 브라우저 시각 차이).
3. **잘못된 HTML 태그 중첩**: `<p>` 태그 내부에 `<div>`나 `<p>`가 들어가는 등 HTML 스펙 위반 구조.

## 해결 및 예방 패턴

### 1. `mounted` 상태 패턴 (클라이언트 전용 렌더링 분기)
```tsx
'use client';

import { useState, useEffect } from 'react';

export function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // 서버 및 초기 클라이언트 렌더 시 일관된 플레이스홀더 출력
    return <div className="skeleton-loader h-8 w-24" />;
  }

  return <div>{localStorage.getItem('theme') || 'default'}</div>;
}
```

### 2. `suppressHydrationWarning` 사용 (시각/날짜 포맷 한정)
```tsx
<time dateTime={dateString} suppressHydrationWarning>
  {formatDate(dateString)}
</time>
```
