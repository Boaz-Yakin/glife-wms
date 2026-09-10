# 에러 처리 패턴
<!-- 프로젝트 전반의 일관된 에러 처리 전략 -->

## 에러 계층 구조

```typescript
// types/errors.ts

// 기본 애플리케이션 에러
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// 도메인별 에러
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'AUTHENTICATION_ERROR', 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'AUTHORIZATION_ERROR', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}
```

## API Route에서 에러 처리

```typescript
// lib/api/error-handler.ts
import { NextResponse } from 'next/server'
import { AppError } from '@/types/errors'

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  
  // 예상치 못한 에러는 Sentry에 기록하고 제네릭 메시지 반환
  console.error('[Unexpected Error]', error)
  // Sentry.captureException(error)
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

## Client Component에서 에러 처리

```typescript
// 패턴: try-catch + toast 알림
import { toast } from 'sonner' // 또는 다른 토스트 라이브러리

async function handleSubmit(data: FormData) {
  try {
    const result = await someAction(data)
    if (!result.success) {
      toast.error(result.error.message)
      return
    }
    toast.success('저장되었습니다')
  } catch (error) {
    // 네트워크 오류 등 예상치 못한 에러
    toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    console.error(error)
  }
}
```

## 절대 하면 안 되는 것

```typescript
// ❌ 에러 메시지에 민감 정보 노출
return NextResponse.json({ error: error.message }) // DB 에러 메시지 노출 위험

// ❌ 에러 무시
try { ... } catch (e) {}

// ❌ any 타입으로 에러 처리
} catch (e: any) { console.log(e.message) }

// ✅ 올바른 방법
} catch (error) {
  if (error instanceof Error) {
    // 처리
  }
  // 또는 unknown 타입으로 타입 가드 사용
}
```
