-- ==============================================================================
-- Migration: Remove Kakao Notification features completely
-- Description: 카카오톡 알림톡 관련 설정 및 컬럼 완전 삭제
-- ==============================================================================

-- 1. tenant_settings에서 kakao_notification_enabled 컬럼 삭제
ALTER TABLE public.tenant_settings 
DROP COLUMN IF EXISTS kakao_notification_enabled;

-- 2. system_settings 테이블에서 kakao 관련 레코드 삭제
DELETE FROM public.system_settings 
WHERE key LIKE '%kakao%';

-- 3. PostgREST 스키마 캐시 새로고침
NOTIFY pgrst, 'reload schema';
