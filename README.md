# What's That (WST) For Visual Studio Code

> [中文说明](README.zh-cn.md)

Learning to code by hand is slow and inefficient. To solve this, the WST extension is here!

What this extension does is simple:

It reads a "code ↔ description" table from the `.WST` folder in your workspace root, and shows the descriptions next to **code completion candidates** and on the **right side of code lines**.

## Features

The sidebar (the "W" icon in the activity bar) contains a **WST Console**:

- **Refresh** button — re-scans the `.WST` folder in the workspace root.
- **Enable WST** — master switch; when off, both features below are disabled.
- **Enable candidate comments** — shows the description text to the right of matching completion candidates.
- **Enable code line comments** — shows the description text to the right of matching code lines via inline decorations.

When you click **Refresh**: if there is no `.WST` folder in the workspace root, WST does nothing (the console shows "No .WST folder found"); otherwise it reads the `.txt` files inside it. All language files are loaded at once.

## .WST folder format

Create a `.WST` folder in the **workspace root**. Put `.txt` files named by **language id** inside, for example `css.txt`, `csharp.txt`, `javascript.txt`, `python.txt`. The file name (without `.txt`) must match the VS Code language id (note: `csharp`, not `cshap`).

(You can check the `.WST` folder in this repo for examples.)

In each `.txt` file:

- **Odd lines (1, 3, 5, …) contain code**
- **Even lines (2, 4, 6, …) contain the description text**

Code lines support several forms:

1. Plain word: `font-size`
2. With one placeholder: `font-size: [$1];`
3. With multiple placeholders: `border-top: [$1] [$2] [$3]`

> **Completion candidates** only include **plain word entries** (without `[$n]` placeholders). Entries with `[$n]` placeholders are full-line templates used only for **code line comments**; they never appear in the completion list.

Text lines may:

- Use `[$1]`, `[$2]`, … to reference the corresponding placeholders in the code line; they are replaced with the actual matched values when rendering **code line comments**;
- Use a `{key:description,...}` list such as `{solid:solid,doble:double,...}` as a value hint (shown as-is).

## Usage

1. Open this folder (`whats-that`) in VS Code.
2. Press `F5` (or run the "Run WST Extension" configuration) to open an Extension Development Host window.
3. In that window, open a workspace that contains a `.WST` folder (for example, open the `whats-that` folder itself, which ships a sample `.WST`).
4. Open a `css` file, type `font-size` and trigger completion to see the description on the right; type `border-top: 1px solid red` to see the description at the end of the line.

## Configuration

In `Settings → Extensions → What's That (WST)`, or via the sidebar checkboxes:

- `wst.enabled`: master switch
- `wst.enableCandidateComments`: candidate comments
- `wst.enableLineComments`: code line comments

## Localization

The extension UI supports **English** (default) and **Simplified Chinese** (`zh-cn`), following the VS Code display language.

## Implementation notes

- **Candidate comments**: WST registers its own completion provider and only offers the **plain word entries** from `.WST` as completion candidates, with `detail` (the right side of the candidate) showing the description. The VS Code public API cannot modify candidates returned by other extensions, so "annotating existing candidates" is implemented by WST providing these candidates itself.
- **Code line comments**: implemented with `createTextEditorDecorationType` `after` inline decorations, showing the matched description at the end of the line.

## Footnote

The codebase is small and was built with DeepSeek Harness. Unless there is a specific need, I probably won't update this extension.

If you have feature requests or find bugs, please report them, or fork this project and build This own!

## License

[Apache License 2.0](LICENSE)
