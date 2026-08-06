# SpendWise – Expense Tracker

SpendWise is a clean, modern, and completely local-first expense tracking application designed with a beautiful EdTech aesthetics (inspired by Shikho.com).

## 🚀 Features

- **Dynamic Dashboard:** Visualize your money with donut and bar charts.
- **Offline First:** All data is strictly saved on your device (using `localStorage`). No server sign-ups required.
- **Progressive Web App (PWA):** Installable as a native app on Android, iOS, or Desktop without an App Store!
- **Zero-setup Auto Updates:** When installed, updates made to the remote code are automatically fetched and applied to your installed app.
- **Data Exporting:** Export summaries as JSON, CSV, or High-Res Images.
- **Currency Support:** Defaults to `Taka` but fully configurable.

## 📲 How to Install the App (Android / iOS)

You don't need Android Studio or the Play Store. SpendWise is a true **PWA (Progressive Web App)**, meaning it packages itself into an app directly from the browser!

1. Host this project on **GitHub Pages** (or any static hosting).
2. Open the URL in your phone's browser (Chrome or Safari).
3. The app will detect it's compatible.
4. Tap the **"📲 Install App"** button in the sidebar (or your browser will prompt you "Add to Home Screen").
5. Confim install! The app is now an icon on your homescreen, works exactly like a native app, and launches seamlessly without browser UI.

### 🔄 Auto-Updates

Anytime you push changes to your GitHub (`style.css` tweaks, new features in `app.js`), the installed app on your phone will download the update silently in the background and pop a toast notification letting you know the update is applied!

## 💻 Tech Stack

- Vanilla HTML / CSS / JS
- Canvas API for Charts
- html2canvas for Image Exports
- Service Workers & Web Manifest for Native App installation

## 👨‍💻 Local Development

Clone the project and open `index.html` in your browser. (Note: For the service worker to cache correctly locally, run it over a local server like Live Server).
