// Helper para atualizar o badge (ícone)
function updateBadge(tabId, isActive) {
    if (isActive) {
        chrome.action.setBadgeText({ text: 'ON', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tabId });
    } else {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
}

// Escutar alarmes para recarregar abas
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name.startsWith('autoReload_')) {
        const tabIdStr = alarm.name.split('_')[1];
        const tabId = parseInt(tabIdStr);

        chrome.storage.local.get([alarm.name], (result) => {
            const data = result[alarm.name];
            if (data && data.active) {
                // Garantir que o badge está visível
                updateBadge(tabId, true);

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

// Restaurar badges ao recarregar a extensão ou iniciar
chrome.runtime.onStartup.addListener(() => restoreAllBadges());
chrome.runtime.onInstalled.addListener(() => restoreAllBadges());

function restoreAllBadges() {
    chrome.storage.local.get(null, (items) => {
        for (const [key, data] of Object.entries(items)) {
            if (key.startsWith('autoReload_') && data.active) {
                const tabId = parseInt(key.split('_')[1]);
                updateBadge(tabId, true);
            }
        }
    });
}

// Garantir que o badge persista após reload ou navegação
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        const key = `autoReload_${tabId}`;
        chrome.storage.local.get([key], (result) => {
            const data = result[key];
            if (data && data.active) {
                updateBadge(tabId, true);
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

