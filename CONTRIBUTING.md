# Contributing to Utility Hub

First off, thanks for taking the time to contribute! 🎉

Utility Hub is an open-source project that aims to be the best collection of productivity utilities for Chrome. We value your input, whether it's submitting a bug report, proposing a new feature, or writing code.

## How Can I Contribute?

### 🐛 Reporting Bugs
This section guides you through submitting a bug report.
- **Use a clear and descriptive title.**
- **Describe the steps to reproduce the issue** in as much detail as possible.
- **Include screenshots** if the issue is visual.
- **Check the console** (Right-click popup -> Inspect) for any error messages.

### 💡 Suggesting Enhancements
Have an idea for a new utility module?
- **Explain the problem** you want to solve.
- **Describe your solution** and how it fits into Utility Hub.
- **Mockups are helpful** if it involves UI changes.

### 💻 Pull Requests
1. **Fork the repo** and create your branch from `main`.
   ```bash
   git checkout -b feature/my-new-utility
   ```
2. **Code Style**: Try to keep your code clean and consistent with the existing project structure.
3. **Modules**: If adding a new utility, please create a new folder under `utility-hub/modules/` to keep things organized.
4. **Test your changes**: Ensure your new feature works and doesn't break existing ones.
5. **Update Documentation**: If you added a feature, please update the README to list it.
6. **Submit that PR!** We will review it as soon as possible.

## Project Structure

- `manifest.json`: The configuration file for the extension.
- `background.js`: The service worker that handles alarms and background tasks.
- `popup.html` / `popup.js`: The main user interface.
- `modules/`: Contains separate folders for each utility (e.g., `auto-reload`, `keep-alive`).

## License
By contributing, you agree that your contributions will be licensed under its MIT License.
