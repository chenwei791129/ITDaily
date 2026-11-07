# AGENTS.md

## Development

Run `make` to list common tasks (install, dev, start, test, docker-build, ...).

```sh
bun install
bun run dev      # http://localhost:5173 (proxies /api to :8080; run `bun run start` alongside)
bun test
bun run build    # outputs dist/
bun run start    # serves dist/ and /api on :8080
```

## Themes

The default theme is plain `src/style.css`; colours, font and corner radius are
CSS custom properties on `:root`. A theme is `src/themes/<id>.css` overriding
those properties under `html[data-theme='<id>']` (plus a few decorative rules),
imported in `src/main.ts`, listed as an `<option value="<id>">` of `#theme`
in `index.html`, and named in README's usage paragraph. Add `data-font="<Google Fonts family>"` to the option when the
theme needs a web font; it is loaded only once that theme is chosen. The choice
is kept in `localStorage.theme`, so treat theme ids as stable.

## Deployment

The same `dist/` and `/api/news` logic ship two ways:

- **Container** (`src/server.ts`, Bun): image `ghcr.io/chenwei791129/it-daily`.
- **Cloudflare Workers** (`src/worker.ts`, `wrangler.jsonc`): https://itdaily.awei.one
  on the free plan. Static assets are served without running the Worker; only
  `/api/*` and `/healthz` invoke it. Try it locally with `bun run build && bunx wrangler dev`.

`NEWS_SOURCES` and `NEWS_LIMIT` (see README) are read from `process.env` on the
container (`make docker-run` picks up `.env`) and from `vars` in `wrangler.jsonc`
on Workers. News sources live in `src/news/sources/<site>/` (one directory per
site, registered in `src/news/sources/index.ts`); the iThome channels share one
factory in `ithome/index.ts`, and the default stays `ithome-security`. Try another source
locally with `NEWS_SOURCES=ithome-ai bun run start` or
`bunx wrangler dev --var NEWS_SOURCES:ithome-ai`.

Both are released by `.github/workflows/release-please.yml` when a release PR is
merged; the Cloudflare job needs the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets.
