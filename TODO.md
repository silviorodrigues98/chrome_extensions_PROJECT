- [x] Fix: Sound trigger in keep-alive mode
    - [x] Issue: Audio does not play when triggered automatically, only on direct user interaction.
    - [x] Potential Cause: Browser autoplay policies blocking non-user-initiated audio.
    - [x] Solution: Ensure the `AudioContext` is initialized or resumed during the initial user "activate" click and stored for subsequent use by the keep-alive trigger.

- [x] Feature: Context-aware extension popup
    - [x] Description: Automatically open the active feature's window (e.g., Auto Reload) instead of the home screen when the extension is clicked.
    - [x] Implementation: Track the active feature state and update the extension's default popup or redirect on load.

- [ ] Feature: Mutually exclusive feature modules
    - [ ] Description: Ensure that only one feature module can be active at a time to prevent conflicts.
    - [ ] Implementation: Update the state management logic to automatically deactivate the current feature when a new one is enabled.



