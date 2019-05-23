
/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import vscode = require('vscode');
import path = require('path');
import fs = require('fs');
import { Position, Uri } from "vscode";
import { getWorkspaceFolderPath, isPositionInString, killProcess, getKeyForLru } from './util';
import { byteOffsetAt, oxStd, OxOImplementation, oxKeywords } from './util';
import { GetOxLinter, GetOxMetricsSrcFolder, quoteFileName, IsMac, IsInDev } from './OxBin';
import cp = require('child_process');
var LRU = require("lru-cache") //https://github.com/isaacs/node-lru-cache

export class GoImplementationProvider implements vscode.ImplementationProvider {
	private cacheImplementation = new LRU({ max: 20, maxAge: 0 * 5 * 1000 }) // 1 minutes max	
	public provideImplementation(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Definition> {
		const root = getWorkspaceFolderPath(document.uri);
		let rootFolderPath: string;
		if (!root) {
			var dir = dir = path.dirname(document.fileName);
			rootFolderPath = dir;
			// vscode.window.showInformationMessage('Cannot find implementations when there is no workspace open.');
			// return;
		}
		else {
			rootFolderPath = root;
		}
		if (document.languageId !== 'Ox') {
			return;
		}
		return new Promise<vscode.Definition>((resolve, reject) => {
			if (token && token.isCancellationRequested) {
				return resolve(null);
			}
			let wordRange = document.getWordRangeAtPosition(position);
			let lineText = document.lineAt(position.line).text;
			let word = wordRange ? document.getText(wordRange) : '';

			if (!wordRange || lineText.startsWith('//') || isPositionInString(document, position) || word.match(/^\d+.?\d+$/) || oxKeywords.indexOf(word) > 0 || oxStd.indexOf(word) > 0) {
				return resolve(null);
			}
			if (position.isEqual(wordRange.end) && position.isAfter(wordRange.start)) {
				position = position.translate(0, -1);
			}
			try {
				var oxlinter = GetOxLinter();
				var inc3 = quoteFileName(GetOxMetricsSrcFolder()); //"C:\\Progra~1\\OxMetrics8\\ox\\src\\"; 
				oxlinter.flags.push("--filestdin");// quoteFileName(document.fileName,false));
				oxlinter.flags.push((document.fileName)); // problem avec quote car le renvoie se fait 	avec des quotes egalement ...
				oxlinter.flags.push("--include=" + (inc3));
				oxlinter.flags.push("--include=" + quoteFileName(rootFolderPath));//  vscode.workspace.rootPath);	 // important, à voir si il faut faire cette étape dans le linter à partir du nom du fichier.
				oxlinter.flags.push("--FindImplementation=" + word);
				let vecoff = []
				vecoff.push(position.line);
				vecoff.push(position.character);
				oxlinter.flags.push("--offset");
				oxlinter.flags.push(position.line);
				oxlinter.flags.push(position.character);
				if (IsInDev())
					console.log('oxlinterFlag : ', oxlinter.flags);
				var lrukey = getKeyForLru(word, document);;// oxlinter.flags.join("-");
				if (this.cacheImplementation.has(lrukey)) {
					return resolve(this.cacheImplementation.get(lrukey));
				}
				let dir = path.dirname(document.fileName);
				let p: cp.ChildProcess;
				if (token) {
					token.onCancellationRequested(() => killProcess(p));
				}
				p = cp.execFile(oxlinter.FullProgramPath, oxlinter.flags, { cwd: dir }, (error, stdout, stderr) => {
					// console.error('stderr:', stderr);
					var decls;
					try {
						decls = <OxOImplementation[]>JSON.parse(stdout);
					} catch (e) {
						console.log('error:', e);
						return resolve(null);
					}
					if (stderr && IsInDev())
						console.error('stderr:', stderr);

					let results: vscode.Definition = [];
					for (let decl of decls) {
						let filepath: vscode.Uri;
						var LineStart = Number(decl.startLine) - 1;
						var CharStart = Number(decl.startcharacter);
						var LineEnd = Number(decl.endLine) - 1;
						var CharEnd = Number(decl.endcharacter);
						var range = new vscode.Range(new Position(LineStart, CharStart), new Position(LineEnd, CharEnd));
						var file = decl.file;
						var stats = fs.statSync(file);
						if (stats) {
							filepath = Uri.file(file);
							results.push(new vscode.Location(filepath, range));
						}
						else {
							vscode.window.showErrorMessage('internal error, file does not exist');
						}
					}
					this.cacheImplementation.set(lrukey, results);
					return resolve(results);
				});
				if (p.pid)
					p.stdin.end(document.getText());
			}
			catch (e) {
				console.log(e);

				return resolve(null);
			}
		});
	}
}
