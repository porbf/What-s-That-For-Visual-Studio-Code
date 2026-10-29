'use strict';

const vscode = require('vscode');

class WstCompletionProvider {
  constructor(store) {
    this.store = store;
  }

  isEnabled() {
    const cfg = vscode.workspace.getConfiguration('wst');
    return cfg.get('enabled', true) && cfg.get('enableCandidateComments', true);
  }

  provideCompletionItems(document, position) {
    if (!this.isEnabled()) return undefined;

    const entries = this.store.get(document.languageId);
    if (!entries.length) return undefined;

    const line = document.lineAt(position);
    const textBefore = line.text.slice(0, position.character);
    const prefix = (textBefore.trimEnd().match(/\S+$/u) || [''])[0].toLowerCase();

    const items = [];
    for (const e of entries) {
      // 带占位符（[$n] / {…}）的条目是整行模板，只用于「代码行注释」，不作为补全候选
      if (!e.isPlain) continue;

      if (prefix && !e.filterText.toLowerCase().includes(prefix) && !e.code.toLowerCase().includes(prefix)) {
        continue;
      }
      const item = new vscode.CompletionItem(e.code, vscode.CompletionItemKind.Keyword);
      item.detail = e.text || ''; // 显示在候选项右侧
      item.insertText = new vscode.SnippetString(e.snippet);
      item.filterText = e.filterText;
      item.sortText = '0' + e.filterText; // 让 .WST 匹配项排在候选项前列
      item.documentation = new vscode.MarkdownString(
        '`' + e.code.replace(/`/g, '\\`') + '`\n\n' + (e.text || '')
      );
      items.push(item);
    }
    return items;
  }
}

function registerCompletion(store) {
  // file + untitled 都注册：未保存的临时文件也能触发补全
  return vscode.languages.registerCompletionItemProvider(
    [{ scheme: 'file' }, { scheme: 'untitled' }],
    new WstCompletionProvider(store),
    '.', ':', '-', ' ', '[', '{', '$'
  );
}

module.exports = { registerCompletion };
