// Verificar e recarregar abas
setInterval(() => {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            chrome.storage.local.get([`autoReload_${tab.id}`], (result) => {
                const data = result[`autoReload_${tab.id}`];

                if (data && data.active && data.nextReload <= Date.now()) {
                    // Recarregar a aba
                    chrome.tabs.reload(tab.id);

                    // Agendar próximo reload
                    chrome.storage.local.set({
                        [`autoReload_${tab.id}`]: {
                            ...data,
                            nextReload: Date.now() + (data.interval * 1000)
                        }
                    });
                }
            });
        });
    });
}, 1000);

// Limpar dados quando aba é fechada
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove([`autoReload_${tabId}`]);
});