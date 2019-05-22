/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import vscode = require('vscode');
import { SignatureHelpProvider, SignatureHelp, SignatureInformation, TextDocument, Position, CancellationToken, WorkspaceConfiguration } from 'vscode';
import { isPositionInString } from './util';
import { definitionLocation } from './oxGoToDefininition';
import { IsSignature } from './OxBin';
export class OxSignatureHelpProvider implements SignatureHelpProvider {
	constructor(private goConfig?: WorkspaceConfiguration) {
	}

	public async provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken): Promise<SignatureHelp> {
		const theCall = this.walkBackwardsToBeginningOfCall(document, position);
		if (theCall == null) {
			return Promise.resolve(null);
		}
		if (document.languageId !== 'ox') {
			return Promise.resolve(null);
		}
		if (!IsSignature()) {
			return Promise.resolve(null);
		}
		const callerPos = this.previousTokenPosition(document, theCall.openParen);
		return definitionLocation(document, callerPos, token).then(definitionInfo => {

			if (definitionInfo == null || definitionInfo.file == null) return null;
			var info = definitionInfo;
			if (info.prototype == null) return Promise.resolve(null);
			var arr: vscode.ParameterInformation[] = [];
			try {

				var regExp = /\(([^)]+)\)/;
				var matches = regExp.exec(info.prototype);	  // ex info.prototype =  Coeff(r,s)	
				var args = matches[1]; // "r,s"
				var argumentsSep = args.split(",");
				argumentsSep.forEach(element => {
					var singleArgument = new vscode.ParameterInformation(element);
					arr.push(singleArgument);
				});

			} catch (error) {
				console.log("error" + error)
				return Promise.resolve(null);
			}
			const result = new SignatureHelp();
			let si: SignatureInformation;
			si = new SignatureInformation(info.prototype, this.removeStar(info.javadoc));
			si.parameters = arr;
			result.signatures = [si];
			result.activeSignature = 0;
			result.activeParameter = Math.min(theCall.commas.length, si.parameters.length - 1);
			return result;
		}, err => {
			if (err) {
				return Promise.reject(err);
			}
			return Promise.resolve(null);
		});
	}
	//white space
	private leftTrim(text: string): string {
		return text.replace(/^\s+/, "");
	}
	private leftStartTrim(text: string): string {
		return text.replace(/^\*+/, "");
	}
	private leftSlashStartTrim(text: string): string {
		return text.replace(/^\/+/, "");
	}

	private removeStar(text: string): string {
		let output = "";
		if (text.length < 1) return text;
		let lines: string[];
		lines = text.split('\n');
		for (var i = 0; i < lines.length; i++) {
			output += this.leftStartTrim(this.leftSlashStartTrim(this.leftTrim(lines[i])));
			if (output.length > 0) output += '\n';
		}
		return output.slice(0, -2);
	}
	private previousTokenPosition(document: TextDocument, position: Position): Position {
		while (position.character > 0) {
			let word = document.getWordRangeAtPosition(position);
			if (word) {
				return word.start;
			}
			position = position.translate(0, -1);
		}
		return null;
	}
	/**
	 * Goes through the function params' lines and gets the number of commas and the start position of the call.
	 */
	private walkBackwardsToBeginningOfCall(document: TextDocument, position: Position): { openParen: Position, commas: Position[] } | null {
		let parenBalance = 0;
		let maxLookupLines = 30;
		const commas = [];
		for (let lineNr = position.line; lineNr >= 0 && maxLookupLines >= 0; lineNr-- , maxLookupLines--) {

			const line = document.lineAt(lineNr);
			// if its current line, get the text until the position given, otherwise get the full line.
			const [currentLine, characterPosition] = lineNr === position.line
				? [line.text.substring(0, position.character), position.character]
				: [line.text, line.text.length - 1];

			for (let char = characterPosition - 1; char >= 0; char--) {
				switch (currentLine[char]) {
					case '(':
						parenBalance--;
						if (parenBalance < 0) {
							return {
								openParen: new Position(lineNr, char),
								commas
							};
						}
						break;
					case ')':
						parenBalance++;
						break;
					case ',':
						const commaPos = new Position(lineNr, char);
						if ((parenBalance === 0) && !isPositionInString(document, commaPos)) {
							commas.push(commaPos);
						}
						break;
				}
			}
		}
		return null;
	}
}
