# IT Daily (IT人的今天)

An IT-flavoured farmer's almanac. Each day's 宜/忌 come from the real lunar almanac
(via [`lunar-typescript`](https://github.com/6tail/lunar-typescript)) and are translated
into IT activities through the table in `src/yiji.ts`. When a term has several IT
equivalents, one is picked deterministically from the date, so everyone sees the same
result on the same day.

## Development

Run `make` to list common tasks (install, dev, start, test, docker-build, ...).

```sh
bun install
bun run dev      # http://localhost:5173 (proxies /api to :8080; run `SLACK_WEBHOOK_URL= bun run start` alongside to skip the Slack post)
bun test
bun run build    # outputs dist/
bun run start    # serves dist/ on :8080 and posts the Slack card once
```

## Slack card

On every start, `src/server.ts` posts today's almanac as a Block Kit card to the
incoming webhook in `SLACK_WEBHOOK_URL` (skipped when unset; failures are only logged).
Locally, put it in `.env` (git-ignored); Bun loads it automatically.

## IT新消息

`GET /api/news` returns up to 3 of today's newest items (server-local date; the container sets
`TZ=Asia/Taipei` to match iThome's timestamps) from the
[iThome security RSS](https://www.ithome.com.tw/rss/security). The feed is cached in
memory for 30 minutes; on fetch failure the last good copy is kept. The same items are
appended to the Slack card.

## Container

A Bun server (`src/server.ts`) serves the built site and `/healthz` on port **8080**
(plain HTTP, UID 1000, `TZ=Asia/Taipei`); TLS is terminated by the upstream load balancer.

```sh
docker build -t it-daily .
docker run --rm -p 8080:8080 --env-file .env it-daily
```

Build with `--platform linux/amd64` when the cluster runs amd64 and you build on Apple Silicon.

## Kubernetes

`k8s/deployment.yaml` defines a Deployment and a ClusterIP Service (Ingress not included).
Keep `replicas: 1`: each pod start posts one Slack card.

```sh
kubectl create secret generic it-daily-slack --from-literal=webhook-url='https://hooks.slack.com/services/...'
kubectl apply -f k8s/deployment.yaml   # set the image to your registry first
```
