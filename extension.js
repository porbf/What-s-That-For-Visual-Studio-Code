'use strict';

const vscode = require('vscode');
const { WstDataStore } = require('./src/wstData');
const { registerCompletion } = require('./src/completionProvider');
const { LineDecorator } = require('./src/lineDecorator');
const { WstSidebarProvider } = require('./src/sidebarView');

let store;
let lineDecorator;
let sidebarProvider;

async function refreshAll() {
  await store.load();
  lineDecorator.refresh();
  sidebarProvider.updateView();
}

function activate(context) {
  store = new WstDataStore();
  lineDecorator = new LineDecorator(store);
  sidebarProvider = new WstSidebarProvider(store);

  let decorateTimer;
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('wst.sidebar', sidebarProvider, {
      retainContextWhenHidden: true,
    }),
    registerCompletion(store),

    vscode.commands.registerCommand('wst.refresh', refreshAll),
    vscode.commands.registerCommand('wst.toggleEnabled', async () => {
      const cfg = vscode.workspace.getConfiguration('wst');
      await cfg.update('enabled', !cfg.get('enabled', true), vscode.ConfigurationTarget.Workspace);
      lineDecorator.refresh();
      sidebarProvider.updateView();
    }),

    vscode.window.onDidChangeActiveTextEditor(() => lineDecorator.refresh()),
    vscode.window.onDidChangeVisibleTextEditors(() => lineDecorator.refresh()),
    vscode.workspace.onDidChangeTextDocument(e => {
      const editor = vscode.window.activeTextEditor;
      if (editor && e.document === editor.document) {
        clearTimeout(decorateTimer);
        decorateTimer = setTimeout(() => lineDecorator.updateDecorations(editor), 150);
      }
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('wst')) {
        lineDecorator.refresh();
        sidebarProvider.updateView();
      }
    }),
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (doc.fileName.toLowerCase().indexOf('.wst') !== -1) {
        refreshAll();
      }
    })
  );

  // 初次加载并渲染
  refreshAll();
}

function deactivate() {}

module.exports = { activate, deactivate };
