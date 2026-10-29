'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 去掉 [$n] 与 {…}，用于补全过滤 */
function stripPlaceholders(code) {
  return code
    .replace(/\[\$\d+\]/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 把代码里的 [$n] / {a:b,c:d} 转成 VS Code snippet 语法 */
function codeToSnippet(code) {
  let maxN = 0;
  const re = /\[\$(\d+)\]/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  let nextChoice = maxN + 1;

  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '[') {
      const mm = code.slice(i).match(/^\[\$(\d+)\]/);
      if (mm) {
        out += '${' + mm[1] + '}';
        i += mm[0].length;
        continue;
      }
    }
    if (ch === '{') {
      const close = code.indexOf('}', i);
      if (close !== -1) {
        const inner = code.slice(i + 1, close);
        const keys = inner
          .split(',')
          .map(p => p.split(':')[0].trim())
          .filter(Boolean);
        out += '${' + nextChoice + '|' + keys.join(',') + '|}';
        nextChoice += 1;
        i = close + 1;
        continue;
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** 把代码转成整行匹配正则；[$n] 变成捕获组，返回占位序号顺序 */
function codeToLineRegex(code) {
  let pattern = '';
  let i = 0;
  const placeholders = [];
  while (i < code.length) {
    const ch = code[i];
    if (ch === '[') {
      const mm = code.slice(i).match(/^\[\$(\d+)\]/);
      if (mm) {
        placeholders.push(parseInt(mm[1], 10));
        pattern += '([^\\s]+)';
        i += mm[0].length;
        continue;
      }
    }
    if (ch === '{') {
      const close = code.indexOf('}', i);
      if (close !== -1) {
        const inner = code.slice(i + 1, close);
        const keys = inner
          .split(',')
          .map(p => p.split(':')[0].trim())
          .filter(Boolean);
        pattern += '(?:' + keys.map(escapeRegExp).join('|') + ')';
        i = close + 1;
        continue;
      }
    }
    pattern += escapeRegExp(ch);
    i += 1;
  }
  return { regex: new RegExp('^\\s*' + pattern + '\\s*$'), placeholders };
}

/**
 * 解析 txt 内容：单数行(1,3,5…)为代码，双数行(2,4,6…)为文本。
 * 每两条组成一条注释条目。
 */
function parseEntries(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = (lines[i] || '').trim();
    const text = (lines[i + 1] || '').trim();
    if (!code && !text) continue;
    const lineRegex = codeToLineRegex(code);
    entries.push({
      code,
      text,
      filterText: stripPlaceholders(code),
      snippet: codeToSnippet(code),
      lineRegex,
      isPlain: !/\[\$\d+\]|\{/.test(code),
    });
  }
  return entries;
}

class WstDataStore {
  constructor() {
    this.data = new Map();
    this.total = 0;
    this.foundFolder = false;
  }

  get(language) {
    return this.data.get(String(language || '').toLowerCase()) || [];
  }

  languages() {
    return Array.from(this.data.keys());
  }

  count() {
    return this.total;
  }

  /** 扫描工作区根目录下的 .WST 文件夹，读取所有 txt */
  async load() {
    const next = new Map();
    let total = 0;
    let found = false;
    const folders = vscode.workspace.workspaceFolders || [];

    for (const folder of folders) {
      const wstDir = path.join(folder.uri.fsPath, '.WST');
      let stat;
      try {
        stat = fs.statSync(wstDir);
      } catch (err) {
        continue;
      }
      if (!stat.isDirectory()) continue;
      found = true;

      let files = [];
      try {
        files = fs.readdirSync(wstDir).filter(f => f.toLowerCase().endsWith('.txt'));
      } catch (err) {
        continue;
      }

      for (const file of files) {
        // 文件名（不含扩展名）即语言 ID，如 css.txt -> css, csharp.txt -> csharp
        const lang = path.basename(file, path.extname(file)).toLowerCase();
        const fullPath = path.join(wstDir, file);
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const entries = parseEntries(content);
          const existing = next.get(lang) || [];
          next.set(lang, existing.concat(entries));
          total += entries.length;
        } catch (err) {
          console.error('[WST] 读取文件失败:', fullPath, err);
        }
      }
    }

    this.data = next;
    this.total = total;
    this.foundFolder = found;
    return total;
  }
}

module.exports = { WstDataStore, parseEntries };
