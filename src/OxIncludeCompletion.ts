
/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
   Credit: strongly derived from https://github.com/ajshort (vscode-include-autocomplete)
 *--------------------------------------------------------*/
'use strict';
import * as vscode from 'vscode';
import { CompletionItem } from 'vscode'
import { dirname, extname, join } from "path";
import * as fs from "fs";
import { IsCompletion } from './OxBin';
export class OxIncludeCompletionItemProvider implements vscode.CompletionItemProvider, vscode.Disposable {

    private dirs: string[] = [];
    constructor(DefaultIncludeDirectories: string[]) {
        this.dirs = DefaultIncludeDirectories
    }
    public dispose() {

    }
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[] | vscode.CompletionList> {//} vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        if (document.languageId !== 'ox') {
            return Promise.resolve(null);
        }
        // Check if we are currently inside an include/import statement.
        const text = document.lineAt(position.line).text.substr(0, position.character);
        const match = text.match(/^\s*#\s*(?:include|import)\s*(<[^>]*|"[^"]*)$/);
        if (!match) {
            return Promise.resolve(null);
        }
        let IsImport: boolean = false
        if (text.includes("import")) {
            IsImport = true;
        }
        if (!IsCompletion())
            return Promise.resolve(null);
        const delimiter = match[1].substr(0, 1);
        const contents = match[1].substr(1);
        let dirs = this.dirs;
        // Add includes relative to the file.
        if (delimiter === "<") {
            dirs.push(dirname(document.uri.fsPath));
        } else {
            dirs.unshift(dirname(document.uri.fsPath)); // add to front
        }
        // Append already typed path parts. If no path parts are typed 
        let separator = Math.max(contents.lastIndexOf("/"), contents.lastIndexOf("\\"));
        if (separator !== -1) {
            dirs = dirs.map(dir => join(dir, contents.substr(0, separator)));
        }
        // Scan each directory and return the completion items.
        const seen = new Set<string>();
        const promises = dirs.map(async dir => {
            if (!await exists(dir)) {
                return [];
            }
            const entries = await readdirAndStat(dir);
            const unseen = Object.keys(entries).filter(k => !seen.has(k));

            unseen.forEach(val => seen.add(val));
            const extsinclude = [".oxh", ".ox", ".h"]
            const extimport = [".oxo", ".ox"]

            return unseen.reduce((items, entry) => {
                if (entries[entry].isDirectory()) {
                    items.push(new vscode.CompletionItem(entry, vscode.CompletionItemKind.Folder));
                } else if (!IsImport && extsinclude.indexOf(extname(entry)) !== -1) {
                    items.push(new vscode.CompletionItem(entry, vscode.CompletionItemKind.File));
                } else if (IsImport && extimport.indexOf(extname(entry)) !== -1) {
                    items.push(new vscode.CompletionItem(entry.replace(".oxo", ""), vscode.CompletionItemKind.File));
                }

                return items;
            }, []);
        });
        var res = Promise.all(promises).then(items => items.reduce((a, b) => a.concat(b)));
        return new Promise<CompletionItem[]>((resolve) => { return resolve(res); })
        //     return new Promise<CompletionItem[]>((resolve, reject) => { return resolve(suggestions); })
    }
}

function exists(path: string): Promise<boolean> {
    return new Promise(c => fs.exists(path, c));
}

function readdir(path: string): Promise<string[]> {
    return new Promise((c, e) => fs.readdir(path, (err, files) => err ? e(err) : c(files)));
}


function stat(path: string): Promise<fs.Stats> {
    return new Promise((c, e) => fs.stat(path, (err, stats) => err ? e(err) : c(stats)));
}

async function readdirAndStat(path: string): Promise<{ [entry: string]: fs.Stats }> {
    const result = <any>{};
    const files = await readdir(path);

    await Promise.all(files.map(async file => {
        try {
            result[file] = await stat(`${path}/${file}`);
        } catch (err) { }
    }));

    return result;
}