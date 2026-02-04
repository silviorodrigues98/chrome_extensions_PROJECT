// Helper para atualizar o badge (ícone)
function updateBadge(tabId, isActive) {
    if (isActive) {
        chrome.action.setBadgeText({ text: 'AR', tabId: tabId });
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

    // Keep-Alive alarm handler
    if (alarm.name.startsWith('keepAlive_')) {
        const tabIdStr = alarm.name.split('_')[1];
        const tabId = parseInt(tabIdStr);

        chrome.storage.local.get([alarm.name], (result) => {
            const data = result[alarm.name];
            if (data && data.active) {
                // Execute ping script in the tab
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        document.dispatchEvent(new MouseEvent('mousemove', {
                            bubbles: true,
                            clientX: Math.random() * window.innerWidth,
                            clientY: Math.random() * window.innerHeight
                        }));
                        document.dispatchEvent(new KeyboardEvent('keydown', {
                            bubbles: true,
                            key: 'Shift'
                        }));
                        document.dispatchEvent(new KeyboardEvent('keyup', {
                            bubbles: true,
                            key: 'Shift'
                        }));
                        window.scrollBy(0, 1);
                        setTimeout(() => window.scrollBy(0, -1), 50);
                        const url = window.location.href;
                        const sep = url.indexOf('?') > -1 ? '&' : '?';
                        fetch(url + sep + 'ka_bust=' + Date.now(), {
                            credentials: 'include',
                            method: 'GET',
                            cache: 'no-store'
                        }).catch(() => { });
                        console.log('🔁 Keep-alive ping at', new Date().toLocaleTimeString());
                    }
                }).catch(() => { });

                // Update storage with lastPing, nextPing, and increment pingCount
                const now = Date.now();
                const interval = data.interval || 120;
                const nextPing = now + (interval * 1000);
                const newPingCount = (data.pingCount || 0) + 1;

                chrome.storage.local.set({
                    [alarm.name]: {
                        ...data,
                        lastPing: now,
                        nextPing: nextPing,
                        pingCount: newPingCount
                    }
                });

                // Update badge
                chrome.action.setBadgeText({ text: 'KA', tabId: tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tabId });
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

