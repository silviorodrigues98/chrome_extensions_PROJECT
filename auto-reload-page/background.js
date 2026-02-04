// Escutar alarmes para recarregar abas
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('autoReload_')) {
        const tabIdStr = alarm.name.split('_')[1];
        const tabId = parseInt(tabIdStr);

        chrome.storage.local.get([alarm.name], (result) => {
            const data = result[alarm.name];
            if (data && data.active) {
                // Recarregar a aba
                chrome.tabs.reload(tabId, { bypassCache: data.hardReload || false });

                // Atualizar o próximo reload no storage para o popup acompanhar
                chrome.storage.local.set({
                    [alarm.name]: {
                        ...data,
                        nextReload: Date.now() + (data.interval * 1000)
                    }
                });
            }
        });
    }
});

// Limpar dados e alarmes quando aba é fechada
chrome.tabs.onRemoved.addListener((tabId) => {
    const key = `autoReload_${tabId}`;
    chrome.storage.local.remove([key]);
    chrome.alarms.clear(key);
});
