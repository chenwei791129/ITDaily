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

## IT新消息

`GET /api/news` returns up to 3 of the newest items published in the last 24 hours from the
[iThome security RSS](https://www.ithome.com.tw/rss/security) (its timestamps are read as
Taiwan time). The feed is cached in memory for 30 minutes and re-filtered on each request;
on fetch failure the last good copy is kept.

## Web

Use ‹ › to step one day, or the calendar icon in the top-left to pick any date
(1900–2100); 回今天 jumps back to today. News always shows the latest items.

## Container

A Bun server (`src/server.ts`) serves the built site and `/healthz` on port **8080**
(plain HTTP, UID 1000, `TZ=Asia/Taipei`); TLS is terminated by the upstream load balancer.

```sh
docker build -t it-daily .
docker run --rm -p 8080:8080 --env-file .env it-daily
```

Build with `--platform linux/amd64` when the target host runs amd64 and you build on Apple Silicon.
