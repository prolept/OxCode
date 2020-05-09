
/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import * as vscode from 'vscode';
import cp = require('child_process');
import { CompletionItem } from 'vscode'
import { oxKeywords, killProcess, getKeyForLru, DevLog } from './util';
import path = require('path');
import { GetOxLinter, IsCompletion } from './OxBin';
var LRU = require("lru-cache") //https://github.com/isaacs/node-lru-cache
export interface IOxCompletion {
    name: string;
    type: string;
}

var Cache_Autocompletion = new LRU({ max: 20, maxAge: 1 * 60 * 1000 })

function runCompletition(document: vscode.TextDocument, parentvar: string, line: number, token: vscode.CancellationToken, callback) {
    var filename = document.fileName;
    var oxlinter = GetOxLinter(['--symbol', "--filestdin=" + filename, "--autocompletion=" + parentvar, "--line=" + line]);
    let dir = path.dirname(filename);
    var LruKey = getKeyForLru(parentvar, document);

    if (Cache_Autocompletion.has(LruKey)) {
        //DevLog("autocompletition form cache");
        return callback(Cache_Autocompletion.get(LruKey));
    }

    let p: cp.ChildProcess;
    if (token) {
        token.onCancellationRequested(() => killProcess(p));
    }
    p = cp.execFile(oxlinter.FullProgramPath, oxlinter.flags, { cwd: dir }, (error, stdout, stderr) => {
        if (error) {
            DevLog('Error definition null');
            return callback(null);
        }
        if (stdout == "")
            return callback(null);
        Cache_Autocompletion.set(LruKey, stdout);
        return callback(stdout);
    });
    if (p.pid) {
        p.stdin.end(document.getText());
    }
}
function documentCompletion(document: vscode.TextDocument, parentvar: string, line: number, token: vscode.CancellationToken): Promise<IOxCompletion[]> {
    return new Promise<IOxCompletion[]>((resolve, reject) => {
        runCompletition(document, parentvar, line, token, function (result) {
            try {
                if (result == "")
                    return resolve(null);
                let decls = <IOxCompletion[]>JSON.parse(result);
                return resolve(decls);
            } catch (e) {
                DevLog(e);
                return resolve(null);
            }
        });
    });
}

export class OxCompletionItemProvider implements vscode.CompletionItemProvider, vscode.Disposable {
    dispose() {
        // throw new Error("Method not implemented.");
    }
    private convertToCompleition(document: vscode.TextDocument, decls: IOxCompletion[], symbols: vscode.CompletionItem[], containerName: string): void {
        (decls || []).forEach(decl => {
            if (decl.type == "function")
                symbols.push(new vscode.CompletionItem(decl.name, vscode.CompletionItemKind.Method));
            else if (decl.type == "member")
                symbols.push(new vscode.CompletionItem(decl.name, vscode.CompletionItemKind.Field));
        });
    }
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[] | vscode.CompletionList> {//} vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        if (document.languageId !== 'ox') {
            return Promise.resolve(null);
        }
        if (!IsCompletion())
            return Promise.resolve(null);
        let suggestions: vscode.CompletionItem[] = [];
        let lineText = document.lineAt(position.line).text;
        let lineTillCurrentPosition = lineText.substr(0, position.character);
        let wordangeAtPosition = document.getWordRangeAtPosition(position);
        let currentWord = '';

        if (wordangeAtPosition && wordangeAtPosition.start.character < position.character) {
            let word = document.getText(wordangeAtPosition);
            currentWord = word.substr(0, position.character - wordangeAtPosition.start.character);
        }

        if (currentWord.length > 0) {
            oxKeywords.forEach(keyword => {
                if (keyword.startsWith(currentWord)) {
                    suggestions.push(new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword));
                }
            });
        }
        if ((!suggestions || suggestions.length === 0) && lineTillCurrentPosition.endsWith('.')) {
            //cf  https://github.com/Microsoft/vscode-go/blob/e4522ba15e8216e2bafd330453bc21ad4ce42771/src/goSuggest.ts
            let pattern = /(\w+)\.$/g;
            let wordmatches = pattern.exec(lineTillCurrentPosition);
            if (wordmatches) {
                let parentvar = wordmatches[1]; // may be "this" for this.memberfunction ...
                return documentCompletion(document, parentvar, position.line, token).then(decls => {
                    let symbols: vscode.CompletionItem[] = [];
                    this.convertToCompleition(document, decls, symbols, '');
                    return symbols;
                });
            } //wordmach
        }

        return new Promise<CompletionItem[]>((resolve, reject) => { return resolve(suggestions); })
    }


}