# Gotcha: Supabase RLS & 보안 정책 함정

## 문제 상황
Supabase/PostgreSQL 사용 시 테이블을 생성하고 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`를 설정하지 않거나, 잘못된 정책으로 인해 모든 데이터가 익명 사용자에게 노출되거나 반대로 인증된 사용자의 정상 쿼리가 차단되는 문제가 발생합니다.

## 핵심 규칙

### 1. 테이블 생성 시 무조건 RLS 활성화
```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 필수: RLS 활성화 누락 금지
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
```

### 2. Service Role Key vs Anon Key 분리
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: 브라우저(클라이언트)에 공개되는 키. 항상 RLS의 통제를 받음.
- **`SUPABASE_SERVICE_ROLE_KEY`**: 서버 사이드 전용 비밀 키. RLS를 우회(Bypass)하므로 절대 `NEXT_PUBLIC_` 접두사를 붙이거나 클라이언트 컴포넌트에 넘기지 않는다.

### 3. 표준 사용자 소유권(Ownership) 정책 템플릿
```sql
-- SELECT 정책
CREATE POLICY "Users can select own items"
ON items FOR SELECT
USING (auth.uid() = user_id);

-- INSERT 정책 (user_id 조작 방지)
CREATE POLICY "Users can insert own items"
ON items FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책
CREATE POLICY "Users can update own items"
ON items FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE 정책
CREATE POLICY "Users can delete own items"
ON items FOR DELETE
USING (auth.uid() = user_id);
```
