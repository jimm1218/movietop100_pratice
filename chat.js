document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const chatTriggerBtn = document.getElementById('chat-trigger-btn');
  const chatWindow = document.getElementById('chat-window');
  const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
  const minimizeChatBtn = document.getElementById('minimize-chat-btn');
  const chatSettingsPanel = document.getElementById('chat-settings-panel');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const chatInputForm = document.getElementById('chat-input-form');
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatMessages = document.getElementById('chat-messages');
  
  // Settings Elements
  const aiProvider = document.getElementById('ai-provider');
  const aiApiKey = document.getElementById('ai-api-key');
  const aiModel = document.getElementById('ai-model');
  const apiKeyRow = document.getElementById('api-key-row');
  const modelRow = document.getElementById('model-row');

  // Models list mapping
  const providerModels = {
    mock: [],
    gemini: ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
  };

  // Chat History State
  let chatHistory = []; // stores {role: 'user'|'assistant', content: '...'}

  // 1. Load Settings from LocalStorage
  function loadSettings() {
    const provider = localStorage.getItem('ai_chat_provider') || 'mock';
    const apiKey = localStorage.getItem('ai_chat_apikey') || '';
    const model = localStorage.getItem('ai_chat_model') || '';

    aiProvider.value = provider;
    aiApiKey.value = apiKey;
    
    updateSettingsUI(provider);
    
    if (provider !== 'mock' && model) {
      aiModel.value = model;
    }
  }

  // Update configuration panel fields based on provider selection
  function updateSettingsUI(provider) {
    // Reset models select
    aiModel.innerHTML = '';
    
    if (provider === 'mock') {
      apiKeyRow.style.display = 'none';
      modelRow.style.display = 'none';
    } else {
      apiKeyRow.style.display = 'block';
      modelRow.style.display = 'block';
      
      // Populate models drop-down
      const models = providerModels[provider] || [];
      models.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = m;
        aiModel.appendChild(option);
      });
    }
  }

  // Handle provider dropdown changes
  aiProvider.addEventListener('change', (e) => {
    updateSettingsUI(e.target.value);
  });

  // Save configurations handler
  saveSettingsBtn.addEventListener('click', () => {
    const provider = aiProvider.value;
    const apiKey = aiApiKey.value.trim();
    const model = aiModel.value;

    if (provider !== 'mock' && !apiKey) {
      alert('請輸入 API Key！');
      return;
    }

    localStorage.setItem('ai_chat_provider', provider);
    localStorage.setItem('ai_chat_apikey', apiKey);
    if (provider !== 'mock') {
      localStorage.setItem('ai_chat_model', model);
    }

    // Append system alert bubble
    appendSystemMessage(`設定已儲存！目前使用模式為「${getProviderLabel(provider)}」`);
    chatSettingsPanel.style.display = 'none';
  });

  function getProviderLabel(provider) {
    if (provider === 'mock') return '本地端智慧模擬';
    if (provider === 'gemini') return 'Gemini API';
    if (provider === 'openai') return 'OpenAI API';
    return provider;
  }

  // 2. Chat Panel Toggle Logic
  chatTriggerBtn.addEventListener('click', () => {
    chatTriggerBtn.style.display = 'none';
    chatWindow.style.display = 'flex';
    chatInput.focus();
    scrollToBottom();
  });

  minimizeChatBtn.addEventListener('click', () => {
    chatWindow.style.display = 'none';
    chatTriggerBtn.style.display = 'flex';
  });

  toggleSettingsBtn.addEventListener('click', () => {
    if (chatSettingsPanel.style.display === 'none') {
      chatSettingsPanel.style.display = 'block';
    } else {
      chatSettingsPanel.style.display = 'none';
    }
  });

  // Textarea input auto-grow height handler
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    chatSendBtn.disabled = !chatInput.value.trim();
  });

  // 3. Send and Process Messages
  chatInputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // Reset input area
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatSendBtn.disabled = true;

    // Append User Message bubble
    appendMessage('user', userMessage);
    chatHistory.push({ role: 'user', content: userMessage });

    // Show Typing loading indicator
    const typingBubble = appendTypingIndicator();
    scrollToBottom();

    const provider = localStorage.getItem('ai_chat_provider') || 'mock';
    const apiKey = localStorage.getItem('ai_chat_apikey') || '';
    const model = localStorage.getItem('ai_chat_model') || '';

    try {
      let aiResponse = '';
      if (provider === 'mock') {
        // Run Local Simulator
        aiResponse = await getLocalMockResponse(userMessage);
      } else if (provider === 'gemini') {
        aiResponse = await callGeminiAPI(apiKey, model, chatHistory);
      } else if (provider === 'openai') {
        aiResponse = await callOpenAIAPI(apiKey, model, chatHistory);
      }

      // Remove typing bubble and append AI response
      typingBubble.remove();
      appendMessage('ai', aiResponse);
      chatHistory.push({ role: 'assistant', content: aiResponse });
    } catch (err) {
      console.error(err);
      typingBubble.remove();
      appendMessage('ai', `⚠️ 發生錯誤：${err.message || err}\n請檢查 API Key、模型設定或網路連線狀態。`);
    }

    scrollToBottom();
  });

  // Append a standard user or AI text bubble
  function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'msg-bubble';
    
    // Parse line breaks for clean displays
    bubbleDiv.innerHTML = text.replace(/\n/g, '<br>');
    
    msgDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(msgDiv);
  }

  // Append system notify bubble
  function appendSystemMessage(text) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'message system-msg';
    sysDiv.innerHTML = `<span class="system-badge">${text}</span>`;
    chatMessages.appendChild(sysDiv);
    scrollToBottom();
  }

  // Typing indicator dots bubble
  function appendTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai typing-bubble';
    msgDiv.innerHTML = `
      <div class="msg-bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(msgDiv);
    return msgDiv;
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // 4. API Request Calls
  async function callGeminiAPI(apiKey, model, messages) {
    const selectedModel = model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    
    const systemPrompt = "你是一個電影專家 AI 助手，對「貓眼電影 TOP 100 排行榜」及全球經典電影瞭如指掌。你將協助使用者解答關於電影的任何問題。你可以根據排行榜中的電影向使用者進行推薦、介紹主演、分析上映年代，或提供影評。請以親切、專業的中文（繁體）回答。";
    
    // Convert history for Gemini structure
    const contents = [];
    messages.forEach(m => {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `HTTP ${response.status}`);
    }

    const resJson = await response.json();
    return resJson.candidates[0].content.parts[0].text;
  }

  async function callOpenAIAPI(apiKey, model, messages) {
    const selectedModel = model || 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const systemPrompt = "你是一個電影專家 AI 助手，對「貓眼電影 TOP 100 排行榜」及全球經典電影瞭如指掌。你將協助使用者解答關於電影的任何問題。你可以根據排行榜中的電影向使用者進行推薦、介紹主演、分析上映年代，或提供影評。請以親切、專業的中文（繁體）回答。";
    
    // Map history to OpenAI format
    const formattedMsgs = [{ role: 'system', content: systemPrompt }];
    messages.forEach(m => {
      formattedMsgs.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      });
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: formattedMsgs
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `HTTP ${response.status}`);
    }

    const resJson = await response.json();
    return resJson.choices[0].message.content;
  }

  // 5. Local Mock Simulation logic (Keyword search)
  function getLocalMockResponse(userMessage) {
    return new Promise((resolve) => {
      // Small artificial delay to simulate typing
      setTimeout(() => {
        const query = userMessage.toLowerCase();
        const moviesList = window.moviesData || [];
        
        // A. Handle recommendation request
        if (query.includes('推薦') || query.includes('介紹幾部') || query.includes('好看的')) {
          let recs = [];
          if (query.includes('科幻')) {
            recs = moviesList.filter(m => m.title.includes('星際') || m.title.includes('盜夢') || m.title.includes('哈利') || m.title.includes('阿凡達') || m.title.includes('蝴蝶效應'));
          } else if (query.includes('喜劇') || query.includes('笑')) {
            recs = moviesList.filter(m => m.star.includes('周星馳') || m.title.includes('喜劇之王') || m.title.includes('大話西遊'));
          } else if (query.includes('悲劇') || query.includes('催淚') || query.includes('哭')) {
            recs = moviesList.filter(m => m.title.includes('素媛') || m.title.includes('熔爐') || m.title.includes('何以為家') || m.title.includes('忠犬八公'));
          }
          
          // Default recommendations if no filter matched or not enough found
          if (recs.length < 2) {
            recs = [
              moviesList.find(m => m.rank === 1), // 我不是藥神
              moviesList.find(m => m.rank === 2), // 肖申克的救贖
              moviesList.find(m => m.rank === 5)  // 霸王別姬
            ].filter(Boolean);
          }

          // Format output
          let responseText = `🎬 好的！根據貓眼 TOP 100 排行榜，為你挑選了以下經典大作推薦：\n\n`;
          recs.slice(0, 4).forEach(m => {
            responseText += `🏆 **#${m.rank} 《${m.title}》** (${m.score}分)\n`;
            responseText += `  • 主演：${m.star}\n`;
            responseText += `  • 上映：${m.releasetime}\n\n`;
          });
          responseText += `點擊頁面中的電影卡片可以查看更多簡介喔！`;
          resolve(responseText);
          return;
        }

        // B. Search for specific movie details by title keyword
        for (const movie of moviesList) {
          if (query.includes(movie.title.toLowerCase()) || (movie.title.length > 2 && query.includes(movie.title.substring(0, 3).toLowerCase()))) {
            let responseText = `🔍 找到了！**《${movie.title}》** 在經典排行榜中位列 **第 ${movie.rank} 名**：\n\n`;
            responseText += `⭐ 貓眼評分：**${movie.score}分**\n`;
            responseText += `👥 主要演員：${movie.star}\n`;
            responseText += `📅 上映日期：${movie.releasetime}\n\n`;
            responseText += `這是一部影史殿堂級的經典大作，在排行榜中享有極高人氣，你可以點擊該電影卡片，在彈出視窗中閱讀更詳細的簡介與海報圖！`;
            resolve(responseText);
            return;
          }
        }

        // C. Search by actor name keywords
        let actorMovies = [];
        let actorName = '';
        for (const movie of moviesList) {
          const stars = movie.star.split(',');
          for (const star of stars) {
            const trimmedStar = star.trim();
            if (trimmedStar.length > 1 && query.includes(trimmedStar.toLowerCase())) {
              actorName = trimmedStar;
              if (!actorMovies.some(m => m.rank === movie.rank)) {
                actorMovies.push(movie);
              }
            }
          }
        }

        if (actorMovies.length > 0) {
          let responseText = `🎭 貓眼 TOP 100 排行榜中，由 **${actorName}** 主演的經典作品有：\n\n`;
          actorMovies.slice(0, 6).forEach(m => {
            responseText += `• **#${m.rank} 《${m.title}》** (評分 ${m.score} | 上映 ${m.releasetime})\n`;
          });
          responseText += `\n你對其中哪一部作品最感興趣呢？`;
          resolve(responseText);
          return;
        }

        // D. General fallback response
        resolve(
          "你好！我是你的本地電影小幫手。你可以試著問我：\n" +
          "• 「推薦幾部催淚的電影」\n" +
          "• 「霸王別姬是第幾名？」\n" +
          "• 「有周星馳演的電影嗎？」\n\n" +
          "或者，點擊對話視窗右上角的 ⚙️ 設定鈕，輸入你的 API Key 就能與完整的大模型聊天喔！"
        );
      }, 800);
    });
  }

  // Fire up config settings
  loadSettings();
});
