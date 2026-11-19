// Background Service Worker for Chrome/Yandex/Edge Extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TRANSLATE_TEXT') {
    const { text, target, source } = request;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source || 'auto'}&tl=${target || 'ru'}&dt=t&q=${encodeURIComponent(text)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        let translated = '';
        if (data && data[0]) {
          for (const s of data[0]) {
            if (s && s[0]) translated += s[0];
          }
        }
        sendResponse({ translatedText: translated || text });
      })
      .catch(err => {
        console.error('Extension fetch error:', err);
        sendResponse({ translatedText: text });
      });

    return true; // Asynchronous response
  }
});
