# 貓眼電影 TOP 100 排行榜網頁與 AI 助手專案

**連結：https://movietop100-pratice.vercel.app/**

本專案是一個集成了 **Python 數據爬蟲**、**互動式排行榜儀表板** 與 **右下角懸浮 AI 助手** 的整合式經典電影排行榜系統。專案採用極具現代感的深色玻璃擬物（Glassmorphism）網頁介面，供使用者瀏覽與探索貓眼經典 TOP 100 電影。

---

## 專案目錄結構

```
D:\data\practice\movie\
├── index.html           # 儀表板與 AI 助手主結構（HTML5）
├── index.css            # 玻璃擬物、光暈背景、懸浮按鈕與縮放動畫（CSS3）
├── app.js               # 數據處理、搜尋、年代過濾、多維排序與詳情彈窗
├── chat.js              # AI 助手控制、LocalStorage 記憶、雙 API 串接與本地模擬
├── scraper.py           # Python 爬蟲腳本（自動繞過驗證碼與圖片下載）
├── movies_backup.js     # 100 部經典電影元數據備份（JS 格式，防 CORS 阻擋）
├── movies.js            # 爬蟲輸出的最新資料（JS 格式，防 CORS 阻擋）
├── PROMPT.md            # AI 系統提示詞（System Prompts）設定指南
└── posters/             # 本地海報下載資料夾（快取使用）
```

---

## 專案功能與技術特色

### 1. 繞過瀏覽器本地 CORS 限制
傳統靜態網頁若使用 `fetch('data.json')`，在不啟動伺服器、直接雙擊 `.html` 檔案（`file://` 協議）開啟時，會被瀏覽器安全政策（CORS）阻擋。
* **解決方案**：本專案將資料改寫為 JavaScript 檔案格式（在變數 `window.moviesData` 中賦值）。HTML 直接透過 `<script>` 標籤載入 `movies_backup.js` 及 `movies.js`，讓網頁在**離線、無伺服器**的狀態下直接雙擊打開，也能 100% 正常讀取完整資料與運作。

### 2. Cloudflare 全球圖片 CDN 代理
貓眼海報伺服器具有防盜鏈與區域網路連線限制。
* **解決方案**：我們在前端使用了開源的全球圖片快取代理服務 `wsrv.nl`（由 Cloudflare CDN 驅動），自動將海報連結封裝為代理 URL。此服務不僅能繞過防盜鏈，還能大幅加快海報下載速度。同時，當載入失敗時，網頁會自動使用行內 SVG 呈現精緻的「🎬 無海報」占位符，絕不破圖。

### 3. 可縮放的 AI 電影專家助手
網頁右下角整合了懸浮的 AI 對話小幫手，並具備以下亮點：
* **原生拉伸縮放**：對話框右下角支援拖曳縮放（`resize: both`），內容與對話高度會自動彈性延展。
* **本地端智慧模擬模式（免 Key/離線可用）**：預設模式。助理會直接讀取載入的電影資料庫，回答使用者問題。你可以問它電影詳情（例如問「我不是藥神是第幾名」）、演員代表作（問「有周星馳演的電影嗎」）或要求主題推薦（問「推薦幾部悲劇催淚電影」），它會精準過濾並回答。
* **Gemini & OpenAI API 模式**：點擊齒輪 ⚙️ 即可在對話框內填入你的 API Key，並選擇大語言模型。API 金鑰和設定會被安全地保存在瀏覽器的 `localStorage` 中，重新整理網頁也不必重新輸入。

---

## 系統環境與安裝

執行爬蟲需要安裝 Python 3 及其依賴套件。請在終端機執行以下命令：

```bash
python -m pip install beautifulsoup4 requests
```

---

## 爬蟲使用說明

請在 `D:/data/practice/movie` 目錄下執行爬蟲：

### 1. 備用資料模式（預設）
直接運行腳本，將自動使用備用數據，並下載海報到本地（有斷線保護）：
```bash
python scraper.py
```

### 2. 實時爬取模式（使用瀏覽器 Cookie）
1. 在瀏覽器中打開 [貓眼 TOP100 榜單](https://www.maoyan.com/board/4)。
2. 按 `F12` 打開開發者工具，複製 Headers 中的 `Cookie` 欄位內容。
3. 執行爬蟲，傳入你的 Cookie：
```bash
python scraper.py --cookie "your_copied_cookie_here"
```

---

## 預覽網頁方式

本專案支援兩種開啟方式：
1. **直接預覽**：直接雙擊 [index.html](file:///D:/data/practice/movie/index.html) 檔案，即可在瀏覽器中離線使用。
2. **啟動伺服器**：
   ```bash
   python -m http.server 8000 --directory D:/data
   ```
   接著在瀏覽器中訪問：[http://localhost:8000/practice/movie/index.html](http://localhost:8000/practice/movie/index.html)
