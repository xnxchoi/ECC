#!/usr/bin/env node
'use strict';

/**
 * Cross-platform device bootstrap script for ECC.
 *
 * Configures the current machine for:
 *   - Antigravity (~/.gemini/config/skills.json & mcp_config.json with dynamic repo paths)
 *   - Antigravity ECC plugin (~/.gemini/config/plugins/ecc)
 *   - Codex (~/.codex/config.toml & MCP servers)
 *   - Git remotes (origin -> personal fork, upstream -> affaan-m/ECC)
 *
 * Usage:
 *   node scripts/setup-device.js [--dry-run] [--repo-root <path>] [--home-dir <path>]
 *   npm run setup:device
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_CURATED_SKILLS = [
  '^agent-introspection-debugging$',
  '^agent-sort$',
  '^api-design$',
  '^architecture-decision-records$',
  '^backend-patterns$',
  '^codebase-onboarding$',
  '^coding-standards$',
  '^deep-research$',
  '^documentation-lookup$',
  '^e2e-testing$',
  '^ecc-guide$',
  '^eval-harness$',
  '^exa-search$',
  '^frontend-patterns$',
  '^git-workflow$',
  '^mcp-server-patterns$',
  '^plan-canvas$',
  '^product-capability$',
  '^repo-scan$',
  '^security-review$',
  '^strategic-compact$',
  '^tdd-workflow$',
  '^unified-memory$',
  '^verification-loop$'
];

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    repoRoot: path.resolve(__dirname, '..'),
    homeDir: os.homedir(),
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--repo-root' && argv[i + 1]) {
      options.repoRoot = path.resolve(argv[++i]);
    } else if (arg === '--home-dir' && argv[i + 1]) {
      options.homeDir = path.resolve(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
ECC Device Setup Helper

Configures the current machine dynamically so Antigravity, Codex, and Git work
seamlessly without hardcoded user-specific paths.

Usage:
  node scripts/setup-device.js [options]

Options:
  --dry-run            Report planned changes without modifying any files
  --repo-root <path>   Explicit ECC repository root (default: parent directory)
  --home-dir <path>    Explicit user home directory (default: $HOME)
  --help, -h           Show this help message
`);
}

function atomicWriteJson(filePath, data, dryRun = false) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  if (fs.existsSync(filePath)) {
    try {
      const existing = fs.readFileSync(filePath, 'utf8');
      if (existing === content) {
        console.log(`✓ Already up-to-date: ${filePath}`);
        return;
      }
    } catch {
      // Proceed to write if read fails
    }
  }

  if (dryRun) {
    console.log(`[dry-run] Would write ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${Date.now()}`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function setupAntigravityConfig(repoRoot, homeDir, dryRun = false) {
  const configDir = path.join(homeDir, '.gemini', 'config');
  const skillsJsonPath = path.join(configDir, 'skills.json');
  const mcpConfigJsonPath = path.join(configDir, 'mcp_config.json');
  const pluginDir = path.join(configDir, 'plugins', 'ecc');

  console.log(`\n--- Configuring Antigravity (~/.gemini/config) ---`);

  // 1. skills.json
  let skillsData = { entries: [] };
  if (fs.existsSync(skillsJsonPath)) {
    try {
      skillsData = JSON.parse(fs.readFileSync(skillsJsonPath, 'utf8'));
      if (!Array.isArray(skillsData.entries)) skillsData.entries = [];
    } catch {
      skillsData = { entries: [] };
    }
  }

  const skillsDirPath = path.join(repoRoot, 'skills');
  const existingEntryIndex = skillsData.entries.findIndex(e => (
    typeof e.path === 'string' && (e.path.endsWith('/skills') || e.path === skillsDirPath)
  ));

  if (existingEntryIndex >= 0) {
    const existing = skillsData.entries[existingEntryIndex];
    skillsData.entries[existingEntryIndex] = {
      path: skillsDirPath,
      include_only: existing.include_only || DEFAULT_CURATED_SKILLS
    };
    console.log(`✓ Updated skills.json path: ${skillsDirPath}`);
  } else {
    skillsData.entries.push({
      path: skillsDirPath,
      include_only: DEFAULT_CURATED_SKILLS
    });
    console.log(`✓ Added skills.json path: ${skillsDirPath}`);
  }
  atomicWriteJson(skillsJsonPath, skillsData, dryRun);

  // 2. mcp_config.json
  let mcpData = { mcpServers: {} };
  if (fs.existsSync(mcpConfigJsonPath)) {
    try {
      mcpData = JSON.parse(fs.readFileSync(mcpConfigJsonPath, 'utf8'));
      if (!mcpData.mcpServers || typeof mcpData.mcpServers !== 'object') {
        mcpData.mcpServers = {};
      }
    } catch {
      mcpData = { mcpServers: {} };
    }
  }

  const memoryScriptPath = path.join(repoRoot, 'scripts', 'memory-mcp.mjs');
  mcpData.mcpServers['ecc-memory'] = {
    command: 'node',
    args: [memoryScriptPath],
    env: {
      ECC_MEMORY_HARNESS: 'antigravity'
    }
  };
  console.log(`✓ Configured ecc-memory MCP server: ${memoryScriptPath}`);
  atomicWriteJson(mcpConfigJsonPath, mcpData, dryRun);

  // 3. plugins/ecc
  if (dryRun) {
    console.log(`[dry-run] Would configure plugin at ${pluginDir}`);
  } else {
    fs.mkdirSync(pluginDir, { recursive: true });
    const pluginJsonPath = path.join(pluginDir, 'plugin.json');
    if (!fs.existsSync(pluginJsonPath)) {
      fs.writeFileSync(pluginJsonPath, JSON.stringify({ name: 'ecc' }, null, 2) + '\n');
    }

    // Link or copy rules and skills if not already present
    for (const sub of ['rules', 'skills']) {
      const targetSub = path.join(pluginDir, sub);
      const sourceSub = path.join(repoRoot, sub);
      if (!fs.existsSync(targetSub)) {
        try {
          fs.symlinkSync(sourceSub, targetSub, 'junction');
          console.log(`✓ Linked plugin ${sub} -> ${sourceSub}`);
        } catch {
          console.log(`✓ Preserved plugin ${sub} at ${targetSub}`);
        }
      }
    }
  }
}

function setupCodexConfig(repoRoot, homeDir, dryRun = false) {
  const codexDir = path.join(homeDir, '.codex');
  const userConfigPath = path.join(codexDir, 'config.toml');
  const sourceTemplatePath = path.join(repoRoot, '.codex', 'config.toml');

  console.log(`\n--- Configuring Codex (~/.codex) ---`);

  if (!fs.existsSync(sourceTemplatePath)) {
    console.log(`! No reference .codex/config.toml found at ${sourceTemplatePath}`);
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] Would inspect/configure ${userConfigPath}`);
    return;
  }

  fs.mkdirSync(codexDir, { recursive: true });
  if (!fs.existsSync(userConfigPath)) {
    fs.copyFileSync(sourceTemplatePath, userConfigPath);
    console.log(`✓ Initialized ~/.codex/config.toml from template`);
  } else {
    const mergeScript = path.join(repoRoot, 'scripts', 'codex', 'merge-mcp-config.js');
    if (fs.existsSync(mergeScript)) {
      try {
        execFileSync(process.execPath, [mergeScript, userConfigPath], { stdio: 'inherit' });
        console.log(`✓ Merged ECC recommended MCP servers into ~/.codex/config.toml`);
      } catch (err) {
        console.warn(`! Note: Could not auto-merge Codex MCP config: ${err.message}`);
      }
    }
  }
}

function verifyGitRemotes(repoRoot, dryRun = false) {
  console.log(`\n--- Checking Git Remotes ---`);
  try {
    const gitEnv = { ...process.env };
    if (!gitEnv.GIT_CONFIG_GLOBAL) {
      try {
        fs.accessSync(path.join(os.homedir(), '.gitconfig'), fs.constants.R_OK);
      } catch {
        gitEnv.GIT_CONFIG_GLOBAL = '/dev/null';
      }
    }

    const remotesOutput = execFileSync('git', ['remote', '-v'], {
      cwd: repoRoot,
      env: gitEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const lines = remotesOutput.split('\n').filter(Boolean);
    const originLine = lines.find(l => l.startsWith('origin\t'));
    const upstreamLine = lines.find(l => l.startsWith('upstream\t'));

    if (originLine) {
      console.log(`✓ origin: ${originLine.split(/\s+/)[1]}`);
    } else {
      console.warn(`! Warning: 'origin' remote is not set`);
    }

    if (upstreamLine) {
      console.log(`✓ upstream: ${upstreamLine.split(/\s+/)[1]}`);
    } else {
      console.log(`- Tip: Add upstream with: git remote add upstream https://github.com/affaan-m/ECC.git`);
    }
  } catch {
    console.log(`- Not inside a git repository or git command unavailable`);
  }
}

function main() {
  const options = parseArgs();
  if (options.help) {
    showHelp();
    return;
  }

  console.log(`===============================================`);
  console.log(`       ECC Device Environment Bootstrap        `);
  console.log(`===============================================`);
  console.log(`Repository root : ${options.repoRoot}`);
  console.log(`Home directory  : ${options.homeDir}`);
  if (options.dryRun) console.log(`Mode            : DRY RUN`);

  setupAntigravityConfig(options.repoRoot, options.homeDir, options.dryRun);
  setupCodexConfig(options.repoRoot, options.homeDir, options.dryRun);
  verifyGitRemotes(options.repoRoot, options.dryRun);

  console.log(`\n===============================================`);
  console.log(`✓ Device setup complete!`);
  console.log(`  To keep ECC up-to-date with upstream:`);
  console.log(`  npm run sync:upstream`);
  console.log(`===============================================\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_CURATED_SKILLS,
  parseArgs,
  setupAntigravityConfig,
  setupCodexConfig,
  verifyGitRemotes
};
