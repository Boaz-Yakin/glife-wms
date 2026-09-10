# API Route 핸들러 패턴
<!-- Next.js 15 App Router 기준 -->

## 기본 구조 (표준 패턴)

```typescript
// app/api/{resource}/{action}/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { {ServiceName}Service } from '@/services/{service}.service'

// 1. 요청 스키마 정의 (Zod)
const RequestSchema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
})

export async function POST(request: NextRequest) {
  try {
    // 2. 인증 검증 (보호된 라우트의 경우)
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. 요청 파싱 & 검증
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // 4. 비즈니스 로직 (Service 레이어 위임)
    const result = await {ServiceName}Service.create(parsed.data, user.id)

    // 5. 성공 응답
    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    // 6. 예외 처리
    console.error('[API ERROR] POST /api/{resource}:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## GET 요청 (쿼리 파라미터 처리)

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  
  // ...
}
```

## 동적 라우트 파라미터

```typescript
// app/api/{resource}/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // Next.js 15: params is async
) {
  const { id } = await params
  // ...
}
```

## 주의사항 (Next.js 15)

> [!WARNING]
> Next.js 15에서 `params`와 `searchParams`는 **async**로 변경되었다.
> `const { id } = await params` 형태로 사용해야 한다.
