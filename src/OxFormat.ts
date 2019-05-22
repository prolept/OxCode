/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import vscode = require('vscode');
import cp = require('child_process');
import path = require('path');
import { GetOxLinter, ProcessInfo } from './OxBin';
import { killProcess } from './util';

export class OxDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
	public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
		if (vscode.window.visibleTextEditors.every(e => e.document.fileName !== document.fileName)) {
			return [];
		}
		var oxlinter = GetOxLinter();
        var AddinConfig = vscode.workspace.getConfiguration('oxcode');
        var useDefaultOption = true;
        if (AddinConfig['astyleOptions']) {
            var options2 = AddinConfig['astyleOptions'];
            if (options2) {
                oxlinter.flags.push("--cleanup=" + String(options2));
                useDefaultOption = false;
            }
        }
        if (useDefaultOption)
            oxlinter.flags.push("--cleanup=\"\"");
		oxlinter.flags.push("--filestdin=" + vscode.window.activeTextEditor.document.fileName);
		return this.runFormatter(oxlinter, document, token).then(edits => edits, err => {
			if (err) {
				console.log(err);
				return Promise.reject('Check the console in dev tools to find errors when formatting.');
			}
		});
	}

	private runFormatter(formatTool :ProcessInfo, document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
	 
		return new Promise<vscode.TextEdit[]>((resolve, reject) => {
			const t0 = Date.now();
			const cwd = path.dirname(document.fileName);
			let stdout = '';
			let stderr = '';
			console.log(formatTool.flags);
			// Use spawn instead of exec to avoid maxBufferExceeded error
			const p = cp.spawn(formatTool.FullProgramPath, formatTool.flags, {  cwd });
			if (token) {
				token.onCancellationRequested(() => killProcess(p));
			}
			// token.onCancellationRequested(() => !p.killed && killTree(p.pid));
			p.stdout.setEncoding('utf8');
			p.stdout.on('data', data => stdout += data);
			p.stderr.on('data', data => stderr += data);
			p.on('error', err => {
				if (err && (<any>err).code === 'ENOENT') {
					// promptForMissingTool(formatTool);
					return reject();
				}
			});
			p.on('close', code => {
				if (code !== 0) {
					return reject(stderr);
				}
				// Return the complete file content in the edit.
				// VS Code will calculate minimal edits to be applied
				const fileStart = new vscode.Position(0, 0);
				const fileEnd = document.lineAt(document.lineCount - 1).range.end;
				const textEdits: vscode.TextEdit[] = [new vscode.TextEdit(new vscode.Range(fileStart, fileEnd), stdout)];
				const timeTaken = Date.now() - t0;
				if (timeTaken > 750) {
					console.log(`Formatting took too long(${timeTaken}ms). Format On Save feature could be aborted.`);
				}
				return resolve(textEdits);
			});
			if (p.pid) {
				p.stdin.end(document.getText());
			}
		});
	}
}