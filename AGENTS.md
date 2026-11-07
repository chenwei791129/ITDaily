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

## Deployment

The same `dist/` and `/api/news` logic ship two ways:

- **Container** (`src/server.ts`, Bun): image `ghcr.io/chenwei791129/it-daily`.
- **Cloudflare Workers** (`src/worker.ts`, `wrangler.jsonc`): https://itdaily.awei.one
  on the free plan. Static assets are served without running the Worker; only
  `/api/*` and `/healthz` invoke it. Try it locally with `bun run build && bunx wrangler dev`.

`NEWS_SOURCES` and `NEWS_LIMIT` (see README) are read from `process.env` on the
container (`make docker-run` picks up `.env`) and from `vars` in `wrangler.jsonc`
on Workers. News sources live in `src/news/sources/`.

Both are released by `.github/workflows/release-please.yml` when a release PR is
merged; the Cloudflare job needs the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets.
