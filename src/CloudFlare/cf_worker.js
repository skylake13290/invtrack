/**
 * src/CloudFlare/cf_worker.js  (FIXED)
 * ---------------------------------------------------------
 * Changes from original:
 *  1. Strips client-supplied trust headers before forwarding
 *     so the header-spoofing attack cannot bypass role checks
 *     even through the proxy.
 *  2. Uses https:// scheme for the target URL.
 *  Note: This is a secondary defence. The primary fix is that
 *  route handlers now read roles from x-verified-* headers
 *  set by Next.js middleware (from the signed JWT), not from
 *  any client-controllable header.
 * ---------------------------------------------------------
 */
export default {
  async fetch(request, env, ctx) {
    const backendURL = "https://invtrack-test.vercel.app/" // Your hidden backend (use https)

    const url = new URL(request.url)
    const targetUrl = backendURL + url.pathname + url.search

    // FIX: Strip headers that were used for role/identity spoofing
    const cleanHeaders = new Headers(request.headers)
    cleanHeaders.delete('x-user-role')
    cleanHeaders.delete('x-user-id')
    cleanHeaders.delete('x-username')
    // Also strip any attempt to inject the verified headers
    cleanHeaders.delete('x-verified-role')
    cleanHeaders.delete('x-verified-user-id')
    cleanHeaders.delete('x-verified-username')

    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: cleanHeaders,
      body: request.body,
      redirect: 'follow',
    })

    const response = await fetch(modifiedRequest)
    return response
  },
}
