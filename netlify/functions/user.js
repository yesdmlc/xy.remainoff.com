// _data/user.js
const fetch = require('node-fetch');

module.exports = async function () {
  const res = await fetch('http://localhost:8888/.netlify/functions/auth', {
    headers: {
      cookie: 'sb-access-token=your-token-here' // Replace with actual token during build
    }
  })

  const data = await res.json()
  return data
}
