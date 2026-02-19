// WhatsApp Signature Module
// Appends a custom signature to WhatsApp Web messages

const WhatsAppSignatureModule = (function () {
    let currentTabId;
    let signatureText = '─ ꜱɪʟᴠɪᴏ';

    function init(tabId) {
        currentTabId = tabId;
        checkWhatsAppPage();
        loadStatus();
        setupEventListeners();
    }

    function checkWhatsAppPage() {
        chrome.tabs.get(currentTabId, (tab) => {
            const url = tab.url || '';
            const isWhatsApp = url.includes('web.whatsapp.com');

            const infoBox = document.querySelector('.info-box');
            const appendBtn = document.getElementById('sigAppendBtn');
            const textInput = document.getElementById('sigText');
            const autoEnterEl = document.getElementById('sigAutoEnter');

            if (!isWhatsApp) {
                if (infoBox) {
                    infoBox.style.background = 'rgba(239, 68, 68, 0.1)';
                    infoBox.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    infoBox.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span style="color: #ef4444;">Este recurso só funciona no WhatsApp Web</span>
                    `;
                }

                // Disable all interactions
                if (appendBtn) {
                    appendBtn.disabled = true;
                    appendBtn.style.opacity = '0.5';
                    appendBtn.style.cursor = 'not-allowed';
                }
                if (textInput) {
                    textInput.disabled = true;
                    textInput.style.opacity = '0.5';
                    textInput.style.cursor = 'not-allowed';
                }
                if (autoEnterEl) {
                    autoEnterEl.disabled = true;
                    autoEnterEl.parentElement.style.opacity = '0.5';
                    autoEnterEl.parentElement.style.cursor = 'not-allowed';
                }
            } else {
                if (infoBox) {
                    infoBox.style.background = 'rgba(16, 185, 129, 0.1)';
                    infoBox.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                    infoBox.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span style="color: #10b981;">Conectado ao WhatsApp Web</span>
                    `;
                }

                // Enable interactions
                if (appendBtn) {
                    appendBtn.disabled = false;
                    appendBtn.style.opacity = '1';
                    appendBtn.style.cursor = 'pointer';
                }
                if (textInput) {
                    textInput.disabled = false;
                    textInput.style.opacity = '1';
                    textInput.style.cursor = 'text';
                }
                if (autoEnterEl) {
                    autoEnterEl.disabled = false;
                    autoEnterEl.parentElement.style.opacity = '1';
                    autoEnterEl.parentElement.style.cursor = 'pointer';
                }
            }
        });
    }

    function loadStatus() {
        // Use a global key for the signature so content scripts can access it easily
        chrome.storage.local.get(['whatsapp_global_signature', 'whatsapp_auto_enter'], (result) => {
            if (result.whatsapp_global_signature) {
                signatureText = result.whatsapp_global_signature;
                const textInput = document.getElementById('sigText');
                if (textInput) textInput.value = signatureText;
            }
            if (result.whatsapp_auto_enter !== undefined) {
                const autoEnterEl = document.getElementById('sigAutoEnter');
                if (autoEnterEl) autoEnterEl.checked = result.whatsapp_auto_enter;
            }
        });
    }

    function setupEventListeners() {
        const appendBtn = document.getElementById('sigAppendBtn');
        if (appendBtn) {
            appendBtn.addEventListener('click', appendSignature);
        }

        const textInput = document.getElementById('sigText');
        if (textInput) {
            textInput.addEventListener('input', (e) => {
                signatureText = e.target.value;
                chrome.storage.local.set({ 'whatsapp_global_signature': signatureText });
            });
        }

        const autoEnterEl = document.getElementById('sigAutoEnter');
        if (autoEnterEl) {
            autoEnterEl.addEventListener('change', (e) => {
                chrome.storage.local.set({ 'whatsapp_auto_enter': e.target.checked });
            });
        }
    }

    function appendSignature() {
        chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            func: async (sig) => {
                const selectors = [
                    '#main footer div[contenteditable="true"][role="textbox"]',
                    'footer .lexical-rich-text-input [contenteditable="true"]',
                    '.copyable-text.selectable-text[contenteditable="true"]',
                    'footer [contenteditable="true"]',
                    '[data-tab="10"]'
                ];

                let input = null;
                for (const selector of selectors) {
                    input = document.querySelector(selector);
                    if (input) {
                        break;
                    }
                }

                if (!input) {
                    return false;
                }

                const getNormalizedText = (el) => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
                const initialTextNormalized = getNormalizedText(input);
                const initialLength = (input.innerText || '').length;

                const prefix = (initialLength > 0) ? '\n\n' : '';
                const fullSig = prefix + sig;

                const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

                const tryInsert = async (methodName, action) => {
                    input.focus();

                    // Set cursor to end
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(input);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);

                    action();

                    // Wait a bit for the framework to update the DOM
                    await wait(50);

                    const currentText = input.innerText || '';
                    const currentNormalized = getNormalizedText(input);

                    // Check if text changed or if signature is present
                    if (currentText.length > initialLength || currentNormalized !== initialTextNormalized || currentText.includes(sig)) {
                        // Dispatch events to satisfy WhatsApp's state management
                        ['input', 'change', 'keydown', 'keyup'].forEach(type => {
                            input.dispatchEvent(new Event(type, { bubbles: true }));
                        });
                        return true;
                    }
                    return false;
                };

                // Method 1: execCommand (Best for traditional contenteditable)
                if (await tryInsert('execCommand', () => {
                    try {
                        document.execCommand('insertText', false, fullSig);
                    } catch (e) { }
                })) return true;

                // Method 2: InputEvent (Better for Lexical/Modern editors)
                if (await tryInsert('InputEvent', () => {
                    const event = new InputEvent('beforeinput', {
                        inputType: 'insertText',
                        data: fullSig,
                        bubbles: true,
                        cancelable: true
                    });
                    input.dispatchEvent(event);
                })) return true;

                // Method 3: Direct Value Assignment (Last resort for very stubborn editors)
                const prevValue = input.innerText || '';
                input.innerText = prevValue + fullSig;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            },
            args: [signatureText]
        }).then((result) => {
            if (result && result[0] && result[0].result) {
                showToast('Assinatura anexada!');
            } else {
                showToast('Erro: Não foi possível inserir a assinatura', 'error');
            }
        }).catch(err => {
            showToast('Erro ao anexar', 'error');
        });
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('sigToast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'ka-toast show ' + type;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    function deactivate(tabId) {
        // This module doesn't have a background process to deactivate
        return Promise.resolve(false);
    }

    return {
        init,
        id: 'whatsapp-signature',
        name: 'WhatsApp Sig',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
        description: 'Assinatura automática no WhatsApp'
    };
})();

// Register with core
if (typeof UtilityHub !== 'undefined') {
    UtilityHub.registerModule(WhatsAppSignatureModule);
}
