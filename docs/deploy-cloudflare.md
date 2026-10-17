# Deploying to Cloudflare Pages, behind Cloudflare Access

The goal: the demo is reachable by the people you send it to, and by nobody else.
Free, from the private GitHub repo, with a real email login in front of it.

Roughly 10 minutes. Steps 1–4 put it online; steps 5–7 lock it down. **Between step 4
and step 7 the site is publicly reachable**, so either do them in one sitting or do not
share the URL until step 7 is done.

Repo: `PR0T0TYP3-007/bakery-storefront-templates` (private)

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
| Project name | `bakery-storefront-templates` (becomes the subdomain) |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | **leave empty** |
| Build output directory | `/` |

Nothing goes in environment variables.

## 3 — Deploy

**Save and Deploy.** The first build takes under a minute — it is only uploading files.

## 4 — Check it actually works

Site: `https://bakery-storefront-templates.pages.dev`

| Check | Why this one |
|---|---|
| `/` shows the chooser | Root serving works |
| `/t1` lands on Template 01 | `_redirects` was picked up |
| Template 01 shows photographs | `shared/img/` resolved through `../../` |
| `/t5` loads and the board fills | `js/pages/_page.js` was published — an underscore path, which is what breaks this on GitHub Pages |
| `/nonsense` shows "No such plate." | Root `404.html` is being served |
| Browser console is clean on both | No module or CORS surprises |

If Template 05 renders a bare page with a module error in the console, the underscore file
was dropped. That should not happen on Cloudflare, but it is the first thing to suspect.

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
