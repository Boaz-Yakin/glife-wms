import { createClient } from '@supabase/supabase-js'

export interface UserData {
  id: string
  email: string
  phone: string
  first_name: string
  last_name: string
  role: string
  status: string
  last_sign_in_at: string
}

export async function getUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!serviceKey) {
    return { data: [], error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // 1. Fetch auth.users
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()
  if (authError) {
    console.error('getUsers auth error:', authError)
    return { data: [], error: authError.message }
  }

  // 2. Fetch public.users
  const { data: publicData, error: publicError } = await adminClient.from('users').select('*')
  if (publicError) {
    console.error('getUsers public error:', publicError)
    return { data: [], error: publicError.message }
  }

  const publicUsersMap = new Map(publicData.map(u => [u.id, u]))

  // 3. Merge data
  const mappedData: UserData[] = authData.users.map(u => {
    const pubUser = publicUsersMap.get(u.id)
    return {
      id: u.id,
      email: u.email || 'N/A',
      phone: pubUser?.phone || 'N/A',
      first_name: pubUser?.first_name || 'N/A',
      last_name: pubUser?.last_name || 'N/A',
      role: pubUser?.role || u.user_metadata?.role || 'PICKER',
      status: pubUser?.status || 'INACTIVE',
      last_sign_in_at: u.last_sign_in_at || ''
    }
  })

  return { data: mappedData, error: null }
}
