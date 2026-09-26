'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEFAULT_CURATED_SKILLS,
  parseArgs,
  setupAntigravityConfig,
  setupCodexConfig,
  verifyGitRemotes
} = require('../../scripts/setup-device');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('parseArgs parses default and custom arguments', () => {
  const defaults = parseArgs([]);
  assert.strictEqual(defaults.dryRun, false);
  assert.strictEqual(typeof defaults.repoRoot, 'string');
  assert.strictEqual(typeof defaults.homeDir, 'string');

  const custom = parseArgs(['--dry-run', '--repo-root', '/test/repo', '--home-dir', '/test/home']);
  assert.strictEqual(custom.dryRun, true);
  assert.strictEqual(custom.repoRoot, path.resolve('/test/repo'));
  assert.strictEqual(custom.homeDir, path.resolve('/test/home'));
});

test('setupAntigravityConfig initializes and updates skills.json and mcp_config.json', () => {
  const tempHome = createTempDir('ecc-test-home-');
  const tempRepo = createTempDir('ecc-test-repo-');
  fs.mkdirSync(path.join(tempRepo, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(tempRepo, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(tempRepo, 'scripts', 'memory-mcp.mjs'), '// memory mcp\n');

  try {
    // 1. Initial setup
    setupAntigravityConfig(tempRepo, tempHome, false);

    const skillsJsonPath = path.join(tempHome, '.gemini', 'config', 'skills.json');
    const mcpConfigJsonPath = path.join(tempHome, '.gemini', 'config', 'mcp_config.json');

    assert.ok(fs.existsSync(skillsJsonPath), 'skills.json should be created');
    assert.ok(fs.existsSync(mcpConfigJsonPath), 'mcp_config.json should be created');

    const skillsData = JSON.parse(fs.readFileSync(skillsJsonPath, 'utf8'));
    assert.strictEqual(skillsData.entries.length, 1);
    assert.strictEqual(skillsData.entries[0].path, path.join(tempRepo, 'skills'));
    assert.deepStrictEqual(skillsData.entries[0].include_only, DEFAULT_CURATED_SKILLS);

    const mcpData = JSON.parse(fs.readFileSync(mcpConfigJsonPath, 'utf8'));
    assert.ok(mcpData.mcpServers['ecc-memory']);
    assert.strictEqual(
      mcpData.mcpServers['ecc-memory'].args[0],
      path.join(tempRepo, 'scripts', 'memory-mcp.mjs')
    );

    // 2. Re-running is idempotent and updates path if repo moved
    const movedRepo = createTempDir('ecc-test-repo-moved-');
    fs.mkdirSync(path.join(movedRepo, 'skills'), { recursive: true });
    setupAntigravityConfig(movedRepo, tempHome, false);

    const updatedSkillsData = JSON.parse(fs.readFileSync(skillsJsonPath, 'utf8'));
    assert.strictEqual(updatedSkillsData.entries.length, 1);
    assert.strictEqual(updatedSkillsData.entries[0].path, path.join(movedRepo, 'skills'));

    fs.rmSync(movedRepo, { recursive: true, force: true });
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('setupCodexConfig creates config.toml from repo template', () => {
  const tempHome = createTempDir('ecc-test-codex-home-');
  const tempRepo = createTempDir('ecc-test-codex-repo-');
  fs.mkdirSync(path.join(tempRepo, '.codex'), { recursive: true });
  fs.writeFileSync(
    path.join(tempRepo, '.codex', 'config.toml'),
    'approval_policy = "on-request"\n'
  );

  try {
    setupCodexConfig(tempRepo, tempHome, false);

    const userConfigPath = path.join(tempHome, '.codex', 'config.toml');
    assert.ok(fs.existsSync(userConfigPath), 'user config.toml should be created');
    assert.strictEqual(
      fs.readFileSync(userConfigPath, 'utf8'),
      'approval_policy = "on-request"\n'
    );
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});
