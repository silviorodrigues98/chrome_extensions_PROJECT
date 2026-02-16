
(function () {
    const DomMonitor = {
        id: 'dom-monitor',
        name: 'DOM Monitor',
        description: 'Monitora alterações em elementos específicos com alertas sonoros',
        icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',

        state: {
            isActive: false,
            isSelecting: false,
            selectedSelector: null,
            stats: {
                added: 0,
                removed: 0,
                attributes: 0,
                total: 0
            }
        },

        init: function (tabId) {
            console.log('DOM Monitor initialized for tab', tabId);
            this.tabId = tabId;
            this.loadState();
            this.bindEvents();
        },

        bindEvents: function () {
            const toggleBtn = document.getElementById('toggleMonitorBtn');
            const selectBtn = document.getElementById('selectElementBtn');
            const testSoundBtn = document.getElementById('testSoundBtn');

            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => this.toggleMonitoring());
            }
            if (selectBtn) {
                selectBtn.addEventListener('click', () => this.toggleSelectionMode());
            }
            if (testSoundBtn) {
                testSoundBtn.addEventListener('click', () => this.playAlertSound());
            }
        },

        loadState: function () {
            const key = `domMonitor_${this.tabId}`;
            chrome.storage.local.get([key], (result) => {
                if (result[key]) {
                    this.state = result[key];
                    this.updateUI();
                }
            });
        },

        saveState: function () {
            const key = `domMonitor_${this.tabId}`;
            chrome.storage.local.set({ [key]: this.state });
        },

        toggleSelectionMode: function () {
            this.state.isSelecting = !this.state.isSelecting;

            if (this.state.isSelecting) {
                // Deactivate monitoring while selecting
                if (this.state.isActive) {
                    this.toggleMonitoring();
                }

                chrome.scripting.executeScript({
                    target: { tabId: this.tabId },
                    function: startElementSelection
                });
                // Close popup? No, keep it open to show status, 
                // but usually clicking inside page closes popup. 
                // We rely on the user clicking the page, which closes the popup.
                // When they reopen, we need to handle the message they sent before closing?
                // Actually, the popup closes immediately when they click the page. 
                // So we listen for the message in background? 
                // OR we just tell the user "Click element on page" and the popup WILL close.
                // We need the background script to receive the message and save it to storage.
                // Since we are in the popup context here, this is tricky.

                // Workaround: 
                // 1. Inject script.
                // 2. User clicks page -> Popup closes.
                // 3. Script sends message to runtime.
                // 4. Background script receives message? We need to ensure background handles it.
                // Let's modify popup to listen to runtime messages too, BUT it will be closed.
                // So the CONTENT SCRIPT should save to storage directly if possible? 
                // Yes, content script can save to chrome.storage.local.

                window.close(); // Close popup explicitly to let user interact
            }

            this.updateUI();
        },

        toggleMonitoring: function () {
            if (!this.state.selectedSelector) {
                alert('Please select an element first.');
                return;
            }

            this.state.isActive = !this.state.isActive;
            this.state.isSelecting = false;

            if (this.state.isActive) {
                UtilityHub.deactivateOthers(this.id, this.tabId).then(() => {
                    this.startObserver();
                });
            } else {
                this.stopObserver();
            }

            this.updateUI();
            this.saveState();
        },

        startObserver: function () {
            chrome.scripting.executeScript({
                target: { tabId: this.tabId },
                args: [this.state.selectedSelector],
                function: startDomObserver
            });

            chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        },

        stopObserver: function () {
            chrome.scripting.executeScript({
                target: { tabId: this.tabId },
                function: stopDomObserver
            });
            chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this));
        },

        playAlertSound: function () {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);

            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        },

        handleMessage: function (message) {
            if (message.type === 'DOM_CHANGES') {
                this.state.stats = message.stats;
                this.playAlertSound();
                this.updateUI();
                this.saveState();
            }
        },

        updateUI: function () {
            const toggleBtn = document.getElementById('toggleMonitorBtn');
            const selectBtn = document.getElementById('selectElementBtn');
            const status = document.getElementById('monitorStatus');
            const selDisplay = document.getElementById('selectedElementDisplay');

            if (!toggleBtn) return;

            // Update Selection Display
            if (this.state.selectedSelector) {
                selDisplay.style.display = 'block';
                selDisplay.textContent = this.state.selectedSelector;
                toggleBtn.disabled = false;
                toggleBtn.style.opacity = '1';
                toggleBtn.style.cursor = 'pointer';
            } else {
                selDisplay.style.display = 'none';
                toggleBtn.disabled = true;
                toggleBtn.style.opacity = '0.5';
                toggleBtn.style.cursor = 'not-allowed';
            }

            // Update Monitoring State
            if (this.state.isActive) {
                toggleBtn.textContent = 'Parar Monitoramento';
                toggleBtn.style.backgroundColor = 'var(--error)';
                toggleBtn.style.color = '#fff';
                status.textContent = 'Monitorando...';
                status.style.color = 'var(--success)';
                selectBtn.disabled = true;
                selectBtn.style.opacity = '0.5';
            } else {
                toggleBtn.textContent = 'Iniciar Monitoramento';
                toggleBtn.style.backgroundColor = '';
                toggleBtn.style.color = '';
                status.textContent = 'Monitor parado';
                status.style.color = 'var(--text-muted)';
                selectBtn.disabled = false;
                selectBtn.style.opacity = '1';
            }

            document.getElementById('addedNodesCount').textContent = this.state.stats.added;
            document.getElementById('removedNodesCount').textContent = this.state.stats.removed;
            document.getElementById('attrChangesCount').textContent = this.state.stats.attributes;
            document.getElementById('totalChangesCount').textContent = this.state.stats.total;
        },

        deactivate: function (tabId) {
            return new Promise((resolve) => {
                const key = `domMonitor_${tabId}`;
                chrome.storage.local.get([key], (result) => {
                    if (result[key] && result[key].isActive) {
                        // Logic to stop remote observer
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            function: stopDomObserver
                        }).then(() => {
                            const newState = { ...result[key], isActive: false };
                            chrome.storage.local.set({ [key]: newState }, () => {
                                resolve(true);
                            });
                        }).catch(() => resolve(false));
                    } else {
                        resolve(false);
                    }
                });
            });
        },

        cleanup: function () {
            chrome.runtime.onMessage.removeListener(this.handleMessage.bind(this));
        }
    };

    UtilityHub.registerModule(DomMonitor);
})();

