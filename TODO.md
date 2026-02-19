- [x] Fix: Sound trigger in keep-alive mode
    - [x] Issue: Audio does not play when triggered automatically, only on direct user interaction.
    - [x] Potential Cause: Browser autoplay policies blocking non-user-initiated audio.
    - [x] Solution: Ensure the `AudioContext` is initialized or resumed during the initial user "activate" click and stored for subsequent use by the keep-alive trigger.

- [x] Feature: Context-aware extension popup
    - [x] Description: Automatically open the active feature's window (e.g., Auto Reload) instead of the home screen when the extension is clicked.
    - [x] Implementation: Track the active feature state and update the extension's default popup or redirect on load.

- [x] Feature: Mutually exclusive feature modules
    - [x] Description: Ensure that only one feature module can be active at a time to prevent conflicts.
    - [x] Implementation: Update the state management logic to automatically deactivate the current feature when a new one is enabled.

- [x] Documentation: Update README.md
    - [x] Description: Update the project's README to reflect the recent fixes and features.

- [ ] Feature: DOM change monitor (TEMPORARILY DISABLED)
    - [ ] Issue: Module is currently non-functional and has been hidden from the UI.
    - [ ] Task: Debug and fix the mutation observer logic and notification system.
    - [ ] Use Case: Monitoring new messages in web-based chat applications like WhatsApp.

- [x] Feature: WhatsApp Message Signature
    - [x] Description: Manually or automatically append a custom signature to outgoing messages on WhatsApp Web.
    - [x] Implementation: Floating button in chat footer and `Alt + S` keyboard shortcut.
    - [x] Example: `─ ꜱɪʟᴠɪᴏ`

- [ ] Feature: Multi-signature support
    - [ ] Description: Allow users to save multiple signatures and choose which one to use via a dropdown or switch.
    
- [x] Feature: Automatic signature on Enter
    - [x] Description: Automatically append the signature when the Enter key is pressed to send a message.
    - [x] Implementation: Intercept the Enter key event, append the signature to the input field, and then trigger the send action.

- [x] Feature: Visual indicator for active signature
    - [x] Description: Update the extension icon (e.g., badge or color) to indicate when the auto-append signature module is active.
    
- [x] Logic: Restricted activation for WhatsApp
    - [x] Description: Ensure the signature feature and its UI elements are only enabled when the active tab is `web.whatsapp.com`.
