"use server"

import { resolveVirtualEmailForPhone } from "@/lib/tenant/auth-helper"

export async function resolveLoginEmailAction(phone: string, hintSubdomain?: string): Promise<string> {
  return await resolveVirtualEmailForPhone(phone, hintSubdomain)
}
