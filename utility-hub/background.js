// Helper para atualizar o badge (ícone)
function updateBadge(tabId, label, isActive) {
    if (isActive && label) {
        chrome.action.setBadgeText({ text: label, tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tabId });
    } else {
        // Se desativar, temos que checar se outro módulo está ativo antes de limpar
        checkAndRestoreBadge(tabId);
    }
}

function checkAndRestoreBadge(tabId) {
    chrome.storage.local.get(null, (items) => {
        // Prioridade: Auto Reload > Keep Alive > WhatsApp Sig
        if (items[`autoReload_${tabId}`] && items[`autoReload_${tabId}`].active) {
            chrome.action.setBadgeText({ text: 'AR', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tabId });
        } else if (items[`keepAlive_${tabId}`] && items[`keepAlive_${tabId}`].active) {
            chrome.action.setBadgeText({ text: 'KA', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tabId });
        } else if (items.whatsapp_auto_enter) {
            // WhatsApp Sig é global ou por aba? 
            // O código atual do content.js usa um valor global 'whatsapp_auto_enter'.
            // Vamos checar se a aba atual é WhatsApp.
            chrome.tabs.get(tabId, (tab) => {
                if (tab && tab.url && tab.url.includes('web.whatsapp.com')) {
                    chrome.action.setBadgeText({ text: 'SIG', tabId: tabId });
                    chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: tabId });
                } else {
                    chrome.action.setBadgeText({ text: '', tabId: tabId });
                }
            });
        } else {
            chrome.action.setBadgeText({ text: '', tabId: tabId });
        }
    });
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
                    args: [data.soundEnabled || false],
                    func: (soundEnabled) => {
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

                        // Play sound if enabled
                        if (soundEnabled) {
                            try {
                                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                                const oscillator = ctx.createOscillator();
                                const gainNode = ctx.createGain();
                                oscillator.connect(gainNode);
                                gainNode.connect(ctx.destination);
                                oscillator.frequency.value = 800;
                                oscillator.type = 'sine';
                                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                                oscillator.start(ctx.currentTime);
                                oscillator.stop(ctx.currentTime + 0.1);
                            } catch (e) {
                                console.log('Sound not available:', e);
                            }
                        }
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
                updateBadge(tabId, 'KA', true);
            }
        });
    }
});

// Escutar mudanças no storage para o WhatsApp Signature
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.whatsapp_auto_enter) {
        const isActive = changes.whatsapp_auto_enter.newValue;
        chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
            tabs.forEach(tab => {
                updateBadge(tab.id, 'SIG', isActive);
            });
        });
    }
});

// Restaurar badges ao recarregar a extensão ou iniciar
chrome.runtime.onStartup.addListener(() => restoreAllBadges());
chrome.runtime.onInstalled.addListener(() => restoreAllBadges());

function restoreAllBadges() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            checkAndRestoreBadge(tab.id);
        });
    });
}

// Garantir que o badge persista após reload ou navegação
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        checkAndRestoreBadge(tabId);
    }
});

// Limpar dados e alarmes quando aba é fechada
chrome.tabs.onRemoved.addListener((tabId) => {
    const key = `autoReload_${tabId}`;
    chrome.storage.local.remove([key]);
    chrome.alarms.clear(key);
});

