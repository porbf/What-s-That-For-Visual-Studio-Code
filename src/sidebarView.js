'use strict';

const vscode = require('vscode');

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
    this.view.webview.postMessage({
      type: 'state',
      enabled: cfg.get('enabled', true),
      candidate: cfg.get('enableCandidateComments', true),
      line: cfg.get('enableLineComments', true),
      count: this.store.count(),
      languages: this.store.languages(),
      hasFolder: this.store.foundFolder,
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
    return `<!DOCTYPE html>
<html lang="zh-CN">
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
  <button id="refresh">刷新</button>
  <label><input type="checkbox" id="enabled"> 启用 WST</label>
  <label><input type="checkbox" id="candidate"> 启用候选注释</label>
  <label><input type="checkbox" id="line"> 启用代码行注释</label>
  <div class="status" id="status">正在加载…</div>
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
      $('status').textContent = m.hasFolder
        ? '已加载 ' + m.count + ' 条注释 · 语言：' + (m.languages.join('、') || '无')
        : '未找到 .WST 文件夹';
    });
  </script>
</body>
</html>`;
  }
}

module.exports = { WstSidebarProvider };
