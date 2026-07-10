const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const esbuild = require('esbuild');

function getWorkspaceRoot() {
  return path.resolve(__dirname, '..');
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getClientEnv() {
  const workspaceRoot = getWorkspaceRoot();
  const envFileValues = parseEnvFile(path.join(workspaceRoot, '.env'));
  return {
    VITE_GOOGLE_MAPS_API_KEY:
      process.env.VITE_GOOGLE_MAPS_API_KEY ??
      envFileValues.VITE_GOOGLE_MAPS_API_KEY ??
      '',
  };
}

function buildDefineOptions() {
  const env = getClientEnv();
  return {
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(
      env.VITE_GOOGLE_MAPS_API_KEY,
    ),
  };
}

function hasGeneratedDashboardAssets() {
  const workspaceRoot = getWorkspaceRoot();
  return fs.existsSync(
    path.join(workspaceRoot, 'public', 'generated', 'gmcDashboardInit.js'),
  );
}

function runDashboardExtraction() {
  const pythonCommands = [
    ['python3', ['scripts/extract_gmc_dashboard.py']],
    ['py', ['-3', 'scripts/extract_gmc_dashboard.py']],
    ['py', ['scripts/extract_gmc_dashboard.py']],
    ['python', ['scripts/extract_gmc_dashboard.py']],
  ];

  let lastFailure = null;

  for (const [command, args] of pythonCommands) {
    const result = spawnSync(command, args, {
      cwd: getWorkspaceRoot(),
      stdio: 'inherit',
    });

    if (!result.error && result.status === 0) {
      return;
    }

    if (result.error && result.error.code === 'ENOENT') {
      continue;
    }

    lastFailure = result;
  }

  if (hasGeneratedDashboardAssets()) {
    console.warn(
      'Python is unavailable, so the dashboard is using the existing generated assets in public/generated.',
    );
    return;
  }

  if (lastFailure?.error) {
    console.error(lastFailure.error);
  }

  if (lastFailure?.status !== undefined && lastFailure.status !== null) {
    process.exit(lastFailure.status);
  }

  process.exit(1);
}

async function resetDir(dirPath) {
  await fsp.rm(dirPath, { recursive: true, force: true });
  await fsp.mkdir(dirPath, { recursive: true });
}

async function copyDir(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  await fsp.cp(sourceDir, targetDir, { recursive: true });
}

async function writeHtmlShell(outputDir) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GMC Dashboard</title>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>
`;

  await fsp.writeFile(path.join(outputDir, 'index.html'), html, 'utf8');
}

async function prepareOutputDir(outputDir) {
  const workspaceRoot = getWorkspaceRoot();
  await resetDir(outputDir);
  await copyDir(path.join(workspaceRoot, 'public'), outputDir);
  await writeHtmlShell(outputDir);
}

function getEsbuildConfig(outputDir) {
  return {
    absWorkingDir: getWorkspaceRoot(),
    entryPoints: [path.join(getWorkspaceRoot(), 'src', 'main.jsx')],
    bundle: true,
    format: 'esm',
    sourcemap: true,
    outfile: path.join(outputDir, 'app.js'),
    define: buildDefineOptions(),
    logLevel: 'info',
  };
}

async function runEsbuildOnce(outputDir) {
  await esbuild.build(getEsbuildConfig(outputDir));
}

async function startEsbuildWatch(outputDir) {
  const context = await esbuild.context(getEsbuildConfig(outputDir));
  await context.watch();

  return {
    killed: false,
    kill() {
      if (this.killed) {
        return;
      }

      this.killed = true;
      context.dispose().catch((error) => {
        console.error(error);
      });
    },
  };
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function startStaticServer(outputDir, port) {
  const server = http.createServer(async (req, res) => {
    try {
      const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
      const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(outputDir, normalizedPath);

      if (!filePath.startsWith(outputDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath)) {
        // Only fall back to index.html for non-API requests
        if (requestPath.endsWith('.json') || requestPath.endsWith('.geojson')) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'File not found: ' + requestPath }));
          return;
        }
        filePath = path.join(outputDir, 'index.html');
      }

      const data = await fsp.readFile(filePath);
      res.writeHead(200, { 'Content-Type': getContentType(filePath) });
      res.end(data);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Dashboard running at http://127.0.0.1:${port}`);
  });

  return server;
}

module.exports = {
  getWorkspaceRoot,
  prepareOutputDir,
  runDashboardExtraction,
  runEsbuildOnce,
  startEsbuildWatch,
  startStaticServer,
};
