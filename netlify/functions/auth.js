const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for secure server-side access
)

exports.handler = async function (event, context) {
  const cookieHeader = event.headers.cookie || ''
  const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/)
  const token = tokenMatch ? tokenMatch[1] : null

  if (!token) {
    return {
      statusCode: 200,
      body: JSON.stringify({ access_level: 'guest' })
    }
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return {
      statusCode: 200,
      body: JSON.stringify({ access_level: 'guest' })
    }
  }

  const accessLevel = user.user_metadata?.access_level || 'guest'

  return {
    statusCode: 200,
    body: JSON.stringify({ access_level: accessLevel })
  }
}
