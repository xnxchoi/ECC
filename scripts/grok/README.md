
Grok Build does not yet have a native ECC plugin target. `scripts/sync-ecc-to-grok.sh` is the copied-configuration path into `~/.grok`, parallel to the legacy Codex sync. It preserves existing Codex `source-command-*` skills in `~/.agents/skills`, copies missing native skills from repo `.agents/skills`, and installs slash commands into `~/.grok/commands` using the unprefixed command name unless a Grok builtin or a different preexisting skill already owns that name. Run Grok once first so `~/.grok/config.toml` exists, then:

```bash
git clone https://github.com/affaan-m/ECC.git
cd ECC
npm install
bash scripts/sync-ecc-to-grok.sh --dry-run
bash scripts/sync-ecc-to-grok.sh
```

`ecc auto-update` gates Grok copied-config overlays: it probes whether upstream now ships a grok install target or plugin, then perforated-restores the overlay, detaches it, or passes through. Check necessity with `node scripts/grok/check-grok-fixture.js`.

For repo navigation after that sync, read the [Grok ECC Navigation Map](docs/GROK-NAVIGATION-GUIDE.md).

| Grok Build | `bash scripts/sync-ecc-to-grok.sh` | Copied config into `~/.grok`; run Grok once first so `config.toml` exists |
