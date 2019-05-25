
/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');
import { FixPathWindows } from './util';
import cp = require('child_process');
var AdmZip = require('adm-zip');
// possible node values 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
const platform = process.platform;
let platformDetected: boolean = false;
let IsMacOS: boolean = false;
export function IsMac(): Boolean {
    if (platformDetected) return IsMacOS;
    IsMacOS = platform == "darwin";
    platformDetected = true;
    return IsMacOS;
}
export interface ProcessInfo {
    FullProgramPath: string;
    flags: any[];

}
let s_defaultIncludeFolder = []
let s_linterExeFullPath: string;
let s_oxlFullPath: string;
let s_oxRunFullPath: string;
let s_oxDocFolderPath: string;
let s_oxmetricsSrcFolder: string;
let s_oxmetricsFullPath: string;

export function initPaths(oxmetricsFolder: string): boolean {
    try {
        console.log("initPaths..");
        var oxl;
        if (IsMac())
            oxl = path.resolve(oxmetricsFolder, './ox/bin/oxl'); // "C:\Program Files\OxMetrics8\ox\bin64\oxl.exe"
        else
            oxl = path.resolve(oxmetricsFolder, './ox/bin64/oxl.exe'); // "C:\Program Files\OxMetrics8\ox\bin64\oxl.exe"
        s_oxlFullPath = oxl;
        if (!fs.existsSync(s_oxlFullPath)) {
            console.log("can not find oxl");
            vscode.window.showErrorMessage("The extension cannot find the ox console in the oxmetrics folder.")
            return false;
        }
        var dirOx = path.resolve(oxmetricsFolder, './ox'); //  C:\Program Files\OxMetrics8\ox\
        var dirInclude = path.resolve(dirOx, './include');  //  C:\Program Files\OxMetrics8\ox\include
        s_oxDocFolderPath = path.resolve(dirOx, './doc//');   // C:\Program Files\OxMetrics8\doc
        s_oxmetricsSrcFolder = path.resolve(dirOx, './src//');     //C:\Program Files\OxMetrics8\ox\src
        s_defaultIncludeFolder = []
        s_defaultIncludeFolder.push(dirInclude);
        s_defaultIncludeFolder.push(dirOx);
        if (IsMac()) {

            s_oxRunFullPath = path.resolve(oxmetricsFolder, './ox/bin/OxRun.app/Contents/MacOS/OxRun'); // 
            s_oxmetricsFullPath = path.resolve(oxmetricsFolder, './OxMetrics.app/Contents/MacOS/OxMetrics'); //
        }
        else {
            s_oxRunFullPath = path.resolve(oxmetricsFolder, './ox/bin64/OxRun.exe'); // C:\Program Files\OxMetrics8\ox\bin64\oxrun.exe
            s_oxmetricsFullPath = path.resolve(oxmetricsFolder, './bin64/oxmetrics.exe'); //C:\Program Files\OxMetrics8\bin64\oxmetrics.exe
        }

        let optionsAstyle = " --pad-header --break-blocks  --pad-oper --style=java --delete-empty-lines --unpad-paren ";
        var oxConfig = vscode.workspace.getConfiguration('oxcode');
        if (!oxConfig.has('astyleOptions') || oxConfig['astyleOptions'] == null || oxConfig['astyleOptions'] == "")
            oxConfig.update("astyleOptions", optionsAstyle, vscode.ConfigurationTarget.Global);
        return true;
    } catch (error) {
        console.log(error);
        console.log("The given folder path oxmetrics is invalid");
        vscode.window.showErrorMessage("The given folder path  [" + oxmetricsFolder + "] for OxMetrics is invalid (or oxmetrics is corrupted).")

        return false;
    }
}


const sInvalidOxMetricsFolderMessage = "The extension cannot work without oxmetrics, please check your configuration file and reload VS Code.";

