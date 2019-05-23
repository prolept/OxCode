/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
/*
Inspired also by https://github.com/kasecato/vscode-docomment/ , Copyright  Keisuke Kato (MIT)
*/
'use strict';
import * as vscode from 'vscode';
import { TextEditor, Position, Selection } from 'vscode';
import cp = require('child_process');
import path = require('path');
import { GetOxLinter } from './OxBin';

export class StringUtil {

    /*-------------------------------------------------------------------------
     * Public Method
     *-----------------------------------------------------------------------*/
    public static IsNullOrWhiteSpace(line: string): boolean {
        return (line === null || line.trim() === '');
    }

    public static IsCodeBlockStart(line: string): boolean {
        if (line === null) return false;

        const isAttribute: boolean = line.trim().startsWith('['); // SKIP Attribute: [foo="bar"]
        if (isAttribute) return false;

        const isCodeBlockStart: boolean = (line.indexOf('{') !== -1);
        if (isCodeBlockStart) return true;

        const isInterface: boolean = (line.indexOf(';') !== -1);
        if (isInterface) return true;

        const isEndMethod: boolean = (line.trim().endsWith(')'));
        if (isEndMethod) return true;

        const isXml: boolean = (line.indexOf('</') !== -1);
        if (isXml) return true;

        return isCodeBlockStart;
    }

    public static RemoveComment(line: string): string {
        if (line === null) return null;
        return line.replace(/\/\/.*/, '').replace(/\/\*.*\*\//, '');
    }

    public static GetIndent(line: string, indentBaseLine: string, insertSpaces: boolean, detectIndentation: boolean): string {
        if (line === null) return null;
        const indent: string = indentBaseLine.match(/([ \t]*)?/)[0];
        const spaces: string = ' '.repeat(indent.length);

        if (detectIndentation) {
            const isSpaceIndentation: boolean = (indent.match(/([ ]+)/) !== null);
            insertSpaces = isSpaceIndentation;
        }

        if (insertSpaces) {
            return indent.split('\t').join(spaces);
        } else {
            return indent.split(spaces).join('\t');
        }
    }

    public static GetIndentLen(indent: string, insertSpaces: boolean, detectIndentation: boolean): number {
        if (indent === null) return 0;

        if (detectIndentation) {
            const isSpaceIndentation: boolean = (indent.match(/([ ]+)/) !== null);
            insertSpaces = isSpaceIndentation;
        }

        if (insertSpaces) {
            return indent.split(' ').length;
        } else {
            return indent.split('\t').length;
        }
    }

}
function IsEnterKey(activeChar: string, text: string): boolean {
    return (activeChar === '') && (text.startsWith('\n') || text.startsWith("\r\n"));
}
function IsDocCommentStrict(activeLine: string): boolean {
    return activeLine.match(/^[ \t]*\/\*{2}[ \t]*/) !== null;
}
export function GenDoc(e: vscode.TextDocumentChangeEvent): void {
    //https://github.com/kasecato/vscode-docomment/
    // vsCodeApi: VSCodeApi;
    const vsCodeApi = new VSCodeApi(vscode.window.activeTextEditor);

    if (e.document.isUntitled) {
        return;
    }
    if (e.document.languageId !== 'ox') {
        return;
    }
    const activeChar: string = vsCodeApi.ReadCharAtCurrent();
    if (activeChar == null) {
        return;
    }
    if (e.contentChanges.length < 1) return;

    const eventText: string = e.contentChanges[0].text;
    if (!IsEnterKey(activeChar, eventText))
        return;
    const activeLine: string = vsCodeApi.ReadLineAtCurrent();
    if (!IsDocCommentStrict(activeLine)) {
        return;
    }
    // functionPrototype: string 
    var functionPrototype = vsCodeApi.ReadNextCodeFromCurrent('\n');

    if (functionPrototype == null) return;
    if (functionPrototype == "") return;
    functionPrototype = functionPrototype.replace(/{/, '');
    console.log("OxGenDoc : ", functionPrototype)
    var oxlinter = GetOxLinter();;
    let filename = vscode.window.activeTextEditor.document.fileName;
    oxlinter.flags.push("--gendoc=" + functionPrototype);
    let dir = path.dirname(filename);
    var spawn = require('child_process').spawn;
    var command = spawn(oxlinter.FullProgramPath, oxlinter.flags, { cwd: dir });
    var result = '';
    command.stdout.on('data', function (data) {
        result += data.toString();
    });
    command.stderr.on('data', function (data) {
    });
    command.on('close', function (code) {
        const active: Position = vscode.window.activeTextEditor.selection.active;
        const anchor: Position = new Position(active.line + 1, active.character); //vsCodeApi.GetPosition();
        const replaceSelection = new Selection(anchor, active); //vsCodeApi.GetSelectionByPosition(anchor, active);
        var splitted = result.split("\n");
        let text: string;
        text = "";
        var i = 0;
        var l = splitted.length;
        splitted.forEach(element => {
            if (i < 1)
                text += element + "\n" + GetEmptyString(active.character);
            else {
                if (i == l - 1)
                    text += element;
                else
                    text += element + "\n" + GetEmptyString(active.character);
            }
            i++;
        });
        vscode.window.activeTextEditor.edit((editBuilder) => {
            editBuilder.replace(replaceSelection, text);
        });
    });


}
function GetEmptyString(lenght: Number): string {
    let res: string;
    res = "";
    for (let index = 0; index < lenght; index++) {
        res += " ";
    }
    return res;
}
export class VSCodeApi { //TODO a supprimer totalement ?

    /*-------------------------------------------------------------------------
     * Field
     *-----------------------------------------------------------------------*/
    private _activeEditor: TextEditor;

    /*-------------------------------------------------------------------------
     * Public Method
     *-----------------------------------------------------------------------*/
    constructor(activeEditor: TextEditor) {
        this._activeEditor = activeEditor;
    }
    /*-------------------------------------------------------------------------
     * VS Code API
     *-----------------------------------------------------------------------*/
    public IsLanguage(languageId: string): boolean {
        return (this._activeEditor.document.languageId === languageId);
    }

    public GetActivePosition(): Position {
        return this._activeEditor.selection.active;
    }

    public GetActiveLine(): number {
        return this.GetActivePosition().line;
    }

    public GetLineCount(): number {
        return this._activeEditor.document.lineCount;
    }

    public GetActiveCharPosition(): number {
        return this._activeEditor.selection.active.character;
    }

    public ReadLine(line: number): string {
        return this._activeEditor.document.lineAt(line).text;
    }

    public ReadLineAtCurrent(): string {
        return this.ReadLine(this.GetActiveLine());
    }

    public ReadCharAtCurrent(): string {
        return this.ReadLineAtCurrent().charAt(this.GetActiveCharPosition());
    }

    public ReadNextCodeFromCurrent(eol: string = '\n'): string {
        const lineCount: number = this.GetLineCount();
        const curLine: number = this.GetActiveLine();
        let code = '';
        for (let i: number = curLine; i < lineCount - 1; i++) {

            const line: string = this.ReadLine(i + 1);

            // Skip empty line
            if (StringUtil.IsNullOrWhiteSpace(line)) continue;

            code += line + eol;

            // Detect start of code
            if (!StringUtil.IsCodeBlockStart(line)) {
                continue;
            }
            return StringUtil.RemoveComment(code);
        }
        return null;
    }


}