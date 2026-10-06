const fs = require('node:fs');
const path = require('node:path');

function writeRuntimeState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`);
}

function removeRuntimeState(filePath) {
  try { fs.unlinkSync(filePath); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function readRuntimeState(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

module.exports = { readRuntimeState, removeRuntimeState, writeRuntimeState };
