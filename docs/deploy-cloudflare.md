# Deploying to Cloudflare Pages, behind Cloudflare Access

The goal: the demo is reachable by the people you send it to, and by nobody else.
Free, from the private GitHub repo, with a real email login in front of it.

Roughly 10 minutes. Steps 1–4 put it online; steps 5–7 lock it down. **Between step 4
and step 7 the site is publicly reachable**, so either do them in one sitting or do not
share the URL until step 7 is done.

Repo: `PR0T0TYP3-007/bakery-storefront-templates` (private)

---

## Pages or Workers — they are not the same thing

Cloudflare will deploy a static site either as a **Pages** project
(`<name>.pages.dev`) or as a **Worker with static assets**
(`<name>.<account>.workers.dev`). Check which one you have, because one feature below
differs.

`_headers`, `_redirects` and `404.html` work on both.

**`functions/_middleware.js` is a Pages convention and does nothing on a Worker.** On a
Workers deployment that file is not executed — and if the whole repo is being served, its
source is readable at `/functions/_middleware.js`. Using `build.mjs` with an output
directory of `dist` removes it from the deploy entirely, since it is never copied there.

If you are on Workers and want a password gate, say so — it needs a `_worker.js` at the
output root rather than the `functions/` directory, which is a different piece of work.

---

## 1 — Connect the repo

1. <https://dash.cloudflare.com> → **Compute (Workers & Pages)** → **Create** →
   **Pages** → **Connect to Git**.
2. Connect GitHub and authorise the **Cloudflare Pages** app.
   Choose **Only select repositories** and pick `bakery-storefront-templates`. A private
   repo works — this is what the app install is for.
3. Select the repo → **Begin setup**.

## 2 — Build settings

There is no build. The settings must say so, or Cloudflare will try to run one and fail.

| Field | Value |
|---|---|
| Project name | becomes the subdomain |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | `node build.mjs` |
| Build output directory | `dist` |

Nothing goes in environment variables.

`build.mjs` assembles a site containing **only Template 01**, with its pages at the root
so the bare domain opens on the storefront. It copies the template, the shared JavaScript
and just the photographs that template references — about 4MB rather than 10 — rewrites
`../../shared/` to `shared/`, and writes a tailored `_headers` and `404.html`.

The repo is untouched: the chooser page and Template 05 stay in version control and are
simply not deployed. To publish a different one:

```bash
node build.mjs --template 05-neighbourhood
```

## 3 — Deploy

**Save and Deploy.** The first build takes under a minute — it is only uploading files.

## 4 — Check it actually works

Site: `https://bakery-storefront-templates.pages.dev`

| Check | Why this one |
|---|---|
| `/` opens Template 01 itself | The build flattened it to the root |
| Photographs load | `shared/img/` resolved after the path rewrite |
| `/product.html?id=noir` configures and prices | The shared commerce layer came across |
| `/nonsense` shows "No such plate." | `404.html` is being served |
| Footer has no "All templates" link | The chooser reference was stripped |
| Browser console is clean | No module or path surprises |

---

## 5 — Turn on Zero Trust

1. In the dashboard, open **Zero Trust** in the left nav.
2. First time only: choose a **team name** — it becomes `<team>.cloudflareaccess.com` and
   appears on the login screen, so pick something presentable.
3. Choose the **Free** plan (up to 50 users). It may ask for a payment method to complete
   signup; the free tier does not charge.

## 6 — Put Access in front of the site

1. **Zero Trust → Access → Applications → Add an application → Self-hosted.**
2. **Application name:** Bakery templates
3. **Session duration:** 24 hours is reasonable — long enough that a reviewer coming back
   after lunch is not asked again.
4. **Public hostname:** `bakery-storefront-templates.pages.dev`

   > If the dashboard will not accept a `.pages.dev` hostname, attach a custom domain to
   > the Pages project first (**Pages project → Custom domains**, on a domain already
   > using Cloudflare DNS) and protect that hostname instead. Same steps otherwise.

5. **Next** → add a policy:
   - **Policy name:** Reviewers
   - **Action:** Allow
   - **Include:** *Emails* and list the exact addresses, or *Emails ending in* and give
     `@yourcompany.com` to cover the whole team.
6. **Next → Add application.**

Nobody needs a Cloudflare account to get in. They enter their email, receive a one-time
code, and they are through.

