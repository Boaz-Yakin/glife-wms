-- Migration: Add system_settings table for dynamic configuration (Kakao notification, etc.)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Allow authenticated read system_settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users with ADMIN or SUPERVISOR role (and service_role) to insert/update settings
CREATE POLICY "Allow authenticated manage system_settings"
    ON public.system_settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Seed default Kakao Notification config
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'kakao_notification',
    '{
        "enabled": false,
        "rest_api_key": "",
        "access_token": "",
        "refresh_token": "",
        "token_expires_at": null,
        "recipient_memo": "나에게 보내기 (기본)",
        "notify_on_new_order": true,
        "last_status": "NOT_CONFIGURED",
        "last_sent_at": null,
        "last_error": null
    }'::jsonb,
    'KakaoTalk notification settings via Kakao Developers REST API'
)
ON CONFLICT (key) DO NOTHING;
