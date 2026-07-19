# Installing the VSIX

## Prerequisites

- Visual Studio Code 1.85+
- The `.vsix` file (see [release-checklist.md](./release-checklist.md) to build one)

## Install via VS Code GUI

1. Open VS Code
2. Open the Extensions view (`Ctrl+Shift+X`)
3. Click the `...` menu (top-right of Extensions panel)
4. Select **Install from VSIX...**
5. Navigate to the `.vsix` file and select it

## Install via CLI

```bash
code --install-extension dist-vsix/tcalc-0.1.2.vsix
```

## Verify

1. Open any workspace
2. Run the command **TCalc: Scan Workspace** from the Command Palette (`Ctrl+Shift+P`)
3. The dashboard should open with scan results

## Uninstall

```bash
code --uninstall-extension Sandesh13fr.tcalc
```

Or right-click the extension in the Extensions view and select **Uninstall**.
