# Multi-Device Setup & Upstream Sync Guide

This guide explains how this customized ECC fork is structured and how to replicate the entire environment on multiple devices (Mac, Linux, Windows) running **Antigravity**, **Codex**, **JetBrains IDEs**, or **Grok Build**.

---

## 1. Repository Architecture

This fork maintains a clean separation between upstream ECC developments and personal custom integrations:

```
affaan-m/ECC (upstream)
         │
         ▼  (git pull / fetch)
xnxchoi/ECC:main (pristine mirror of upstream)
         │
         ▼  (git merge main)
xnxchoi/ECC:custom (default working branch: Grok Build, device scripts, personal workflows)
```

* **`upstream`**: `https://github.com/affaan-m/ECC.git` (Official open-source repo)
* **`origin`**: `https://github.com/xnxchoi/ECC.git` (Personal GitHub fork)
* **`main`**: Pure mirror of upstream. Never commit custom work here.
* **`custom`**: Active customization branch containing:
  - Full Grok Build integration (`.grok/`, `scripts/grok/`, navigation guide, and test suite).
  - Dynamic device setup automation (`scripts/setup-device.js`).
  - Helper commands (`npm run setup:device`, `npm run sync:upstream`).

---

## 2. Onboarding a New Device

On any new or existing machine (older Macs, laptops, workstations):

### Step 1: Clone the Custom Branch
```bash
git clone -b custom https://github.com/xnxchoi/ECC.git
cd ECC
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Dynamic Setup
```bash
npm run setup:device
```

### What `npm run setup:device` Does Automatically:
1. **Dynamic Path Configuration**: Detects `$HOME` and current repo path on that specific machine—never hardcoding user paths.
2. **Antigravity Setup**:
   - Updates `~/.gemini/config/skills.json` to point directly to `<repo>/skills` with the recommended skill set.
   - Configures `~/.gemini/config/mcp_config.json` with the local `ecc-memory` MCP server.
   - Links rules and skills into `~/.gemini/config/plugins/ecc`.
3. **Codex CLI Setup**:
   - Ensures `~/.codex/config.toml` exists with recommended MCP servers (`github`, `context7`, `exa`, `memory`, `playwright`, `sequential-thinking`).
4. **Git Remote Check**:
   - Ensures `origin` points to `xnxchoi/ECC` and `upstream` points to `affaan-m/ECC`.

---

## 3. Pulling Upstream Updates (Zero Shelving)

You **never need to shelve, stash, or lose local changes**. Because custom work is committed to `custom`, syncing upstream is a single command:

```bash
npm run sync:upstream
```

Or manually:
```bash
git checkout main
git pull upstream main
git push origin main

git checkout custom
git merge main
git push origin custom
```

Because custom files (`.grok/`, `scripts/grok/`, `scripts/setup-device.js`) reside in isolated paths, Git automatically merges upstream updates cleanly without conflicts.

---

## 4. Instructions for Assisting AI Agents

When an AI agent (Antigravity, Claude Code, Codex, Grok) assists you on any machine:
1. Always work on the `custom` branch (or topic branches off `custom`).
2. Never push directly to `upstream` (`affaan-m/ECC`). All pushes go to `origin` (`xnxchoi/ECC`).
3. To sync upstream changes, run `npm run sync:upstream`.
4. If repo paths change or the environment moves, run `npm run setup:device` to re-align global agent configs.
