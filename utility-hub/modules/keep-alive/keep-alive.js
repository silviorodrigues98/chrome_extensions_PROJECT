// Keep-Alive Module
// Prevents session timeouts by simulating user activity

const KeepAliveModule = (function () {
    let currentTabId;
    let intervalSeconds = 120; // 2 minutes default
    let countdownInterval;

    const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

    // UX Feedback Helpers
    function showToast(message, type = 'success') {
        const toast = document.getElementById('kaToast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'ka-toast show ' + type;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    function showPingPulse() {
        const indicator = document.getElementById('kaPingIndicator');
        if (!indicator) return;
        indicator.classList.remove('pulse');
        void indicator.offsetWidth; // Force reflow
        indicator.classList.add('pulse');
    }

    function playPingSound() {
        const soundEnabled = document.getElementById('kaSoundEnabled')?.checked;
        if (!soundEnabled) return;
        // Create a subtle beep using Web Audio API
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
            console.log('Sound not available');
        }
    }

    function init(tabId) {
        currentTabId = tabId;
        checkRestrictedPage();
        loadStatus();
        setupEventListeners();
    }

    function checkRestrictedPage() {
        chrome.tabs.get(currentTabId, (tab) => {
            const url = tab.url || '';
            const isRestricted = url.startsWith('chrome://') ||
                url.startsWith('edge://') ||
                url.startsWith('about:') ||
                url.startsWith('chrome-extension://');

            if (isRestricted) {
                const infoBox = document.querySelector('.info-box');
                if (infoBox) {
                    infoBox.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span style="color: #ef4444;">Páginas do navegador não suportam Keep Alive</span>
                    `;
                }
                document.getElementById('kaToggleBtn').disabled = true;
                document.getElementById('kaToggleBtn').style.opacity = '0.5';
                document.getElementById('kaToggleBtn').style.cursor = 'not-allowed';
            }
        });
    }

    function loadStatus() {
        const key = `keepAlive_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            const data = result[key] || {};
            const isActive = data.active || false;
            intervalSeconds = data.interval || 120;
            const pingCount = data.pingCount || 0;

            // Sync custom interval input
            const customInput = document.getElementById('kaCustomInterval');
            if (customInput) {
                customInput.value = Math.floor(intervalSeconds / 60);
            }

            // Sync sound toggle
            const soundToggle = document.getElementById('kaSoundEnabled');
            if (soundToggle) {
                soundToggle.checked = data.soundEnabled || false;
            }

            updatePresetActive(intervalSeconds);
            updateUI(isActive, data.lastPing, data.nextPing, pingCount);

            if (isActive) {
                startCountdown();
            }
        });
    }

    function updateUI(isActive, lastPing, nextPing, pingCount) {
        const toggleBtn = document.getElementById('kaToggleBtn');
        const statusEl = document.getElementById('kaStatus');
        const lastPingEl = document.getElementById('kaLastPing');
        const nextPingEl = document.getElementById('kaNextPing');
        const pingCountEl = document.getElementById('kaPingCount');
        const intervalEl = document.getElementById('kaInterval');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');

        if (isActive) {
            toggleBtn.innerHTML = `${stopIcon} <span>Desativar</span>`;
            toggleBtn.classList.add('active');
            statusEl.textContent = 'Ativo';
            statusEl.classList.add('active');
            statusEl.classList.remove('inactive');
            if (statusIndicator) statusIndicator.classList.add('active');
            if (statusText) {
                statusText.textContent = 'Ativo';
                statusText.style.color = 'var(--success)';
            }
        } else {
            toggleBtn.innerHTML = `${playIcon} <span>Ativar</span>`;
            toggleBtn.classList.remove('active');
            statusEl.textContent = 'Inativo';
            statusEl.classList.remove('active');
            statusEl.classList.add('inactive');
            if (statusIndicator) statusIndicator.classList.remove('active');
            if (statusText) {
                statusText.textContent = 'Inativo';
                statusText.style.color = 'var(--text-muted)';
            }
            if (nextPingEl) nextPingEl.textContent = '--';
        }

        if (lastPing) {
            lastPingEl.textContent = new Date(lastPing).toLocaleTimeString();
        } else {
            lastPingEl.textContent = '--';
        }

        if (pingCountEl) {
            pingCountEl.textContent = pingCount || 0;
        }

        const mins = Math.floor(intervalSeconds / 60);
        intervalEl.textContent = mins + ' min';
    }

    function startCountdown() {
        if (countdownInterval) clearInterval(countdownInterval);
        const key = `keepAlive_${currentTabId}`;

        function update() {
            chrome.storage.local.get([key], (result) => {
                const data = result[key];
                if (!data || !data.active) {
                    clearInterval(countdownInterval);
                    return;
                }
                const remaining = Math.max(0, Math.ceil((data.nextPing - Date.now()) / 1000));
                const nextPingEl = document.getElementById('kaNextPing');
                if (nextPingEl) {
                    const mins = Math.floor(remaining / 60);
                    const secs = remaining % 60;
                    nextPingEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                }
            });
        }

        update();
        countdownInterval = setInterval(update, 1000);
    }

    function toggle() {
        const key = `keepAlive_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            const data = result[key] || {};
            const isActive = data.active || false;

            if (isActive) {
                stop(key, data);
            } else {
                start(key, data);
            }
        });
    }

    function stop(key, data) {
        chrome.alarms.clear(key);
        chrome.action.setBadgeText({ text: '', tabId: currentTabId });
        if (countdownInterval) clearInterval(countdownInterval);
        chrome.storage.local.set({
            [key]: { active: false, interval: intervalSeconds, pingCount: data.pingCount || 0 }
        }, () => {
            updateUI(false, null, null, data.pingCount || 0);
            showToast('✋ Keep Alive desativado', 'error');
        });
    }

    function start(key, existingData) {
        const now = Date.now();
        const nextPing = now + (intervalSeconds * 1000);
        const pingCount = existingData.pingCount || 0;
        const soundEnabled = document.getElementById('kaSoundEnabled')?.checked || false;

        chrome.action.setBadgeText({ text: 'KA', tabId: currentTabId });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId: currentTabId });

        chrome.storage.local.set({
            [key]: { active: true, interval: intervalSeconds, lastPing: now, nextPing: nextPing, pingCount: pingCount, soundEnabled: soundEnabled }
        }, () => {
            chrome.alarms.create(key, {
                delayInMinutes: intervalSeconds / 60,
                periodInMinutes: intervalSeconds / 60
            });

            executePing();
            startCountdown();
            updateUI(true, now, nextPing, pingCount + 1);
            showToast('✅ Keep Alive ativado!', 'success');
        });
    }

    function executePing() {
        // Inject enhanced keep-alive script into the page
        chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            func: () => {
                // Simulate mouse movement at random positions
                document.dispatchEvent(new MouseEvent('mousemove', {
                    bubbles: true,
                    clientX: Math.random() * window.innerWidth,
                    clientY: Math.random() * window.innerHeight
                }));

                // Simulate keypress (Shift - non-intrusive)
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    bubbles: true,
                    key: 'Shift'
                }));
                document.dispatchEvent(new KeyboardEvent('keyup', {
                    bubbles: true,
                    key: 'Shift'
                }));

                // Simulate small scroll (minimal visual impact)
                window.scrollBy(0, 1);
                setTimeout(() => window.scrollBy(0, -1), 50);

                // Focus and blur on document body to simulate activity
                if (document.body) {
                    document.body.focus();
                }

                // Fetch current URL to keep session alive
                const url = window.location.href;
                const separator = url.indexOf('?') > -1 ? '&' : '?';
                fetch(url + separator + 'ka_bust=' + Date.now(), {
                    credentials: 'include',
                    method: 'GET',
                    cache: 'no-store'
                }).catch(() => { });

                console.log('🔁 Keep-alive ping executed at', new Date().toLocaleTimeString());
            }
        }).catch((err) => {
            console.warn('Keep-alive script injection failed:', err);
        });

        // Update storage with new ping count and times
        const key = `keepAlive_${currentTabId}`;
        const now = Date.now();
        const nextPing = now + (intervalSeconds * 1000);

        chrome.storage.local.get([key], (result) => {
            const data = result[key] || {};
            const newCount = (data.pingCount || 0) + 1;
            chrome.storage.local.set({
                [key]: { ...data, lastPing: now, nextPing: nextPing, pingCount: newCount }
            });

            const pingCountEl = document.getElementById('kaPingCount');
            if (pingCountEl) pingCountEl.textContent = newCount;
        });

        const lastPingEl = document.getElementById('kaLastPing');
        if (lastPingEl) lastPingEl.textContent = new Date(now).toLocaleTimeString();

        // UX feedback
        showPingPulse();
        playPingSound();
    }

    function updatePresetActive(value) {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') == value);
        });
    }

    function setupEventListeners() {
        document.getElementById('kaToggleBtn').addEventListener('click', toggle);

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                intervalSeconds = val;
                updatePresetActive(val);
                document.getElementById('kaCustomInterval').value = Math.floor(val / 60);
                updateIntervalDisplay();
                applyIntervalChange();
            });
        });

        document.getElementById('kaCustomInterval').addEventListener('change', (e) => {
            const mins = parseInt(e.target.value);
            if (mins >= 1 && mins <= 60) {
                intervalSeconds = mins * 60;
                updatePresetActive(intervalSeconds);
                updateIntervalDisplay();
                applyIntervalChange();
            }
        });

        // Sound toggle listener
        document.getElementById('kaSoundEnabled').addEventListener('change', (e) => {
            const soundEnabled = e.target.checked;
            const key = `keepAlive_${currentTabId}`;
            chrome.storage.local.get([key], (result) => {
                if (result[key]?.active) {
                    chrome.storage.local.set({
                        [key]: { ...result[key], soundEnabled: soundEnabled }
                    });
                }
            });
        });
    }

    function updateIntervalDisplay() {
        const mins = Math.floor(intervalSeconds / 60);
        document.getElementById('kaInterval').textContent = mins + ' min';
    }

    function applyIntervalChange() {
        const key = `keepAlive_${currentTabId}`;
        chrome.storage.local.get([key], (result) => {
            if (result[key]?.active) {
                const nextPing = Date.now() + (intervalSeconds * 1000);
                chrome.alarms.clear(key);
                chrome.alarms.create(key, {
                    delayInMinutes: intervalSeconds / 60,
                    periodInMinutes: intervalSeconds / 60
                });
                chrome.storage.local.set({
                    [key]: { ...result[key], interval: intervalSeconds, nextPing: nextPing }
                });
                startCountdown();
            }
        });
    }

    function cleanup() {
        if (countdownInterval) clearInterval(countdownInterval);
    }

    return {
        init,
        cleanup,
        id: 'keep-alive',
        name: 'Keep Alive',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
        description: 'Evita logout por inatividade'
    };
})();

// Register with core
if (typeof UtilityHub !== 'undefined') {
    UtilityHub.registerModule(KeepAliveModule);
}
