#!/usr/bin/env node

import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = process.env.DICE_BOX_VERSION || process.argv[2] || '1.0.5';
const REGISTRY =
  process.env.DICE_BOX_REGISTRY || process.argv[3] || 'https://registry.npmjs.org/';

const CLIENT_PUBLIC_DIR = path.join(__dirname, '..', 'client', 'public');
const TARGET_DIR = path.join(CLIENT_PUBLIC_DIR, 'assets', 'dice-box');

const ensureDir = async (dirPath) => {
  await mkdir(dirPath, { recursive: true });
};

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });

const copyDirectory = async (source, destination) => {
  await ensureDir(destination);
  const entries = await readdir(source, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(source, entry.name);
      const destinationPath = path.join(destination, entry.name);
      if (entry.isDirectory()) {
        await copyDirectory(sourcePath, destinationPath);
      } else if (entry.isFile()) {
        const data = await readFile(sourcePath);
        await ensureDir(path.dirname(destinationPath));
        await writeFile(destinationPath, data);
      }
    })
  );
};

const main = async () => {
  await ensureDir(CLIENT_PUBLIC_DIR);
  await rm(TARGET_DIR, { recursive: true, force: true });
  await ensureDir(TARGET_DIR);

  const tempRoot = await mkdtemp(path.join(tmpdir(), 'dice-box-'));
  const packArgs = [
    'pack',
    `@3d-dice/dice-box@${VERSION}`,
    '--registry',
    REGISTRY.replace(/\/$/, ''),
  ];

  console.info(`Downloading @3d-dice/dice-box@${VERSION} from ${REGISTRY}`);
  const tarballName = await runCommand('npm', packArgs, {
    cwd: tempRoot,
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: false,
  });

  const tarballPath = path.join(tempRoot, tarballName);
  const extractDir = path.join(tempRoot, 'package');
  await ensureDir(extractDir);

  console.info(`Extracting ${tarballName}`);
  await runCommand('tar', ['-xzf', tarballPath, '-C', extractDir, '--strip-components=1'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: false,
  });

  const distDir = path.join(extractDir, 'dist');
  try {
    await stat(distDir);
  } catch (error) {
    throw new Error(`dist directory not found inside ${tarballName}`);
  }

  console.info('Copying Dice Box distribution assets');
  await copyDirectory(path.join(distDir, 'assets'), path.join(TARGET_DIR, 'assets'));

  const bundleFiles = ['dice-box.esm.min.js', 'dice-box.umd.min.js', 'dice-box.min.js'];
  await Promise.all(
    bundleFiles.map(async (fileName) => {
      const sourcePath = path.join(distDir, fileName);
      const data = await readFile(sourcePath);
      await writeFile(path.join(TARGET_DIR, fileName), data);
    })
  );

  console.info(`Dice Box assets synced to ${TARGET_DIR}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