## 7 — Verify the lock

Open the URL in a **private window**. You should get the Cloudflare login screen, not the
site. Enter an allowed address, get the code, and confirm you land on the chooser.

Then try an address that is *not* on the list and confirm it is refused. Testing only the
happy path tells you the login screen appeared, not that the policy works.

---

## If you would rather not give Cloudflare a card

Zero Trust's **Free** plan is genuinely free — 50 users, $0/month — but Cloudflare asks
for a payment method during onboarding as a verification step. If that is a blocker,
there is a second option already in this repo that needs no Zero Trust and no card.

`functions/_middleware.js` is a Cloudflare Pages Function that puts HTTP Basic Auth in
front of every path. Pages Functions are on the free plan (100,000 requests/day).

**It is inert until you configure it**, so it is already committed and has changed
nothing about your live site.

### Turning it on

1. **Pages project → Settings → Variables and Secrets → Production**

   | Variable | Value |
   |---|---|
   | `DEMO_USER` | `bakery` — plain text is fine |
   | `DEMO_PASS` | something long — click **Encrypt** |

2. Add the **same two** under **Preview**, or branch and PR builds stay open while
   production is locked.
3. **Deployments → latest → Retry deployment.** Pages only picks up variable changes on
   a new deployment; editing them alone does nothing.
4. Open the site in a private window. You should get a browser password prompt.

Also check that `https://<your-project>.pages.dev/functions/_middleware.js` returns a
404 rather than the source of the file. Cloudflare treats `functions/` as code rather
than static assets, and this confirms it.

### How it behaves

| Variables set | Result |
|---|---|
| Neither | Site served normally — safe to commit without configuring |
| Only one | Everything refused with an explanation, because that is always a typo |
| Both | Password prompt on every path |

### Which of the two to use

| | Basic Auth | Cloudflare Access |
|---|---|---|
| Card needed | No | Yes, to onboard Zero Trust |
| Credentials | One password, shared | Per-person email login |
| Revoke one person | Change it for everyone | Remove them from the policy |
| Who viewed it | Not recorded | Logged per user |
| Setup | Two variables, one redeploy | ~5 minutes of dashboard |

For getting an unfinished demo in front of a handful of colleagues, Basic Auth is
proportionate. If you need to know who opened it, or to cut off one person later, use
Access.

The logic is covered by `tests/middleware.test.mjs` — run it with
`node --test tests/middleware.test.mjs`.

---

## The preview-deployment leak

Cloudflare Pages builds **every branch and every pull request** to its own URL, like
`abc123.bakery-storefront-templates.pages.dev`. An Access policy on the production
hostname **does not cover those.**

Close it in **Pages project → Settings → General → Preview deployments**, either by
disabling previews or by applying an Access policy to them as well.

Worth doing even on a one-person project: a preview URL is still a public URL, and
`_archive/05-neighbourhood-v1/` — the rejected first attempt — is in the repo.

---

## Deploying after this

Push to `main` and Cloudflare rebuilds automatically.

```bash
git add -A
git commit -m "…"
git push
```

Live in under a minute. No build step means almost nothing to go wrong.

---

## Files that make this work

| File | Does what |
|---|---|
| `_headers` | Security headers, `noindex`, and caching. CSS/JS deliberately revalidate because the filenames carry no content hash; fonts and photographs are cached hard. |
| `_redirects` | `/t1` and `/t5` short links, and the option to land the root on Template 01. |
| `404.html` | Served automatically for unmatched paths. No catch-all rule, which can shadow asset serving. |
| `.nojekyll` | Does nothing on Cloudflare. Keep it — it is what stops GitHub Pages silently dropping `_page.js` if the site is ever moved there. |

Cloudflare Pages does not upload dotfiles, so `.nojekyll` will not appear on the live
site. That is expected and harmless.

---

## Before you send the link

- The photography is Unsplash stock standing in for merchant photography.
- Both bakeries, their staff, press quotes and copy are invented.
- Checkout is simulated. No provider is connected and no money can move. The decline path
  is reachable on purpose with card `4000 0000 0000 0002`.
- `_headers` sends `X-Robots-Tag: noindex, nofollow`. Remove that line when this becomes a
  real storefront, or it will quietly stay invisible to search engines after launch.
