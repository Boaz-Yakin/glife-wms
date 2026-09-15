import { createClient } from '@supabase/supabase-js'

export interface UserData {
  id: string
  email: string
  role: string
  last_sign_in_at: string
}

export async function getUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) {
    return { data: [], error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }
  }

  const adminAuthClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const { data, error } = await adminAuthClient.auth.admin.listUsers()

  if (error) {
    console.error('getUsers error:', error)
    return { data: [], error: error.message }
  }

  const mappedData: UserData[] = data.users.map(u => ({
    id: u.id,
    email: u.email || 'N/A',
    role: u.user_metadata?.role || 'PICKER',
    last_sign_in_at: u.last_sign_in_at || ''
  }))

  return { data: mappedData, error: null }
}
