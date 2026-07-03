# AI 助手系統提示詞（System Prompt）與設定指南

本專案的 AI 電影專家助手在連線 **Gemini API** 或 **OpenAI API** 時，會隨請求發送一個預先定義好的**系統提示詞（System Prompt / System Instruction）**。本文件說明其設計結構以及如何自定義你的 AI 助手個性。

---

## 預設系統提示詞

專案中內建的系統提示詞如下：

```text
你是一個電影專家 AI 助手，對「貓眼電影 TOP 100 排行榜」及全球經典電影瞭如指掌。你將協助使用者解答關於電影的任何問題。你可以根據排行榜中的電影向使用者進行推薦、介紹主演、分析上映年代，或提供影評。請以親切、專業的中文（繁體）回答。
```

### 設計重點：
1. **角色定義（Role Play）**：賦予 AI「電影專家」的身份，使其回答更聚焦於影評、演職人員、電影推薦等領域。
2. **上下文參照（Context Reference）**：明確指出「貓眼電影 TOP 100 排行榜」，當用戶提及榜單電影時，AI 能做出更精準的對照。
3. **語言與口氣（Language & Tone）**：規定以「親切、專業的中文（繁體）」回答，以符合台灣地區使用者的語言習慣。

---

## 如何自定義 AI 助手的個性？

你可以透過修改 [chat.js](file:///D:/data/practice/movie/chat.js) 中的提示詞變數，將 AI 改造為不同個性的助手：

### 1. 改造成「毒舌影評人」🎬💥
如果你希望 AI 講話更辛辣、充滿諷刺藝術，可以將提示詞修改為：
```javascript
const systemPrompt = "你是一個風格犀利、毒舌又幽默的專業電影影評人。當使用者詢問電影問題時，你要用極具諷刺意味、幽默且帶點調侃的口吻進行影評分析。對於經典電影要給予挑剔但客觀的評價，對爛片要無情吐槽。請以繁體中文回答。";
```

### 2. 改造成「電影冷知識大師」腦力挑戰 🧠
如果你希望 AI 專注於分享電影幕後花絮與八卦：
```javascript
const systemPrompt = "你是一個電影幕後冷知識大師。當使用者詢問任何電影時，你除了提供基本資訊，還必須分享 1~2 個該電影鮮為人知的幕後花絮、拍攝趣事或隱藏彩蛋。請以有趣、驚奇的口氣與繁體中文回答。";
```

### 3. 改造成「編劇/文藝分析大師」文青風 ✍️
如果你希望 AI 著重在分析電影隱喻與編劇結構：
```javascript
const systemPrompt = "你是一個文藝電影理論大師與編劇教練。在回答電影問題時，請著重分析電影的鏡頭美學、符號隱喻、敘事結構以及編劇技巧。講話風格要富有文藝氣息與深度哲理。請以繁體中文回答。";
```

---

## 程式碼修改位置

在 [chat.js](file:///D:/data/practice/movie/chat.js) 中，請尋找以下兩處並修改 `systemPrompt` 變數：

### 1. Gemini API 修改處（約第 166 行）
```javascript
async function callGeminiAPI(apiKey, model, messages) {
  const selectedModel = model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
  
  // 這裡修改你的系統提示詞 👇
  const systemPrompt = "你是一個電影專家 AI 助手...";
```

### 2. OpenAI API 修改處（約第 206 行）
```javascript
async function callOpenAIAPI(apiKey, model, messages) {
  const selectedModel = model || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';
  
  // 這裡修改你的系統提示詞 👇
  const systemPrompt = "你是一個電影專家 AI 助手...";
```

---

## 大模型 API 請求酬載（Request Payload）結構

### Gemini API (v1beta) 格式
Gemini 將系統提示詞作為 `systemInstruction` 欄位傳遞，與對話歷史獨立：
```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "推薦幾部科幻片" }] },
    { "role": "model", "parts": [{ "text": "好的，為您推薦..." }] }
  ],
  "systemInstruction": {
    "parts": [{ "text": "你是一個電影專家 AI 助手..." }]
  }
}
```

### OpenAI API 格式
OpenAI 將系統提示詞作為第一個角色為 `system` 的 Message 傳入陣列：
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "你是一個電影專家 AI 助手..." },
    { "role": "user", "content": "推薦幾部科幻片" }
  ]
}
```
