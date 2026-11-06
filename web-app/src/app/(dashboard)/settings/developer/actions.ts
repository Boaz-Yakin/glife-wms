"use server"

import {
  createTenantApiKey,
  revokeTenantApiKey,
  registerTenantWebhook,
  deleteTenantWebhook,
  testWebhookPingAction,
} from "@/services/developer.service"

export async function createApiKeyServerAction(formData: FormData) {
  const name = formData.get("name") as string
  const permissions = formData.getAll("permissions") as string[]
  return await createTenantApiKey(name, permissions)
}

export async function revokeApiKeyServerAction(keyId: string) {
  return await revokeTenantApiKey(keyId)
}

export async function registerWebhookServerAction(formData: FormData) {
  const url = formData.get("url") as string
  const events = formData.getAll("events") as string[]
  return await registerTenantWebhook(url, events)
}

export async function deleteWebhookServerAction(webhookId: string) {
  return await deleteTenantWebhook(webhookId)
}

export async function testWebhookPingServerAction(webhookId: string) {
  return await testWebhookPingAction(webhookId)
}
