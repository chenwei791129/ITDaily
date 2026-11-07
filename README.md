# <img src="icon.png" alt="" width="32" /> IT Daily（IT人的今天）

給 IT 人的農民曆：https://itdaily.awei.one

向 iThome 的 [IT人的今天-IT宅民曆](https://today.ithome.com.tw/) 致敬。

<img src="docs/screenshot.png" alt="IT Daily 畫面截圖" width="360" />

## 網站內容

- **國曆與農曆日期**，以及每日一句 IT 運勢。
- **IT 神方位、吉時、沖、煞**：依農民曆資料產生，對應方式見下節。
- **宜／忌**：將當天農民曆的宜忌活動轉換為 IT 活動，例如「動土」對應「開新 repo」或「建新環境」、「開市」對應「正式上線」或「deploy production」。同一天所有人看到的內容都相同。
- **IT 新消息**：合併所有啟用來源在最近 24 小時內的消息，依時間由新到舊顯示，預設最多 3 則 [iThome 資安頻道](https://www.ithome.com.tw/security)，點擊標題即可閱讀原文。來源與則數可自行設定，見[消息來源](#消息來源)。

使用 ‹ › 瀏覽前後一天，或按左上角的日曆圖示直接選擇日期（1900～2100 年），按「回今天」返回當天。新聞一律顯示最新內容，不隨瀏覽的日期改變。

## IT 用語與農民曆的對應關係

農曆資料由 [`lunar-typescript`](https://www.npmjs.com/package/lunar-typescript) 提供，顯示時轉為正體中文。IT 神的名稱與活動文案是本專案的趣味轉譯，不是傳統農民曆中的神名或建議。

| 網站內容 | 農民曆來源 | 轉換方式 |
|---|---|---|
| 部署神方位 | **喜神**方位 | 使用當日喜神方位（`getDayPositionXiDesc()`），只將名稱改為「部署神」 |
| 乖乖神方位 | **福神**方位 | 使用當日福神方位（`getDayPositionFuDesc()`），只將名稱改為「乖乖神」 |
| 每日一句 IT 運勢 | 建除十二神（值日十二神） | 依當日的建、除、滿、平、定、執、破、危、成、收、開、閉，對應固定文案；例如「成」為「CI 全綠，萬事可成。」 |
| 吉時 | 各時辰的天神吉凶 | 取當日十二時辰中標示為「吉」的時辰，不納入屬於隔日的晚子時 |
| 沖 | 當日相沖的天干、地支與生肖 | 顯示相沖生肖、干支，以及以「農曆年減出生年」計算、介於 1～100 歲的對應年齡 |
| 煞 | 當日煞方 | 直接顯示農民曆的方位 |
| 宜／忌 | 當日宜忌活動 | 依活動對照表選出 IT 文案；以日期與原始活動決定選項，去除重複，且不讓同一文案同時出現在宜與忌 |

宜忌轉譯範例：

| 農民曆活動 | 可能顯示的 IT 活動 |
|---|---|
| 祭祀 | 做備份、拜乖乖、檢查備份能不能還原 |
| 祈福 | 跑 CI 祈禱全綠、對伺服器雙手合十 |
| 動土 | 開新 repo、建新環境 |
| 嫁娶 | merge branch、合併 PR |
| 修造 | 修 bug、補 patch |

完整宜忌對照表見 [`src/yiji.ts`](src/yiji.ts)；神明方位、每日運勢及其他欄位的產生邏輯見 [`src/almanac.ts`](src/almanac.ts)。

## 自行架設

每次發布都會推送容器映像到 GitHub Container Registry（linux/amd64）：

```sh
docker run --rm -p 8080:8080 ghcr.io/chenwei791129/it-daily:latest
```

啟動後開啟 http://localhost:8080 。

## 消息來源

「IT 新消息」的內容來自一或多個消息來源。所有來源都內建在程式碼中，部署時以環境變數決定啟用哪些：

| 環境變數 | 格式 | 未設定或空白時 |
|---|---|---|
| `NEWS_SOURCES` | 以逗號分隔的來源 id，例如 `ithome-security,ithome-ai` | `ithome-security` |
| `NEWS_LIMIT` | 正整數，最多顯示幾則 | `3` |

設定錯誤（不存在的 id、非正整數）時，容器會啟動失敗；Cloudflare Workers 的 `/api/news` 會回傳 500。

```sh
docker run --rm -p 8080:8080 -e NEWS_SOURCES=ithome-security,ithome-ai -e NEWS_LIMIT=5 ghcr.io/chenwei791129/it-daily:latest
```

內建來源：

| id | 內容 |
|---|---|
| `ithome-security` | [iThome 資安頻道](https://www.ithome.com.tw/security)（預設） |
| `ithome-news` | [iThome 全站最新新聞](https://www.ithome.com.tw/latest) |
| `ithome-ai` | [iThome AI 頻道](https://www.ithome.com.tw/ai) |
| `ithome-cloud` | [iThome Cloud 頻道](https://www.ithome.com.tw/cloud) |
| `ithome-devops` | [iThome DevOps 頻道](https://www.ithome.com.tw/devops) |
| `ithome-tech` | [iThome 技術頻道](https://www.ithome.com.tw/tech) |
| `ithome-cio` | [iThome CIO 頻道](https://www.ithome.com.tw/cio) |
| `ithome-buying` | [iThome 產品評測頻道](https://www.ithome.com.tw/buying) |

[iThome RSS 列表](https://www.ithome.com.tw/rss-list)中的「全部」（`/rss`）與「專欄」（`/rss/voice`）發布時間格式有誤，無法判斷是否在 24 小時內，因此未收錄；全站消息請用 `ithome-news`。

只顯示最近 24 小時的消息，更新較慢的頻道（如 DevOps、技術、CIO、產品評測）可能常常沒有內容，適合和其他來源一起啟用。同一篇文章出現在多個已啟用的來源時，只會顯示一次。

### 新增來源

1. 每個網站一個目錄：參考 [`src/news/sources/ithome/`](src/news/sources/ithome/) 新增 `src/news/sources/<網站>/index.ts`（測試放在同一目錄），匯出一個 [`NewsSource`](src/news/source.ts) 陣列，一個網站可以提供多個來源。每個來源要有唯一、以目錄名稱為前綴的 kebab-case `id`（例如 `ithome-ai`），在 `fetch(signal)` 中抓取並回傳 `{ title, link, published }` 的清單；抓取失敗或沒有資料時請丟出錯誤，核心才會沿用上一次的內容。RSS 類來源可以重用 [`src/news/rss.ts`](src/news/rss.ts)。
2. 在 [`src/news/sources/index.ts`](src/news/sources/index.ts) 的 `SOURCES` 展開加入該陣列；`bun test` 會檢查 id 是否重複、格式是否正確。並在上方「內建來源」表格列出新的 id。
3. 部署時以 `NEWS_SOURCES` 啟用；若希望預設就啟用，也加進 `DEFAULT_SOURCES`。

24 小時的時間範圍、排序、去除重複、則數上限、30 分鐘快取與連結檢查由核心統一處理，來源不必自己做；一個來源抓取失敗時會沿用它上一次的內容，不影響其他來源。設計考量見 [ADR 0001](docs/adr/0001-news-sources-built-in-selected-by-config.md)。

## 開發

請參閱 [AGENTS.md](AGENTS.md)。

## 授權

[MIT](LICENSE)
