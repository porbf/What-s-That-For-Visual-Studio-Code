'use strict';

const vscode = require('vscode');

function isZh(lang) {
  return !!lang && lang.toLowerCase().startsWith('zh');
}

function strings(lang) {
  const zh = isZh(lang);
  return {
    refresh: zh ? '刷新' : 'Refresh',
    enableWst: zh ? '启用 WST' : 'Enable WST',
    enableCandidate: zh ? '启用候选注释' : 'Enable candidate comments',
    enableLine: zh ? '启用代码行注释' : 'Enable code line comments',
    loading: zh ? '正在加载…' : 'Loading…',
    loaded: (n, langs) => zh
      ? '已加载 ' + n + ' 条注释 · 语言：' + (langs.join('、') || '无')
      : 'Loaded ' + n + ' annotation(s) · Languages: ' + (langs.join(', ') || 'none'),
    noFolder: zh ? '未找到 .WST 文件夹' : 'No .WST folder found',
  };
}

class WstSidebarProvider {
  constructor(store) {
    this.store = store;
    this.view = undefined;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage(msg => this.onMessage(msg));
    this.updateView();
  }

  updateView() {
    if (!this.view) return;
    const cfg = vscode.workspace.getConfiguration('wst');
    const s = strings(vscode.env.language);
    this.view.webview.postMessage({
      type: 'state',
      enabled: cfg.get('enabled', true),
      candidate: cfg.get('enableCandidateComments', true),
      line: cfg.get('enableLineComments', true),
      statusText: this.store.foundFolder
        ? s.loaded(this.store.count(), this.store.languages())
        : s.noFolder,
    });
  }

  onMessage(msg) {
    if (!msg) return;
    const cfg = vscode.workspace.getConfiguration('wst');
    if (msg.type === 'set' && msg.key) {
      const target = vscode.ConfigurationTarget.Workspace;
      if (msg.key === 'enabled') cfg.update('enabled', !!msg.value, target);
      else if (msg.key === 'candidate') cfg.update('enableCandidateComments', !!msg.value, target);
      else if (msg.key === 'line') cfg.update('enableLineComments', !!msg.value, target);
    } else if (msg.type === 'refresh') {
      vscode.commands.executeCommand('wst.refresh');
    }
  }

  getHtml() {
    const s = strings(vscode.env.language);
    const htmlLang = isZh(vscode.env.language) ? 'zh-CN' : 'en';
    return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  body { padding: 12px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  h2 { font-size: 15px; margin: 0 0 12px; }
  button { display: block; width: 100%; padding: 6px 0; margin-bottom: 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 2px; cursor: pointer; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  label { display: flex; align-items: center; gap: 8px; padding: 5px 0; cursor: pointer; }
  input[type=checkbox] { accent-color: var(--vscode-focusBorder); }
  .status { margin-top: 12px; font-size: 12px; line-height: 1.5; color: var(--vscode-descriptionForeground); word-break: break-all; }
</style>
</head>
<body>
  <h2>What's That (WST)</h2>
  <button id="refresh">${s.refresh}</button>
  <label><input type="checkbox" id="enabled"> ${s.enableWst}</label>
  <label><input type="checkbox" id="candidate"> ${s.enableCandidate}</label>
  <label><input type="checkbox" id="line"> ${s.enableLine}</label>
  <div class="status" id="status">${s.loading}</div>
  <script>
    const vscode = acquireVsCodeApi();
    const $ = id => document.getElementById(id);
    const send = (type, key, value) => vscode.postMessage({ type, key, value });
    $('refresh').addEventListener('click', () => send('refresh'));
    $('enabled').addEventListener('change', e => send('set', 'enabled', e.target.checked));
    $('candidate').addEventListener('change', e => send('set', 'candidate', e.target.checked));
    $('line').addEventListener('change', e => send('set', 'line', e.target.checked));
    window.addEventListener('message', ev => {
      const m = ev.data;
      if (!m || m.type !== 'state') return;
      $('enabled').checked = !!m.enabled;
      $('candidate').checked = !!m.candidate;
      $('line').checked = !!m.line;
      $('candidate').disabled = !m.enabled;
      $('line').disabled = !m.enabled;
      $('status').textContent = m.statusText;
    });
  </script>
</body>
</html>`;
  }
}

module.exports = { WstSidebarProvider };
