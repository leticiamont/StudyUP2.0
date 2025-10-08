// electron.mjs
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = os.platform() === 'win32';

// Caminho para o executável do Electron
let electronPath = path.join(
  __dirname,
  'node_modules',
  '.bin',
  isWindows ? 'electron.cmd' : 'electron'
);

// Adiciona aspas se o caminho tiver espaços (corrige erro no Windows)
if (isWindows && electronPath.includes(' ')) {
  electronPath = `"${electronPath}"`;
}

// Caminho do arquivo principal
const mainPath = path.join(__dirname, 'main.js');

// Executa o Electron
const child = spawn(electronPath, [mainPath], {
  stdio: 'inherit',
  shell: true,
});

// Trata erros
child.on('error', (err) => {
  console.error('Erro ao iniciar o Electron:', err);
});
