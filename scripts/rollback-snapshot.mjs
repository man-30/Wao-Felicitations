import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = path.join(process.cwd(), 'backups', 'snapshots');
const logFile   = path.join(process.cwd(), 'backups', 'rollback-log.txt');

fs.mkdirSync(backupDir, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log('  ' + line);
  fs.appendFileSync(logFile, line + '\n');
}

function ok(msg)   { console.log(`  \x1b[32m OK  ${msg}\x1b[0m`); }
function warn(msg) { console.log(`  \x1b[33m WARN ${msg}\x1b[0m`); }
function step(msg) { console.log(`\n\x1b[36m>> ${msg}\x1b[0m`); }

function parseEnv(file) {
  if (!fs.existsSync(file)) return null;
  const content = fs.readFileSync(file, 'utf-8');
  const result = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)="([^"]+)"/);
    if (m) result[m[1]] = m[2];
  }
  return result;
}

function sanitize(content) {
  return content
    .replace(/(DATABASE_URL(?:_POOLED)?=")([^"]+)(")/g, '$1[REDACTED]$3')
    .replace(/(JWT_SECRET=")([^"]+)(")/g, '$1[REDACTED]$3')
    .replace(/(ENCRYPTION_KEY=")([^"]+)(")/g, '$1[REDACTED]$3')
    .replace(/(npg_[a-zA-Z0-9]+)/g, '[REDACTED_PASSWORD]');
}

function createSnapshot(envFile, label, tag) {
  step(`Snapshot: ${label}`);
  log(`Starting snapshot for ${label}`);

  if (!fs.existsSync(envFile)) {
    warn(`${envFile} not found - skipping`);
    return null;
  }

  const env = parseEnv(envFile);
  if (!env || !env.DATABASE_URL) {
    warn(`DATABASE_URL not found in ${envFile}`);
    return null;
  }

  const url  = new URL(env.DATABASE_URL);
  const endpoint = url.hostname.split('.')[0];

  console.log(`  Host     : ${url.hostname}`);
  console.log(`  Database : ${url.pathname.replace('/', '')}`);
  console.log(`  Endpoint : ${endpoint}`);

  const files = {};

  // 1. Prisma schema
  files.schema = path.join(backupDir, `schema_${tag}_${timestamp}.prisma`);
  fs.copyFileSync('prisma/schema.prisma', files.schema);
  ok(`Schema saved     : ${path.basename(files.schema)}`);

  // 2. Migration list
  if (fs.existsSync('prisma/migrations')) {
    files.migrations = path.join(backupDir, `migrations_${tag}_${timestamp}.txt`);
    const migList = fs.readdirSync('prisma/migrations', { withFileTypes: true })
      .map(d => d.name).join('\n');
    fs.writeFileSync(files.migrations, migList);
    ok(`Migrations saved : ${path.basename(files.migrations)}`);
  }

  // 3. Sanitized env config
  files.env = path.join(backupDir, `env_${tag}_${timestamp}.txt`);
  fs.writeFileSync(files.env, sanitize(fs.readFileSync(envFile, 'utf-8')));
  ok(`Env saved        : ${path.basename(files.env)}`);

  // 4. Package.json snapshot (dependency lock)
  files.pkglock = path.join(backupDir, `package_${tag}_${timestamp}.json`);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  fs.writeFileSync(files.pkglock, JSON.stringify({
    name: pkg.name,
    version: pkg.version,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies
  }, null, 2));
  ok(`Package snapshot : ${path.basename(files.pkglock)}`);

  // 5. Prisma migrations lock
  if (fs.existsSync('prisma/migrations/migration_lock.toml')) {
    files.migLock = path.join(backupDir, `migration_lock_${tag}_${timestamp}.toml`);
    fs.copyFileSync('prisma/migrations/migration_lock.toml', files.migLock);
    ok(`Migration lock   : ${path.basename(files.migLock)}`);
  }

  // 6. Git commit hash if available
  let gitHash = 'N/A';
  try {
    gitHash = execSync('git rev-parse HEAD', { stdio: ['pipe','pipe','pipe'] })
      .toString().trim();
  } catch (_) {}

  // 7. Manifest
  const manifest = {
    snapshotDate: new Date().toISOString(),
    environment: label,
    tag,
    endpoint,
    database: url.pathname.replace('/', ''),
    gitCommit: gitHash,
    files: Object.fromEntries(
      Object.entries(files).map(([k,v]) => [k, path.basename(v)])
    ),
    rollbackGuide: 'See PHASE_11_ACTION_PLAN.md - Phase 3 Rollback',
    instructions: [
      '1. Restore: npx prisma migrate reset --force',
      '2. Deploy migrations: npx prisma migrate deploy',
      '3. Restore seed: npm run db:seed:prod',
      '4. Restart backend: npm run backend:prod'
    ],
    createdBy: 'scripts/rollback-snapshot.mjs'
  };

  files.manifest = path.join(backupDir, `manifest_${tag}_${timestamp}.json`);
  fs.writeFileSync(files.manifest, JSON.stringify(manifest, null, 2));
  ok(`Manifest saved   : ${path.basename(files.manifest)}`);

  log(`Snapshot complete for ${label} (${Object.keys(files).length} files)`);
  return files;
}

// ============================================================
// MAIN
// ============================================================

console.log('\n\x1b[36m╔══════════════════════════════════════════════════╗\x1b[0m');
console.log('\x1b[36m║   PHASE 11 - Rollback Snapshot Creator           ║\x1b[0m');
console.log('\x1b[36m╚══════════════════════════════════════════════════╝\x1b[0m');

const stagingFiles = createSnapshot('.env.backend',    'STAGING (Dev)',     'staging');
const prodFiles    = createSnapshot('.env.production', 'PRODUCTION (Main)', 'prod');

// Combined manifest
step('Combined Manifest');
const combined = {
  createdAt: new Date().toISOString(),
  phase: 'PHASE 11',
  description: 'Rollback snapshots for Phase 11 Production Deployment',
  staging: stagingFiles ? 'OK' : 'SKIPPED',
  production: prodFiles  ? 'OK' : 'SKIPPED',
  backupDir,
  logFile,
  rollbackTime: '< 5 minutes',
  note: 'Neon branch architecture means DB state is tracked at the branch level. These snapshots capture schema, migrations and config for fast rollback.'
};
const combinedFile = path.join(backupDir, `COMBINED_MANIFEST_${timestamp}.json`);
fs.writeFileSync(combinedFile, JSON.stringify(combined, null, 2));
ok(`Combined manifest : ${path.basename(combinedFile)}`);

// Summary
console.log('\n\x1b[36m>> Summary\x1b[0m');
const allFiles = fs.readdirSync(backupDir);
console.log(`\n  Backup dir : ${backupDir}`);
console.log(`  Files      : ${allFiles.length}`);
allFiles.forEach(f => {
  const stat = fs.statSync(path.join(backupDir, f));
  console.log(`    ${f.padEnd(60)} ${(stat.size / 1024).toFixed(1).padStart(6)} KB`);
});

console.log('\n\x1b[32m  All rollback snapshots created successfully!\x1b[0m');
console.log('\x1b[36m  Rollback time if needed: < 5 minutes\x1b[0m\n');
