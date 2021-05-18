/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
import * as vscode from 'vscode';
import fs = require('fs');
import * as path from 'path';
import * as cp from 'child_process'
import { commands, Diagnostic, workspace, DiagnosticSeverity, languages, Position, Range, Uri, window, Disposable } from "vscode";
import { byteOffsetAt, OxIssue, IsCorrectOxFile, getWorkspaceFolderPath, DevLog } from './util';
import { GetOxLinter, GetOxlPath, quoteFileName } from './OxBin';


let StatusBarOxRunning: vscode.StatusBarItem;
// open file in custom browser
export default class CodeManager {
    private _outputChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal;
    private _isRunning: boolean;
    private _isRunningLinter: boolean;
    private _process;
    private _diagnostics: vscode.DiagnosticCollection;

    constructor() {
        this._terminal = null;
        this._outputChannel = vscode.window.createOutputChannel("Ox console");
        this._diagnostics = languages.createDiagnosticCollection("Ox");
        this._isRunningLinter = false;
        this._isRunning = false;
        StatusBarOxRunning = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100); // https://github.com/Microsoft/vscode-extension-samples/blob/master/statusbar-sample/src/extension.ts
        StatusBarOxRunning.command = "extension.KillOx";
        // update status bar item once at start
        this.updateStatusBar(false);
    }

    private SetOxRunning(run: boolean) {
        if (run) {
            this._isRunning = true;
            this.updateStatusBar(true);
        }
        else {
            this._isRunning = false;
            this.updateStatusBar(false);
        }
    }

    /**
     * Includes double quotes around a given file name.
     */
    // private quoteFileName(fileName: string): string {
    //     return '\"' + fileName + '\"';
    // }

    private parseSeverity(severity): DiagnosticSeverity {
        switch (severity) {
            case "Error":
                return DiagnosticSeverity.Error;
            case "Warning":
                return DiagnosticSeverity.Warning;
            case "Fatal":
                return DiagnosticSeverity.Error;
            case "style":
                return DiagnosticSeverity.Information;
            case "Informational":
                return DiagnosticSeverity.Information;
            case "Ignore":
                return DiagnosticSeverity.Hint;
            default:
                return DiagnosticSeverity.Hint;
        }

    }


    private updateStatusBar(run: boolean): void {
        if (run) {
            StatusBarOxRunning.text = `$(sync~spin) Ox is running. Click here to stop.`;
            StatusBarOxRunning.show();
        } else {
            StatusBarOxRunning.hide();
        }
    }


    public clearError(): void {
        this._diagnostics.clear();
    }

    public LinterOx(complete: boolean, onlysavePrepro: boolean = false): void {

        if (!IsCorrectOxFile())
            return;
        try {
            if (this._isRunningLinter) {
                vscode.window.showInformationMessage('Ox Linter is already running.Please wait');
                return;
            }
            var filename = ((vscode.window.activeTextEditor.document.fileName));
            var oxlinter = GetOxLinter(["--filestdin", filename]);
            oxlinter.flags.push("--include=" + quoteFileName(getWorkspaceFolderPath(vscode.window.activeTextEditor.document.uri))) // quote important pour les dossiers
            var dirname = filename.match(/(.*)[\/\\]/)[1] || '';
            oxlinter.flags.push("--include=" + quoteFileName(dirname));
            if (complete)
                oxlinter.flags.push("--complete");//  command = command + " --complete";
            if (onlysavePrepro)
                oxlinter.flags.push("--output=prepo.txt");// command = command + " --output=prepo.txt";
            this._isRunningLinter = true;
            const clearPreviousOutput = true;
            if (clearPreviousOutput) {
                this._outputChannel.clear();
            }
            const showExecutionMessage = false;// this._config.get<boolean>("showExecutionMessage");

            if (showExecutionMessage) {
                this._outputChannel.show(true);
                this._outputChannel.appendLine("[Running] " + oxlinter.flags);
            }
            var IsError = false;
            const startTime = new Date();
            let dir = path.dirname(vscode.window.activeTextEditor.document.fileName);
            let p: cp.ChildProcess;
            p = cp.execFile(oxlinter.FullProgramPath, oxlinter.flags, { cwd: dir }, (error, stdout, stderr) => {

                if (onlysavePrepro) {
                    DevLog(stderr.toString());
                    DevLog(stdout.toString());
                }
                // console.error(stderr.toString());
                this._isRunningLinter = false;
                const endTime = new Date();
                const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
                const diagsCollection: { [key: string]: Diagnostic[] } = {};
                let Issues = <OxIssue[]>JSON.parse(stdout);

                if (Issues.length == 0) {
                    vscode.window.showInformationMessage('Ox Linter: No problem found.');
                    if (showExecutionMessage) {
                        this._outputChannel.appendLine("[Done] exited with code=" + error + " in " + elapsedTime + " seconds");
                        this._outputChannel.appendLine("");
                    }

                    this._diagnostics.clear();
                    return;
                }
                if (showExecutionMessage)
                    this._outputChannel.appendLine("[Done] exited with code=" + error + " in " + elapsedTime + " seconds");
                for (let decl of Issues) {

                    var filename = decl.file;
                    var LineStart = decl.startLine - 1;
                    var CharStart = Number(decl.startcharacter);
                    var LineEnd = decl.endLine - 1;
                    var CharEnd = Number(decl.endcharacter);
                    const range = new Range(new Position(LineStart, CharStart), new Position(LineEnd, CharEnd));
                    const message = decl.generalmessage;
                    const severity = decl.Severity;
                    const category = decl.category;
                    const severityParsed = this.parseSeverity(severity);
                    const diag = new Diagnostic(range, message, severityParsed);
                    if (diagsCollection[filename] === undefined) {
                        diagsCollection[filename] = [];
                    }
                    diagsCollection[filename].push(diag);
                };
                this._diagnostics.clear();
                let counter = 0;
                for (let key in diagsCollection) {
                    let value = diagsCollection[key];
                    let filepath: vscode.Uri;
                    var key2 = key;
                    DevLog("key2" + key2);
                    var stats = fs.statSync(key2);
                    if (stats) {
                        filepath = Uri.file(key2);// Uri.file(key);
                        this._diagnostics.set(filepath, value);
                        counter++;
                    }
                    else {
                        vscode.window.showInformationMessage('file does not exist : ');
                    }
                }
                if (counter > 0) {
                    vscode.commands.executeCommand("workbench.actions.view.problems");
                }
            });

            if (p.pid)
                p.stdin.end(vscode.window.activeTextEditor.document.getText());
        }
        catch (e) {
            this._isRunningLinter = false;
            DevLog('Error Occur !');

        }
    }



    // cf https://github.com/formulahendry/vscode-code-runner/blob/master/README.md
    public runInTerminal(): void {
        if (!IsCorrectOxFile())
            return;
        var OxlPath = GetOxlPath();
        let dir = path.dirname(vscode.window.activeTextEditor.document.fileName);
        var command = quoteFileName(OxlPath) + " -i" + quoteFileName(dir) + " " + quoteFileName(vscode.window.activeTextEditor.document.fileName);
        if (this._terminal == null || !vscode.window.terminals.find(x => x.processId === this._terminal!.processId)) {
            this._terminal = vscode.window.createTerminal("OxOutput");

        }
        this._terminal.show(true);
        this._terminal.sendText(command);
    }

    public CompileOxo(link: boolean): void {
        if (!IsCorrectOxFile())
            return;
        vscode.window.activeTextEditor.document.save();
        if (this._isRunning == true) {
            vscode.window.showInformationMessage('Ox is already running.Please wait');
            return;
        }
        var oxlPath = GetOxlPath();
        var slink = " ";
        if (link)
            slink = " -cl ";
        else
            slink = " -c ";
        var command = quoteFileName(oxlPath) + slink + " -v1 " + vscode.window.activeTextEditor.document.fileName;
        this.SetOxRunning(true);
        this._outputChannel.show(true);
        const exec = require("child_process").exec;
        this._outputChannel.appendLine("[Running] " + command);
        const startTime = new Date();
        let dir = path.dirname(vscode.window.activeTextEditor.document.fileName);
        this._process = exec(command, { cwd: dir }); //this._cwd
        var stdout = "";
        this._process.stdout.on("data", (data) => {
            // STRIP canonical loop message ...
            if (!data.includes("canonical loop")) {
                this._outputChannel.append(data.toString());
                stdout += (data);
            }
        });

        this._process.stderr.on("data", (data) => {
            this._outputChannel.appendLine(data);
            console.error(data);
        });

        this._process.on("close", (code) => {
            // this._isRunning = false;
            this.SetOxRunning(false);
            const endTime = new Date();
            const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
            this._outputChannel.appendLine("");
            this._outputChannel.appendLine("[Done] exited with code=" + code + " in " + elapsedTime + " seconds");
            this._outputChannel.appendLine("");

            /////////////////////// TREAT ERRORSS
            const lintRegex = /(.*) \((\d+)\).*?:(.*)/g;
            let results = [];
            const diagsCollection: { [key: string]: Diagnostic[] } = {};
            //let match = lintRegex.exec(stdout)
            // 0 : full message
            // 1 : filepath
            // 2 : line
            // 3 : error message
            var match;
            while ((match = lintRegex.exec(stdout)) !== null) {
                var fullmess = String(match[0]);
                if (fullmess.includes("Remark")) continue; // exclude parrallel loop message
                const range = new Range(new Position(Number(match[2]) - 1, 0), new Position(Number(match[2]) - 1, fullmess.length - 1));
                const message = match[3];
                const diag = new Diagnostic(range, message);
                let filename = String(match[1]);
                if (diagsCollection[filename] === undefined) {
                    diagsCollection[filename] = [];
                }
                diagsCollection[filename].push(diag);
            }

            this._diagnostics.clear();
            let counter = 0;
            for (let key in diagsCollection) {
                counter++;
                if (counter > 100) break;
                let value = diagsCollection[key];
                let filepath: vscode.Uri;
                var key2 = key2.replace(/\\\\/g, '\\'); //IMPORTANT SINON PROBLEM FREEZE QUAND ON CLIQUE SUR PROBLEM
                key2 = key2.replace(/c:\//g, 'c:\\');
                key2 = key2.replace(/c:\\/g, 'c://');
                DevLog("key2" + key2);
                try {
                    var stats = fs.statSync(key2);
                    if (stats) {
                        filepath = Uri.file(key2);// Uri.file(key);
                        this._diagnostics.set(filepath, value);
                    }
                    else {
                        vscode.window.showInformationMessage('file does not exist : ');
                    }
                }
                catch (e) {
                    DevLog(e);
                }
            }
            if (counter > 0) {
                vscode.commands.executeCommand("workbench.actions.view.problems");
            }
            ////////////////////END TRAT ERRORS
        });
        // this._isRunning = false;
        this.SetOxRunning(false);
    }
    public KillRunningOx(): void {
        try {
            this.SetOxRunning(false);
            this._process.kill();
        }
        catch (e) {
            // DevLog(e);  
        }
    }
    public Run(): void { //TODO a changer pour lancer independant Ox RUN
        if (!IsCorrectOxFile())
            return;

        if (this._isRunning == true) {
            vscode.window.showInformationMessage('Ox is already running. Please wait or terminate the process.');
            return;
        }
        vscode.window.activeTextEditor.document.save();
        this.clearError();
        let diagnostics: vscode.Diagnostic[] = [];
        let oxlPath: string;
        oxlPath = GetOxlPath();
        var command = quoteFileName(oxlPath) + " " + vscode.window.activeTextEditor.document.fileName;
        // this._isRunning = true;
        this.SetOxRunning(true);
        this.updateStatusBar(true);
        const clearPreviousOutput = false;
        if (clearPreviousOutput) {
            this._outputChannel.clear();
        }
        this._outputChannel.show(true);

        const startTime = new Date();
        let dir = path.dirname(vscode.window.activeTextEditor.document.fileName);
        let oxlinterFlag = [];
        oxlinterFlag.push(vscode.window.activeTextEditor.document.fileName);
        this._outputChannel.appendLine("[Running] " + oxlinterFlag);
        var spawn = require('child_process').spawn;
        this._process = spawn(oxlPath, oxlinterFlag, { cwd: dir });
        var stdout = "";

        this._process.stdout.on("data", (data) => {
            this._outputChannel.append(data.toString());
            stdout += (data);
        });

        this._process.stderr.on("data", (data) => {
            this._outputChannel.appendLine(data);
            console.error(data);
        });

        this._process.on("close", (code) => {
            // this._isRunning = false;
             
            this.SetOxRunning(false);
            // this.updateStatusBarItem(false);
            const endTime = new Date();
            const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
            this._outputChannel.appendLine("");
            const lintRegex = /(.*) \((\d+)\).*?:(.*)/g;
            let results = [];
            let counter = 0;
            const diagsCollection: { [key: string]: Diagnostic[] } = {};
            // let filename = window.activeTextEditor.document.fileName;
            //let match = lintRegex.exec(stdout)
            // 0 : full message
            // 1 : filepath
            // 2 : line
            // 3 : error message
            var match;
            while ((match = lintRegex.exec(stdout)) !== null) {
                var fullmess = String(match[0]);
                const range = new Range(new Position(Number(match[2]) - 1, 0), new Position(Number(match[2]) - 1, fullmess.length - 1));
                const message = match[3];
                const diag = new Diagnostic(range, message);
                let filename = String(match[1]);
                if (diagsCollection[filename] === undefined) {
                    diagsCollection[filename] = [];
                }
                diagsCollection[filename].push(diag);
            }
            if (elapsedTime > 60)
                this._outputChannel.appendLine("[Done] exited with code=" + code + " in " + (elapsedTime / 60).toFixed(2) + " minutes");
            else
                this._outputChannel.appendLine("[Done] exited with code=" + code + " in " + elapsedTime + " seconds");
            this._outputChannel.appendLine("");
            this._diagnostics.clear();

            for (let key in diagsCollection) {
                let value = diagsCollection[key];
                let filepath: vscode.Uri;
                var key2 = key;
                var key2 = key2.replace(/\\\\/g, '\\'); //IMPORTANT SINON PROBLEM FREEZE QUAND ON CLIQUE SUR PROBLEM
                key2 = key2.replace(/c:\//g, 'c:\\');
                key2 = key2.replace(/c:\\/g, 'c://');
                //  key2 = key2.replace(/c:\//g, 'c:\\');
                DevLog("key2" + key2);
                try {
                    var stats = fs.statSync(key2);
                    // var  key2 ="file:///" +key2;
                    if (stats) {
                        filepath = Uri.file(key2);// Uri.file(key);
                        this._diagnostics.set(filepath, value);
                        counter++;
                    }
                    else {
                        vscode.window.showInformationMessage('file does not exist : ');
                    }
                }
                catch (e) {
                    DevLog(e);
                }

            }

            if (counter > 0) {
                vscode.commands.executeCommand("workbench.actions.view.problems");
            }
        });

    }

    public CheckSyntax(document: vscode.TextDocument) {

        if (document.languageId != "ox")
            return;
        var oxlPath = GetOxlPath();
        let dir = path.dirname(document.fileName);
        var command = quoteFileName(oxlPath) + " -r- " + quoteFileName(document.fileName) + " -i" + quoteFileName(dir);
        const exec = require("child_process").exec;
        var proc = exec(command, { cwd: dir });
        var stdout = "";
        proc.stdout.on("data", (data) => {
            stdout += (data);
        });
        proc.on("close", (code) => {
            if (proc.code != 0) {
                //DevLog("close :"+stdout);
                // cf https://github.com/Ikuyadeu/vscode-R
                const lintRegex = /(.*) \((\d+)\).*?:(.*)/g;
                const diagsCollection: { [key: string]: Diagnostic[] } = {};
                //let match = lintRegex.exec(stdout)
                // 0 : full message
                // 1 : filepath
                // 2 : line
                // 3 : error message
                var match;
                while ((match = lintRegex.exec(stdout)) !== null) {
                    var fullmess = String(match[0]);
                    const range = new Range(new Position(Number(match[2]) - 1, 0), new Position(Number(match[2]) - 1, fullmess.length - 1));
                    const message = match[3];
                    var filepath = String(match[1]);
                    const diag = new Diagnostic(range, message);
                    if (diagsCollection[filepath] === undefined) {
                        diagsCollection[filepath] = [];
                    }
                    diagsCollection[filepath].push(diag);
                }
                this._diagnostics.clear();
                try {
                    for (let key in diagsCollection) {
                        let value = diagsCollection[key];
                        let filepath: vscode.Uri;
                        var key2 = key;
                        var stats = fs.statSync(key2);
                        if (stats) {
                            filepath = Uri.file(key2);// Uri.file(key);
                            this._diagnostics.set(filepath, value);
                        }
                        else {
                            vscode.window.showErrorMessage('internal error, file does not exist');
                        }
                    }
                }
                catch (e) {
                    DevLog(e);
                }
                // this._diagnostics.set(Uri.file(document.fileName),  diagsCollection[filename]);
            }
            else
                this._diagnostics.clear();
        });
        // this._isRunning = false;
    }

}