function VerifyLinterVersion(): boolean {
    try {
        var oxlinter = GetOxLinter();
        oxlinter.flags.push("--version");
        let p: cp.ChildProcess;
        if (!path.isAbsolute(oxlinter.FullProgramPath)) {
            console.log("not an absolute path " + oxlinter.FullProgramPath);
            return false;
        }
        var stdout = cp.execFileSync(oxlinter.FullProgramPath, oxlinter.flags).toString();
        var regex = /(\d+\.)(\d+\.)(\d+)/g;
        var version = stdout.match(regex);
        var correctVersion = "0.0.18";
        if (version[0] != correctVersion)
            return false;
        console.log("correct linter version :" + correctVersion);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }

}
export function CheckOxMetricsIsOk(extensionPath: string): boolean {

    try {
        var oxConfig = vscode.workspace.getConfiguration('oxcode');
        if (oxConfig == null)
            return false;
        console.log("oxmetricsFolder inside: " + oxConfig["oxmetricsFolder"]);

        let oxlinterPath: string;
        let pathExtension = extensionPath;
        if (IsMac())
            oxlinterPath = path.resolve(pathExtension, "./bin/oxlinter");
        else
            oxlinterPath = path.resolve(pathExtension, "./bin/win/OxLinter.exe");

        if (!fs.existsSync(oxlinterPath) && IsMac()) {
            console.log("try to extract oxlinter.zip");
            // si le package est fait sur windows ca doit ettre un zip à déziper 
            var zipfile = path.resolve(pathExtension, "./bin/oxlinter.zip");
            if (!fs.existsSync(zipfile)) {
                console.log("oxlinter.zip does not exist");
                vscode.window.showErrorMessage("The extension cannot find oxlinter.zip, please re-install the extension.")
                return false;
            }

            console.log("oxlinter.zip exist");
            var targetdir = path.resolve(pathExtension, "./bin/");
            var zip = new AdmZip(zipfile);
            zip.extractAllTo(targetdir, true);//synchrone + force replace
            if (!fs.existsSync(oxlinterPath)) {
                console.log("Mac Os code:[JSQ5]");
                vscode.window.showErrorMessage("The extension cannot find oxlinter code:[JSQ5].")
                return false;
            }
            else {
                // change permission
                fs.chmodSync(oxlinterPath, 0o777);
                console.log("success extracting oxlinter");
            }
        }
        s_linterExeFullPath = oxlinterPath;
        if (!VerifyLinterVersion()) {
            console.log("invalid linter version");
            vscode.window.showErrorMessage("Incorrect OxLinter version, please re-install the extension");
            return false;
        }
        // it is tricky to update setting because methods are asynchrones so raise an error and let the user enter the correct path... 
        if (!oxConfig.has('oxmetricsFolder') || oxConfig['oxmetricsFolder'] == null) {  // C:\Program Files\OxMetrics8\ox\bin64\oxl.exe ou /Applications/OxMetrics8/ox/bin/oxl
            console.log("invalid oxmetrics setting [KDSM]");
            vscode.window.showErrorMessage(sInvalidOxMetricsFolderMessage)
            return false;
        }
        else {
            var oxmetricPath = oxConfig['oxmetricsFolder']; // /Applications/OxMetrics8/ox/bin/oxl /// l'utilsateur doit donc rentrer /Applications/OxMetrics8/ox/bin/oxl 
            if (!initPaths(oxmetricPath)) {
                console.log("!initPaths");
                vscode.window.showErrorMessage(sInvalidOxMetricsFolderMessage)
                return false;
            }
            console.log("success check oxmetrics");
            return true;
        }
    } catch (error) {
        console.log(error)
        return false;
    }
}

export function GetOxlPath(): string {
    // oxl.exe
    return s_oxlFullPath;
}
export function GetOxRunPath(): string {
    return s_oxRunFullPath;
}
export function GetOxDocFolder(): string {
    //C:\Program Files\OxMetrics8\ox\doc
    return s_oxDocFolderPath;
}
export function GetOxMetricsSrcFolder(): string {
    //C:\Program Files\OxMetrics8\ox\src
    return s_oxmetricsSrcFolder;
}
export function GetOxMetricsPath(): string {
    return s_oxmetricsFullPath;
}
export function quoteFileName(fileName: string, fixPathWindows: boolean = true): string {
    if (fixPathWindows)
        return '\"' + FixPathWindows(fileName) + '\"';
    else
        return '\"' + (fileName) + '\"';
}

export function IsInDev(): boolean {
    var IsInDevModel = vscode.workspace.getConfiguration('oxcode').inspect('isDev');
    if (IsInDevModel)
        return true;
    return false;
}
export function IsSignature(): boolean {
    var Completion = vscode.workspace.getConfiguration('oxcode').inspect('signature');
    if (Completion)
        return true;
    return false;
}
export function IsCompletion(): boolean {
    var Completion = vscode.workspace.getConfiguration('oxcode').inspect('completion');
    if (Completion)
        return true;
    return false;
}
export function GetOxLinter(flags?: any[]): ProcessInfo {
    var AddinConfig = vscode.workspace.getConfiguration('oxcode');
    var IsInDevModel = AddinConfig['isDev'];
    var oxlinter = s_linterExeFullPath;
    let oxlinterFlag = [];
    s_defaultIncludeFolder.forEach(element => {
        oxlinterFlag.push("--include=" + quoteFileName(element));
    });
    if (IsInDevModel)
        oxlinterFlag.push("--debug");// command = command + " --debug";
    if (flags) {
        flags.forEach(element => {
            oxlinterFlag.push(element)
        });
    }
    var prog: ProcessInfo = { FullProgramPath: oxlinter, flags: oxlinterFlag };
    return prog;
}