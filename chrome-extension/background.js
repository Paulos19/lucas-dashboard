chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureAndSend") {
        
        // Query the active tab in the current window
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!tabs || tabs.length === 0) {
                sendResponse({success: false, error: "Nenhuma aba ativa encontrada."});
                return;
            }
            
            const currentTab = tabs[0];
            
            // Capture the visible area of the tab
            chrome.tabs.captureVisibleTab(currentTab.windowId, {format: 'png'}, function(dataUrl) {
                if (chrome.runtime.lastError) {
                    sendResponse({success: false, error: chrome.runtime.lastError.message});
                    return;
                }

                const webhookUrl = "https://n8n-n8n.qqfurw.easypanel.host/webhook/capture-lead";
                
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: request.userId,
                        image: dataUrl,
                        sourceUrl: currentTab.url,
                        sourceTitle: currentTab.title
                    })
                })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`Erro do Servidor: ${res.status}`);
                    }
                    return res.text();
                })
                .then(() => {
                    sendResponse({success: true});
                })
                .catch(err => {
                    sendResponse({success: false, error: err.message});
                });
            });
        });
        
        // Return true to indicate that we will send a response asynchronously
        return true;
    }
});