// === INJECTED FUNCTIONS ===

function startElementSelection(tabId) {
    // CSS to highlight elements
    const style = document.createElement('style');
    style.id = 'uh-selection-style';
    style.textContent = `
        .uh-highlight-item {
            outline: 2px solid #ff4081 !important;
            cursor: crosshair !important;
            background-color: rgba(255, 64, 129, 0.1) !important;
        }
    `;
    document.head.appendChild(style);

    function getCssSelector(el) {
        if (!(el instanceof Element)) return;
        const path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
                selector += '#' + el.id;
                path.unshift(selector);
                break;
            } else {
                let sib = el, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() == selector)
                        nth++;
                }
                if (nth != 1)
                    selector += ":nth-of-type(" + nth + ")";
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(" > ");
    }

    const handler = {
        mouseover: (e) => {
            e.stopPropagation();
            const prev = document.querySelector('.uh-highlight-item');
            if (prev) prev.classList.remove('uh-highlight-item');
            e.target.classList.add('uh-highlight-item');
        },
        click: (e) => {
            e.preventDefault();
            e.stopPropagation();

            const selector = getCssSelector(e.target);
            const prev = document.querySelector('.uh-highlight-item');
            if (prev) prev.classList.remove('uh-highlight-item');

            // Remove styles and listeners
            const styleEl = document.getElementById('uh-selection-style');
            if (styleEl) styleEl.remove();

            document.removeEventListener('mouseover', handler.mouseover, true);
            document.removeEventListener('click', handler.click, true);

            // Save directly to storage using the tabId passed in args
            const key = `domMonitor_${tabId}`;
            chrome.storage.local.get([key], (result) => {
                const currentState = result[key] || {
                    isActive: false,
                    stats: { added: 0, removed: 0, attributes: 0, total: 0 }
                };

                const newState = {
                    ...currentState,
                    isSelecting: false,
                    selectedSelector: selector
                };

                chrome.storage.local.set({ [key]: newState }, () => {
                    alert(`Elemento selecionado: ${selector}\nAbra a extensão novamente para iniciar.`);
                });
            });
        }
    };

    document.addEventListener('mouseover', handler.mouseover, true);
    document.addEventListener('click', handler.click, true);
}

function startDomObserver(selector) {
    if (window.domObserver) {
        window.domObserver.disconnect();
    }

    const target = document.querySelector(selector);
    if (!target) {
        console.error('Target element not found:', selector);
        return;
    }

    window.domStats = { added: 0, removed: 0, attributes: 0, total: 0 };

    window.domObserver = new MutationObserver((mutations) => {
        let changed = false;
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                window.domStats.added += mutation.addedNodes.length;
                window.domStats.removed += mutation.removedNodes.length;
                changed = true;
            } else if (mutation.type === 'attributes') {
                window.domStats.attributes++;
                changed = true;
            }
        });

        if (changed) {
            window.domStats.total = window.domStats.added + window.domStats.removed + window.domStats.attributes;
            chrome.runtime.sendMessage({
                type: 'DOM_CHANGES',
                stats: window.domStats
            });

            // Also play sound IN PAGE context? 
            // Often autoplay policies block this unless interacted. 
            // Popup is better for sound if it's open. 
            // If popup is closed, we need BACKGROUND to play sound? 
            // Background scripts can't play audio easily in MV3 non-persistent.
            // Best bet: Play sound in Popup if open.
            // If user wants background monitoring, that's harder. 
            // For now, let's stick to Popup open or "Keep Alive" mode (which keeps popup open?)
            // Actually, if popup closes, connection is lost.
            // The "Keep Alive" feature we built IS for this!
        }
    });

    window.domObserver.observe(target, {
        childList: true,
        subtree: true,
        attributes: true
    });

    console.log('DOM Observer started on', selector);
}

function stopDomObserver() {
    if (window.domObserver) {
        window.domObserver.disconnect();
        window.domObserver = null;
        console.log('DOM Observer stopped');
    }
}
