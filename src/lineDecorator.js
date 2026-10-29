'use strict';

const vscode = require('vscode');

class LineDecorator {
  constructor(store) {
    this.store = store;
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
        fontStyle: 'italic',
        margin: '0 0 0 1.2em',
      },
    });
  }

  isEnabled() {
    const cfg = vscode.workspace.getConfiguration('wst');
    return cfg.get('enabled', true) && cfg.get('enableLineComments', true);
  }

  refresh() {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateDecorations(editor);
    }
  }

  updateDecorations(editor) {
    if (!editor || !editor.document) return;

    const decos = [];
    if (this.isEnabled()) {
      const entries = this.store.get(editor.document.languageId);
      if (entries.length) {
        const doc = editor.document;
        for (let i = 0; i < doc.lineCount; i++) {
          const lineText = doc.lineAt(i).text;
          const annotation = this.matchLine(lineText, entries);
          if (annotation) {
            const pos = new vscode.Position(i, lineText.length);
            const range = new vscode.Range(pos, pos);
            decos.push({ range, renderOptions: { after: { contentText: '  ' + annotation } } });
          }
        }
      }
    }
    editor.setDecorations(this.decorationType, decos);
  }

  matchLine(lineText, entries) {
    const trimmed = lineText.trim();
    if (!trimmed) return null;

    let best = null;
    let bestLen = -1;
    for (const e of entries) {
      let text = e.text || e.code;
      const len = e.code.length;

      if (e.isPlain) {
        if (!trimmed.toLowerCase().includes(e.code.toLowerCase())) continue;
      } else {
        let m;
        try {
          m = e.lineRegex.regex.exec(trimmed);
        } catch (err) {
          continue;
        }
        if (!m) continue;
        // 把文本里的 [$n] 替换为实际匹配到的值
        text = text.replace(/\[\$(\d+)\]/g, (whole, n) => {
          const idx = e.lineRegex.placeholders.indexOf(parseInt(n, 10));
          const cap = idx >= 0 ? m[idx + 1] : undefined;
          return cap !== undefined ? cap : whole;
        });
      }

      if (len > bestLen) {
        best = text;
        bestLen = len;
      }
    }
    return best;
  }
}

module.exports = { LineDecorator };
