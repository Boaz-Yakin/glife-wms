# Service 레이어 패턴
<!-- 모든 비즈니스 로직과 DB 접근은 이 레이어를 통한다 -->

## 기본 구조

```typescript
// services/{resource}.service.ts
import { createClient } from '@/lib/supabase/server'
import type { {Resource}, Create{Resource}Input, Update{Resource}Input } from '@/types/{resource}'

// Result 타입 패턴 (에러를 throw 대신 반환)
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

export const {Resource}Service = {
  
  async findById(id: string): Promise<Result<{Resource}>> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('{table_name}')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return { success: false, error: new Error(error.message) }
    return { success: true, data }
  },

  async findMany(userId: string, options?: { limit?: number; page?: number }) {
    const supabase = createClient()
    const { limit = 20, page = 1 } = options ?? {}
    
    const { data, error, count } = await supabase
      .from('{table_name}')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })
    
    if (error) return { success: false, error: new Error(error.message) }
    return { success: true, data, total: count ?? 0 }
  },

  async create(input: Create{Resource}Input, userId: string): Promise<Result<{Resource}>> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('{table_name}')
      .insert({ ...input, user_id: userId })
      .select()
      .single()
    
    if (error) return { success: false, error: new Error(error.message) }
    return { success: true, data }
  },

  async update(id: string, input: Update{Resource}Input, userId: string): Promise<Result<{Resource}>> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('{table_name}')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)  // 소유권 검증
      .select()
      .single()
    
    if (error) return { success: false, error: new Error(error.message) }
    if (!data) return { success: false, error: new Error('Not found or unauthorized') }
    return { success: true, data }
  },

  async delete(id: string, userId: string): Promise<Result<void>> {
    const supabase = createClient()
    const { error } = await supabase
      .from('{table_name}')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)  // 소유권 검증
    
    if (error) return { success: false, error: new Error(error.message) }
    return { success: true, data: undefined }
  }
}
```

## 핵심 원칙

1. **단일 책임**: 각 Service는 하나의 도메인 리소스만 담당한다
2. **소유권 검증**: update/delete는 항상 `user_id`를 조건에 포함한다 (RLS 이중 보호)
3. **에러 처리**: `throw` 대신 `Result` 타입으로 에러를 반환한다
4. **타입 안전성**: 입력/출력 타입을 명시한다. `any` 금지
