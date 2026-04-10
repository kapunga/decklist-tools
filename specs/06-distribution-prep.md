# Distribution Prep: macOS Notarization & Windows Code Signing

## Goal

Enable direct distribution (not App Store) so users can install without going into Security Settings on macOS, and without persistent SmartScreen warnings on Windows.

---

## macOS: Notarization for Direct Distribution

### Prerequisites
- Apple Developer Program enrollment ($99/year)
- "Developer ID Application" certificate created and installed locally
- App-specific password generated for notarization API

### Step 1: Create entitlements file

Create `packages/electron-app/build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- Electron requires this for V8 JIT -->
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <!-- Needed for Electron's V8 engine -->
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <!-- Network access for Scryfall API -->
  <key>com.apple.security.network.client</key>
  <true/>
  <!-- File dialogs for import/export -->
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
</dict>
</plist>
```

### Step 2: Update electron-builder config

In `packages/electron-app/package.json`, update the `build.mac` section:

```json
"mac": {
  "category": "public.app-category.games",
  "target": [
    { "target": "dmg", "arch": ["universal"] }
  ],
  "hardenedRuntime": true,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist",
  "notarize": {
    "teamId": "YOUR_TEAM_ID"
  }
}
```

Key changes:
- `hardenedRuntime: true` — required for notarization
- `entitlements` / `entitlementsInherit` — declares what the app needs
- `notarize.teamId` — triggers automatic notarization during build
- `arch: ["universal"]` — produces a fat binary for both Apple Silicon and Intel

### Step 3: Set environment variables for build

```bash
export APPLE_ID="your-apple-id@apple.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

For CI, store these as secrets.

### Step 4: Build and verify

```bash
cd packages/electron-app
pnpm build  # electron-builder will sign + notarize automatically

# Verify signing
codesign --verify --deep --strict "dist/mac-universal/MTG Deckbuilder.app"

# Verify notarization
spctl --assess --type execute "dist/mac-universal/MTG Deckbuilder.app"
```

### MCP Config Writing

The app writes to `~/Library/Application Support/Claude/claude_desktop_config.json` for MCP integration. This works fine with notarized distribution (no sandbox). Would NOT work with App Store distribution, but that's not the goal.

---

## Windows: Code Signing for SmartScreen Trust

### Option A: EV Certificate (Recommended)
- **Immediate SmartScreen trust** — no reputation-building period
- Requires hardware token (USB) or cloud HSM
- Cost: ~$300-500/year from DigiCert, Sectigo, etc.
- Cannot be used in most CI without cloud HSM service (e.g., Azure SignTool, DigiCert KeyLocker)

### Option B: OV Certificate
- Cheaper (~$100-200/year)
- Requires building "reputation" — users will see SmartScreen warnings until enough installs accumulate
- Can be stored as a PFX file (easier CI integration)

### Step 1: Update electron-builder config

Add to `packages/electron-app/package.json`:

```json
"win": {
  "target": ["nsis"],
  "signingHashAlgorithms": ["sha256"],
  "sign": "./scripts/sign.js"
}
```

Note: If using an EV certificate with Azure SignTool or similar, a custom sign script is needed. For OV certificates stored as PFX:

```json
"win": {
  "target": ["nsis"],
  "signingHashAlgorithms": ["sha256"],
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": ""
}
```

### Step 2: Environment variables

```bash
# For OV certificate (PFX file)
export CSC_LINK="path/to/certificate.pfx"
export CSC_KEY_PASSWORD="certificate-password"

# For EV certificate (Azure SignTool)
export AZURE_KEY_VAULT_URI="https://your-vault.vault.azure.net"
export AZURE_CLIENT_ID="..."
export AZURE_TENANT_ID="..."
export AZURE_CLIENT_SECRET="..."
export AZURE_CERT_NAME="your-cert-name"
```

### Step 3: NSIS installer configuration

```json
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "deleteAppDataOnUninstall": false,
  "createDesktopShortcut": true,
  "installerIcon": "build/icon.ico",
  "uninstallerIcon": "build/icon.ico"
}
```

### Step 4: Build and verify

```bash
cd packages/electron-app
pnpm build  # electron-builder will sign automatically

# Verify with signtool (Windows SDK)
signtool verify /pa "dist/MTG Deckbuilder Setup.exe"
```

---

## Timeline Considerations

- macOS notarization can be set up and tested in a single session once the Developer ID certificate is ready
- Windows code signing requires purchasing a certificate (1-3 business days for OV validation, longer for EV)
- Universal macOS builds may need testing if any native dependencies are involved (currently none detected)
