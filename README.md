# OneFlip

> One at a time, always the right one.

Chrome extension to manage your browser extensions with groups and one-click toggling.

## Features

- **Group extensions** — Organize extensions into named, color-coded groups
- **Radio mode** — Enable one extension at a time within a group (the others auto-disable)
- **Free mode** — Toggle extensions independently within a group
- **Auto-match** — Assign extensions to groups automatically with regex patterns
- **Reload unpacked** — Quick-reload unpacked extensions from the popup
- **Drag & drop** — Assign extensions to groups by dragging them in settings
- **Badges** — Visual indicators for unpacked, dev, and store extensions

## Install

1. Clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder

## Usage

- Click the OneFlip icon in the toolbar to open the popup
- Toggle extensions on/off — in radio groups, enabling one disables the others
- Click the gear icon to open settings and manage groups
- Create groups with optional regex patterns to auto-match extensions by name

## Project Structure

```
├── manifest.json          # Extension manifest (MV3)
├── background/
│   └── service-worker.js  # Auto-assigns extensions on install
├── src/
│   ├── extensions.js      # Chrome management API wrapper
│   └── groups.js          # Group CRUD + storage
├── popup/
│   ├── index.html         # Popup UI
│   ├── app.js             # Popup logic
│   └── style.css          # Popup styles
├── settings/
│   ├── index.html         # Settings page
│   ├── app.js             # Settings logic
│   └── style.css          # Settings styles
└── assets/                # Extension icons
```

## License

MIT
