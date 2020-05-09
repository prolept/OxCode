/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import vscode = require('vscode');
import * as path from 'path';
import { Position } from "vscode";
import { OxOutlineDeclaration, killProcess, getKeyForLru, DevLog } from "./util";
import { GetOxLinter } from './OxBin';
import cp = require('child_process');
var LRU = require("lru-cache") //https://github.com/isaacs/node-lru-cache

export interface OxOutlineOptions {
	/**
	 * Path of the file for which outline is needed
	 */
	fileName: string;

	/**
	 * If true, then the file will be parsed only till imports are collected
	 */
	importsOnly?: boolean;

	/**
	 * Document to be parsed. If not provided, saved contents of the given fileName is used
	 */
	document?: vscode.TextDocument;
}


function runSymbol(options: OxOutlineOptions, token: vscode.CancellationToken, callback) {
	//DevLog("runSymbol")
	// vscode.window.showInformationMessage("runSymbol outline");
	var oxlinter = GetOxLinter(['--symbol', "--filestdin=" + options.fileName]);
	let p: cp.ChildProcess;
	if (token) {
		token.onCancellationRequested(() => killProcess(p));
	}
	let dir = path.dirname(options.fileName);
	//DevLog("oxlinter.FullProgramPat", oxlinter.FullProgramPath);
	//DevLog("oxlinter.flags", oxlinter.flags);
	p = cp.execFile(oxlinter.FullProgramPath, oxlinter.flags, { cwd: dir }, (error, stdout, stderr) => {
		if (error) {
			//DevLog(error);
			return callback(null);
		}
		if (stderr) DevLog(error);
		// DevLog("stdout", error);
		return callback(stdout);

	});
	if (p.pid)
		p.stdin.end(options.document.getText());
}

export function documentSymbols(options: OxOutlineOptions, token: vscode.CancellationToken): Promise<OxOutlineDeclaration[]> {
	return new Promise<OxOutlineDeclaration[]>((resolve, reject) => {
		// vscode.window.showInformationMessage('execute documentSymbols');
		runSymbol(options, token, function (result) {
			//   DevLog("runSymbol:"+result);
			try {
				if (result == "") return resolve(null);
				let decls = <OxOutlineDeclaration[]>JSON.parse(result);
				// cache_symbols.set(getKeyForLru("outline",document), symbols);
				return resolve(decls);
			} catch (e) {
				console.log(e);
				return resolve(null);
			}
		});


	});
}


export class OxDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	// For performance issues a LRU cache is used. Need to be improved...
	private Cache = new LRU({ max: 20, maxAge: 30 * 1000 }) // 30 sec max

	private goKindToCodeKind: { [key: string]: vscode.SymbolKind } = {
		'ExternalFunction': vscode.SymbolKind.Function,
		'FunctionMember': vscode.SymbolKind.Method
	};

	private convertToCodeSymbols(document: vscode.TextDocument, decls: OxOutlineDeclaration[], symbols: vscode.DocumentSymbol[], containerName: string): void {
		// let gotoSymbolConfig = vscode.workspace.getConfiguration('go', document.uri)['gotoSymbol'];
		// let includeImports = gotoSymbolConfig ? gotoSymbolConfig['includeImports'] : false;
		(decls || []).forEach(decl => {
			var LineStart = Number(decl.startLine) - 1;
			var CharStart = Number(decl.startcharacter);
			var LineEnd = Number(decl.endLine) - 1;
			var CharEnd = Number(decl.endcharacter);
			let symbolInfo = new vscode.DocumentSymbol(decl.functionName, "",
				this.goKindToCodeKind[decl.symboltype],
				new vscode.Range(new Position(LineStart, CharStart), new Position(LineEnd, CharEnd)),
				new vscode.Range(new Position(LineStart, CharStart), new Position(LineEnd, CharEnd))
			)
			symbols.push(symbolInfo);
		});
	}

	public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
		let options = { fileName: document.fileName, document: document };
		let symbols: vscode.DocumentSymbol[] = [];

		if (this.Cache.has(getKeyForLru("outline", document))) {
			//DevLog("Symbol from cache");
			return new Promise<vscode.DocumentSymbol[]>((resolve, reject) => {
				return resolve(this.Cache.get(getKeyForLru("outline", document)));
			});

		} else {
			return documentSymbols(options, token).then(decls => {

				this.convertToCodeSymbols(document, decls, symbols, '');

				if (symbols.length > 0) {
					try {
						this.Cache.set(getKeyForLru("outline", document), symbols);
					} catch (error) {
						console.log("cache error " + error);
					}

				}
				return symbols;
			});
		}
	}
}
