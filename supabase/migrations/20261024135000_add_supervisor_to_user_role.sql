-- Migration: 20261024135000_add_supervisor_to_user_role.sql
-- Description: Add 'SUPERVISOR' to public.user_role enum to support supervisor permissions

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPERVISOR';
