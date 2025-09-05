import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req) => {
  const { recipient, subject, html_body } = await req.json()

  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('MAILERSEND_API_TOKEN')}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      from: { email: 'yourname@mailersend.net' }, // use your actual sender identity
      to: [{ email: recipient }],
      subject,
      html: html_body
    })
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' }
  })
})