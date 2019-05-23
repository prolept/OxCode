/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import vscode = require('vscode');
import cp = require('child_process');
import * as path from 'path';
import fs = require('fs');
import { Position, Uri } from "vscode";
import { isPositionInString, oxKeywords, killProcess, getKeyForLru } from './util';
import { OxOImplementation } from './util';
import { GetOxLinter, quoteFileName, GetOxMetricsSrcFolder } from './OxBin';
var LRU = require("lru-cache") //https://github.com/isaacs/node-lru-cache
var Cache_definition = new LRU({ max: 20, maxAge: 1 * 60 * 1000 }) // 1 minutes max
export interface GoDefinitionInformation {
	file: vscode.Uri;
	line: number;
	column: number;
	prototype: string;
	javadoc: string;
}


export function definitionLocation(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<GoDefinitionInformation> {

	return new Promise<GoDefinitionInformation>((resolve, reject) => {

		if (token)
			if (token.isCancellationRequested) {
				return resolve(null);
			}
		let wordRange = document.getWordRangeAtPosition(position);
		let lineText = document.lineAt(position.line).text;
		let word = wordRange ? document.getText(wordRange) : '';
		if (!wordRange || lineText.startsWith('//') || isPositionInString(document, position) || word.match(/^\d+.?\d+$/)) {
			return resolve(null);
		}
		if (oxKeywords.indexOf(word) > 0) return resolve(null);

		if (position.isEqual(wordRange.end) && position.isAfter(wordRange.start)) {
			position = position.translate(0, -1);
		}
		try {
			var oxlinter = GetOxLinter();
			var inc3 = quoteFileName(GetOxMetricsSrcFolder());
			oxlinter.flags.push("--filestdin");
			oxlinter.flags.push((document.fileName));
			oxlinter.flags.push("--include=" + (inc3));
			oxlinter.flags.push("--include=" + quoteFileName(path.dirname(document.fileName))); // maybe I can do it directly in the Linter ?
			oxlinter.flags.push("--FindDefinition=" + word);
			oxlinter.flags.push("--offset");
			oxlinter.flags.push(String(position.line));
			oxlinter.flags.push(String(position.character));
			let dir = path.dirname(document.fileName);

			let p: cp.ChildProcess;
			if (token) {
				token.onCancellationRequested(() => killProcess(p));
			}

			var LruKey = getKeyForLru(word, document);//oxlinter.flags.join("-");  
			if (Cache_definition.has(LruKey)) {
				// console.log("definition form cache");
				return resolve(Cache_definition.get(LruKey));
			}
			console.log(oxlinter);
			if (!path.isAbsolute(oxlinter.FullProgramPath)) {
				console.log("not an absolute path " + oxlinter.FullProgramPath);
				return reject();
			}
			p = cp.execFile(oxlinter.FullProgramPath, oxlinter.flags, { cwd: dir }, (error, stdout, stderr) => {

				if (error) {
					console.log('stdout definition error :', stdout);
					console.log('stderr definition error:', stderr);
					return resolve(null);
				}
				var decls;
				if (stdout == "") return resolve(null);
				try {
					decls = <OxOImplementation[]>JSON.parse(stdout);
				} catch (e) {
					console.log('error:', e);
					return resolve(null);
				}
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
						let info: GoDefinitionInformation = {
							column: CharStart,
							line: LineStart,
							file: filepath,
							prototype: decl.prototype,
							javadoc: decl.javadoc
						};
						Cache_definition.set(LruKey, info);
						return resolve(info);
					}
					else {
						vscode.window.showErrorMessage('internal error, file does not exist');
					}
				}
				return resolve(null);
			});
			if (p.pid) {
				p.stdin.end(document.getText());
			}
		}
		catch (e) {
			console.log(e);
			return resolve(null);
		}

	});

}
export default class GoDefinitionProvider implements vscode.DefinitionProvider {
	// // private goConfig = null;

	// constructor(OxConfigUt?: vscode.WorkspaceConfiguration) {
	// 	// this.goConfig = goConfig;
	// 	// if (!CheckOxMetricsIsOk(OxConfigUt)) {
	// 	// 	console.log('Invalid configuration')
	// 	// 	return;
	// 	// 	}
	// }

	public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location> {
		// vscode.window.showInformationMessage('TODO DEFINITION : position '+ JSON.stringify(position) +' token' + JSON.stringify(token) );
		if (document.languageId !== 'Ox') {
			return null;
		}
		return definitionLocation(document, position, token).then(definitionInfo => {
			if (definitionInfo == null || definitionInfo.file == null) return null;
			let pos = new vscode.Position(definitionInfo.line, definitionInfo.column);
			return new vscode.Location(definitionInfo.file, pos);
		}, err => {
			if (err) {
				// // Prompt for missing tool is located here so that the
				// // prompts dont show up on hover or signature help
				// if (typeof err === 'string' && err.startsWith(missingToolMsg)) {
				// 	promptForMissingTool(err.substr(missingToolMsg.length));
				// } else {
				return Promise.reject(err);
				// }
			}
			return Promise.resolve(null);
		});
	}
}