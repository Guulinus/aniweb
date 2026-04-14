# AniRoll Tizen App

## Overview
This is a wrapper app that displays the AniRoll web app in a Samsung Smart TV webview.

## Files
- `index.html` - Main entry point with webview
- `tizen-manifest.xml` - Tizen app manifest

## Setup

### 1. Create Tizen Project in Tizen Studio
1. Open Tizen Studio
2. File → New → Tizen Project
3. Select **Native Application** → **Basic** template
4. Choose **Samsung TV** as the profile
5. Name it "AniRoll"

### 2. Replace Files
Copy these files into your Tizen project:
- Replace `index.html` in the project's `temp/` or `web/` folder
- Replace `tizen-manifest.xml` in the project's root

### 3. Configure IP Address
In `index.html`, change this line to your Pi's IP:
```javascript
const WEBVIEW_URL = 'http://192.168.178.84:3000';
```

### 4. Build & Run
1. In Tizen Studio, right-click project → Build
2. Right-click → Run → Tizen Emulator or your TV

## Troubleshooting

### TV not connecting to Pi
- Make sure TV and Pi are on the same network
- Use your Pi's local IP (192.168.x.x), not localhost
- Ensure the Pi allows external connections: `HOST=0.0.0.0`

### Webview not loading
- Check that the web app is running on Pi
- Try accessing the URL directly from TV browser first

### Remote key control
The web app should work with TV remote. If not, you may need to add key event handlers in `main.js` to support remote navigation.