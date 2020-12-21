/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import * as vscode from 'vscode';
import fs = require('fs');
import { workspace } from "vscode";
import { OxDocumentSymbolProvider } from './oxOutline';
import { GoImplementationProvider } from './oxGoToImplementations';
import { OxSignatureHelpProvider } from './OxSignature';
import { OxCompletionItemProvider } from './OxCompletion';
import CodeManager from './OxCodeManager';
import GoDefinitionProvider from './oxGoToDefininition';
import { GenDoc } from './OxGenDoc';
import { getExtensionCommands, IsCorrectOxFile, FixPathWindows, DevLog } from './util';
import { CheckOxMetricsIsOk, GetOxMetricsPath, GetOxDocFolder, GetOxIncludeFolders, IsWindows } from './OxBin';
import { OxDocumentFormattingEditProvider } from './OxFormat';
import { OxIncludeCompletionItemProvider } from './OxIncludeCompletion';
const OX_MODE: vscode.DocumentFilter = { language: 'ox', scheme: 'file' };
const OX_SELECTOR: vscode.DocumentSelector = { scheme: 'file', language: 'ox' };// only files from disk
const codeManager = new CodeManager();
const SymbolProvider = new OxDocumentSymbolProvider();
const CompletionItemProvider = new OxCompletionItemProvider();
const extensionPackage = require('../../package.json');
const open = require('open');
export function activate(context: vscode.ExtensionContext) {

    DevLog("Ox for Visual Studio - version : ", extensionPackage["version"]);
    DevLog("vscode version : ", vscode.version);
    DevLog("process.platform : ", process.platform);
    if (process.platform != "darwin" && process.platform != "win32" && process.platform != "linux") {
        DevLog("invalid platform");
        vscode.window.showInformationMessage("OxCode does not support the current platform");
        return;
    }

    if (!CheckOxMetricsIsOk(context.extensionPath)) {
        DevLog('Invalid configuration')
        return;
    }



    const providerInclude = new OxIncludeCompletionItemProvider(GetOxIncludeFolders());

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(OX_SELECTOR, providerInclude, "<", '"', "/", "\\"));
    context.subscriptions.push(workspace.onDidSaveTextDocument(document => SymbolProvider.ClearCacheForAFile(document)));
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(OX_MODE, SymbolProvider));
    context.subscriptions.push(vscode.languages.registerImplementationProvider(OX_SELECTOR, new GoImplementationProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(OX_SELECTOR, new OxDocumentFormattingEditProvider()));
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(OX_SELECTOR, new OxSignatureHelpProvider(), '(', ','));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(OX_SELECTOR, CompletionItemProvider, '.' /* triggered whenever a '.' is being typed*/));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(OX_SELECTOR, new GoDefinitionProvider()));
    context.subscriptions.push(vscode.commands.registerCommand('extension.RunOxInTerminal', () => { codeManager.runInTerminal(); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.RunOx', () => { codeManager.Run(false); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.RunOxViaOxRun', () => { codeManager.Run(true); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.KillOx', () => { codeManager.KillRunningOx(); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.CleanBakFiles', () => { CleanBakFiles(); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.CompileLinkOxo', () => { codeManager.CompileOxo(true); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.CompileOxo', () => { codeManager.CompileOxo(false); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.LinterOx', () => { codeManager.LinterOx(false, false); }));
    // context.subscriptions.push(vscode.commands.registerCommand('extension.SavePreprocessed', () => { codeManager.LinterOx(true, true); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.ClearError', () => { codeManager.clearError(); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.Help', () => { RunHelp(); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.OpenWithOxMetrics', () => { OpenWithOxMetrics(); }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.ClearCache', () => { ClearAllCaches(); }));
    context.subscriptions.push(workspace.onDidChangeTextDocument(eve => GenDoc(eve)));
    context.subscriptions.push(workspace.onDidSaveTextDocument(document => CheckSyntaxOnSave(document)));
    context.subscriptions.push(workspace.onDidSaveTextDocument(() => codeManager.clearError()));

    context.subscriptions.push(workspace.onDidSaveTextDocument(() => CompletionItemProvider.ClearCache()));
    context.subscriptions.push(vscode.commands.registerCommand('extension.ox.GetDebuggerPath', config => { return GetDebuggerPath(); }));
    context.subscriptions.push(vscode.commands.registerCommand('ox.show.commands', () => {
        const extCommands = getExtensionCommands();
        extCommands.push({ command: 'editor.action.goToDeclaration', title: 'Go to Definition' });
        extCommands.push({ command: 'editor.action.goToImplementation', title: 'Go to Implementation' });
        extCommands.push({ command: 'editor.action.peekImplementation', title: 'Peek Implementation' });
        vscode.window.showQuickPick(extCommands.map(x => x.title)).then(cmd => {
            const selectedCmd = extCommands.find(x => x.title === cmd);
            if (selectedCmd) {
                vscode.commands.executeCommand(selectedCmd.command);
            }
        });
    }));

    DevLog('OK activate extension [789]')
}

function ClearAllCaches(): void {
    CompletionItemProvider.ClearCache();
    SymbolProvider.ClearCache();

}

function GetDebuggerPath(): string {

    if (IsWindows()) {
        var oxConfig = vscode.workspace.getConfiguration('oxcode');
        if (oxConfig == null)
            return "tochange";
        var oxfolder = oxConfig["oxmetricsFolder"];
        var path = oxfolder + "\\ox\\bin\\oxli.exe";
        return path;
    }
    return "tochange";
}
function OpenWithOxMetrics(): void {
    try {
        if (!IsCorrectOxFile())
            return;

        var oxmetrics = GetOxMetricsPath();
        if (oxmetrics == null) return;
        /* In this way oxmetrics is not closed if VS Code quits. (do not work in debug model) */
        var prg = (oxmetrics);
        var spawn = require('child_process').spawn;
        const subprocess = spawn(prg, [FixPathWindows(vscode.window.activeTextEditor.document.fileName)], {
            detached: true,
            stdio: 'ignore'
        });
        subprocess.unref();
    } catch (error) {
        DevLog(error);
    }
}
async function RunHelp(): Promise<void> {
    DevLog("RunHelp");
    if (!IsCorrectOxFile())
        return;
    try {
        var oxdocFolder = GetOxDocFolder();
        var url2 = (oxdocFolder + "//oxstd.html");
        open(url2); // for some reasons it didn't work with vscode.env.openExterna(...)

    } catch (error) {
        DevLog(error);
    }
}
function CheckSyntaxOnSave(document: vscode.TextDocument): void {
    var AddinConfig = vscode.workspace.getConfiguration('oxcode');
    if (AddinConfig['checkSyntaxOnSave']) {
        codeManager.CheckSyntax(document);
    }

}
function CleanBakFiles(): void {
    /* does not work in debug */
    vscode.workspace.findFiles("*.bak", "", 20).then(value => {
        for (let _i = 0; _i < value.length; _i++) {
            var mess = value[_i];
            DevLog("Delete .bak file: " + mess);
            fs.unlinkSync(mess.fsPath);

        }
    });
}
// this method is called when your extension is deactivated
export function deactivate() {
    DevLog("deactivate oxcode");
    if (codeManager != null)
        codeManager.KillRunningOx();
}

