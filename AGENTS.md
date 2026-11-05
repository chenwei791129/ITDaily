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
