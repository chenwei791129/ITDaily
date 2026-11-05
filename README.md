# <img src="icon.png" alt="" width="32" /> IT Daily (IT人的今天)

An IT-flavoured farmer's almanac. Each day's 宜/忌 come from the real lunar almanac
(via [`lunar-typescript`](https://github.com/6tail/lunar-typescript)) and are translated
into IT activities through the table in `src/yiji.ts`. When a term has several IT
equivalents, one is picked deterministically from the date, so everyone sees the same
result on the same day.

## Development

Run `make` to list common tasks (install, dev, start, test, docker-build, ...).

```sh
bun install
bun run dev      # http://localhost:5173 (proxies /api to :8080; run `bun run start` alongside)
bun test
bun run build    # outputs dist/
bun run start    # serves dist/ and /api on :8080
```
