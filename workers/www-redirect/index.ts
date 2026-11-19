// Sends every www.thapa-sandesh.com.np URL to the same path on the bare
// domain with a permanent redirect, so search engines see one site.
//
// It is its own Worker so the main site stays a static-assets Worker that
// never runs code. Deploy: pnpm run deploy:www
export default {
  fetch(request: Request) {
    const url = new URL(request.url)
    url.protocol = "https:"
    url.hostname = "thapa-sandesh.com.np"
    url.port = ""
    return Response.redirect(url.href, 301)
  },
}
