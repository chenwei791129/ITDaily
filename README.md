# IT Daily (IT人的今天)

An IT-flavoured farmer's almanac. Each day's 宜/忌 come from the real lunar almanac
(via [`lunar-typescript`](https://github.com/6tail/lunar-typescript)) and are translated
into IT activities through the table in `src/yiji.ts`. When a term has several IT
equivalents, one is picked deterministically from the date, so everyone sees the same
result on the same day.

## Development

```sh
bun install
bun run dev      # http://localhost:5173
bun test
bun run build    # outputs dist/
```

## Container

Static files served by `nginx-unprivileged` on port **8080** (plain HTTP, non-root);
TLS is expected to be terminated by the upstream load balancer.

```sh
docker build -t it-daily .
docker run --rm -p 8080:8080 it-daily
```
