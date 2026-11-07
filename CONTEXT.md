# IT Daily

給 IT 人的農民曆：把當天的農民曆資料轉譯成 IT 用語，並附上最近的 IT 新消息。

## Language

### IT 新消息

**消息來源（News Source）**：
依共同介面，從某個網站取得消息的模組。每個來源有唯一的 id。
_Avoid_：plugin、extension、provider、adapter、feed

**內建來源（Built-in Source）**：
隨專案程式碼一起發布的消息來源；iThome 資安頻道是第一個。
_Avoid_：預設來源、官方來源

**啟用來源（Enabled Sources）**：
由部署設定選定、實際用來產生 IT 新消息的那些內建來源。

**消息（News Item）**：
消息來源回傳的一則內容：標題、原文連結、發布時間。
_Avoid_：新聞、文章、entry

**IT 新消息**：
網站上的區塊，顯示所有啟用來源在最近 24 小時內的消息，合併後依時間由新到舊排列，同一連結只出現一次，至多顯示設定的則數。
_Avoid_：新聞區、news feed

### 外觀

**主題（Theme）**：
網站的一套視覺外觀：配色、字體與形狀。使用者可在站上切換，選擇只記在自己的瀏覽器裡。
_Avoid_：皮膚、skin、風格、樣式、mode

**預設主題（Default Theme）**：
使用者沒有選過主題時看到的外觀，即加入主題功能前的既有外觀。
_Avoid_：原始主題、無主題

**主題選擇器（Theme Selector）**：
頂欄上讓使用者切換主題的控制項。
_Avoid_：切換鈕、主題按鈕
