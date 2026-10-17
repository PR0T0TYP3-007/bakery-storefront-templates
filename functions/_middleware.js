/**
 * HTTP Basic Auth for the whole site, as a Cloudflare Pages Function.
 *
 * An alternative to Cloudflare Access for when you would rather not hand over
 * a payment method to onboard Zero Trust. Pages Functions are on the free
 * plan (100,000 requests/day), so this costs nothing and needs no extra
 * product enabled.
 *
 * ---------------------------------------------------------------------------
 * SET IT UP
 *
 *   Pages project -> Settings -> Variables and Secrets -> Production
 *     DEMO_USER  =  bakery              (plain text is fine)
 *     DEMO_PASS  =  something-long      (click Encrypt — it is a secret)
 *
 *   Then redeploy. Pages only picks up variable changes on a new deployment:
 *   Deployments -> latest -> Retry deployment.
 *
 *   Add the same two variables under Preview as well, or branch and PR builds
 *   stay open while production is locked.
 *
 * ---------------------------------------------------------------------------
 * BEHAVIOUR, DELIBERATELY
 *
 *   Neither variable set  ->  site is served normally.
 *       So committing this file cannot lock you out of a site that is already
 *       deployed and working. It stays inert until you configure it.
 *
 *   Only one set          ->  everything is refused, with an explanatory page.
 *       That combination is always a mistake, and failing open on a typo in a
 *       variable name would leave the site silently public.
 *
 *   Both set              ->  browser password prompt on every path.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS AND IS NOT
 *
 * It is one shared username and password, sent over TLS. That is appropriate
 * for keeping an unfinished demo away from the public and search engines.
 *
 * It is not per-person authentication: there is no audit trail, and revoking
 * access means changing the password for everyone. If you need to know who
 * looked at it, or to cut off one person, use Cloudflare Access instead —
 * docs/deploy-cloudflare.md has those steps.
 */

/** Constant-time string comparison, so a reply cannot be timed character by character. */
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Compare lengths without branching out early.
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

function challenge() {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Password required</title>
     <style>
       body{min-height:100vh;display:grid;place-items:center;margin:0;
            background:#f3efe8;color:#17140f;padding:2rem;
            font-family:system-ui,-apple-system,sans-serif;line-height:1.6}
       div{max-width:34rem;text-align:center}
       h1{font-size:1.5rem;margin:0 0 .75rem}
       p{margin:0;color:#574f44}
     </style></head>
     <body><div>
       <h1>This demo is password protected</h1>
       <p>Your browser should have shown a sign-in prompt. Reload the page if it did not,
          and ask whoever sent you the link for the password.</p>
     </div></body></html>`,
    {
      status: 401,
      headers: {
        // `realm` is shown by some browsers in the prompt, so keep it readable.
        'WWW-Authenticate': 'Basic realm="Bakery templates demo", charset="UTF-8"',
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
}

function misconfigured() {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
     <title>Not configured</title></head><body
     style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.5rem;line-height:1.6">
     <h1 style="font-size:1.375rem">Password protection is half configured</h1>
     <p>Exactly one of <code>DEMO_USER</code> and <code>DEMO_PASS</code> is set on this
     environment. Set both — or neither — under
     <strong>Pages project &rarr; Settings &rarr; Variables and Secrets</strong>, then
     redeploy.</p>
     <p>The site is being refused rather than served openly, because a half-configured
     gate is more likely to be a typo than an intention.</p>
     </body></html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  );
}

export const onRequest = async ({ request, env, next }) => {
  const user = env.DEMO_USER;
  const pass = env.DEMO_PASS;

  if (!user && !pass) return next();     // inert until configured
  if (!user || !pass) return misconfigured();

  const header = request.headers.get('Authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return challenge();

  let decoded;
  try {
    decoded = atob(encoded);
  } catch {
    return challenge();
  }

  // Split on the FIRST colon only: a password may legitimately contain colons.
  const i = decoded.indexOf(':');
  if (i < 0) return challenge();

  const okUser = safeEqual(decoded.slice(0, i), user);
  const okPass = safeEqual(decoded.slice(i + 1), pass);

  // Evaluate both before branching, so the failure is not timeable.
  if (!(okUser && okPass)) return challenge();

  const response = await next();

  // A protected page must never be stored by a shared cache.
  const out = new Response(response.body, response);
  out.headers.set('Cache-Control', 'no-store');
  return out;
};
