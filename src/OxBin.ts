
/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');
import { FixPathWindows, DevLog } from './util';
import cp = require('child_process');
var AdmZip = require('adm-zip');

const platform = process.platform; // possible node values 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
export function IsMac(): Boolean {
    return platform == "darwin";
    // return IsMacOS;
}
export function IsWindows(): Boolean {
    return platform == "win32";
    // return IsMacOS;
}
export function IsLinux(): Boolean {
    return platform == "linux";
    // return bIsLinux;
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
        DevLog("initPaths..");
        var oxl;
        if (IsMac())
            oxl = path.resolve(oxmetricsFolder, './ox/bin/oxl'); // "C:\Program Files\OxMetrics8\ox\bin64\oxl.exe"
        else if (IsLinux())
            oxl = path.resolve(oxmetricsFolder, './ox/bin64/oxl');
        else
            oxl = path.resolve(oxmetricsFolder, './ox/bin64/oxl.exe'); // "C:\Program Files\OxMetrics8\ox\bin64\oxl.exe"
        s_oxlFullPath = oxl;
        if (!fs.existsSync(s_oxlFullPath)) {
            var error = true;

            if (IsWindows) {
                //possible oxl 32 bits only on windows ...
                oxl = path.resolve(oxmetricsFolder, './ox/bin/oxl.exe');
                if (fs.existsSync(oxl))
                    error = false;
                s_oxlFullPath = oxl;
            }
            if (error) {
                DevLog("can not find oxl");
                vscode.window.showErrorMessage("The extension cannot find the ox console in the oxmetrics folder.")
                return false;
            }

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
        else if (IsLinux()) {
            s_oxRunFullPath = path.resolve(oxmetricsFolder, './ox/bin64/oxrun'); // 
            s_oxmetricsFullPath = path.resolve(oxmetricsFolder, './bin64/oxmetrics'); //
        }
        else {
            s_oxRunFullPath = path.resolve(oxmetricsFolder, './ox/bin64/OxRun.exe'); // C:\Program Files\OxMetrics8\ox\bin64\oxrun.exe
            s_oxmetricsFullPath = path.resolve(oxmetricsFolder, './bin64/oxmetrics.exe'); //C:\Program Files\OxMetrics8\bin64\oxmetrics.exe

        }
        //Add OX8PATHS  environement to linter search paths.
        if (process.env.OX8PATH) {
            var paths = process.env.OX8PATH;
            var asplitted = paths.split(";");
            asplitted.forEach(element => {
                s_defaultIncludeFolder.push(element);
                DevLog("add path from env : ", element);
            });
        }
        DevLog("init s_oxRunFullPath :", s_oxRunFullPath);
        DevLog("init s_oxmetricsFullPath :", s_oxmetricsFullPath);
        let optionsAstyle = " --pad-header --break-blocks  --pad-oper --style=java --delete-empty-lines --unpad-paren ";
        var oxConfig = vscode.workspace.getConfiguration('oxcode');
        if (!oxConfig.has('astyleOptions') || oxConfig['astyleOptions'] == null || oxConfig['astyleOptions'] == "")
            oxConfig.update("astyleOptions", optionsAstyle, vscode.ConfigurationTarget.Global);
        return true;
    } catch (error) {
        DevLog(error);
        DevLog("The given folder path oxmetrics is invalid");
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
            DevLog("not an absolute path " + oxlinter.FullProgramPath);
            return false;
        }
        var stdout = cp.execFileSync(oxlinter.FullProgramPath, oxlinter.flags).toString();
        var regex = /(\d+\.)(\d+\.)(\d+)/g;
        var version = stdout.match(regex);
        var correctVersion = "0.0.19";
        if (version[0] != correctVersion)
            return false;
        DevLog("correct linter version :" + correctVersion);
        return true;
    } catch (error) {
        DevLog(error);
        return false;
    }

}
export function CheckOxMetricsIsOk(extensionPath: string): boolean {

    try {
        var oxConfig = vscode.workspace.getConfiguration('oxcode');
        if (oxConfig == null)
            return false;
        DevLog("oxmetricsFolder inside: " + oxConfig["oxmetricsFolder"]);

        let oxlinterPath: string;
        let pathExtension = extensionPath;
        if (IsMac())
            oxlinterPath = path.resolve(pathExtension, "./bin/oxlinter");
        else if (IsLinux())
            oxlinterPath = path.resolve(pathExtension, "./bin/linux/OxLinter");
        else // windows
            oxlinterPath = FixPathWindows(path.resolve(pathExtension, "./bin/win/OxLinter.exe"));

        if (!fs.existsSync(oxlinterPath) && (IsMac() || IsLinux())) {
            DevLog("try to extract oxlinter.zip");
            // si le package est fait sur windows ca doit ettre un zip à déziper 
            var spathzip = IsMac() ? "./bin/oxlinter.zip" : "./bin/linux/oxlinterlinux.zip";
            var zipfile = path.resolve(pathExtension, spathzip);
            if (!fs.existsSync(zipfile)) {
                DevLog("oxlinter.zip does not exist");
                vscode.window.showErrorMessage("The extension cannot find oxlinter.zip, please re-install the extension.")
                return false;
            }
            DevLog("oxlinter.zip exist");
            var spathbin = IsMac() ? "./bin/" : "./bin/linux/";
            var targetdir = path.resolve(pathExtension, spathbin);
            var zip = new AdmZip(zipfile);
            zip.extractAllTo(targetdir, true);//synchrone + force replace
            if (!fs.existsSync(oxlinterPath)) {
                DevLog("Mac/unix Os code:[JSQ5]");
                vscode.window.showErrorMessage("The extension cannot find oxlinter code:[JSQ5].")
                return false;
            }
            else {
                // change permission
                fs.chmodSync(oxlinterPath, 0o777);
                DevLog("success extracting oxlinter");
            }
        }
        DevLog("init(0) oxlinterPath :", oxlinterPath);
        if (!IsMac && !fs.existsSync(oxlinterPath)) {
            DevLog("Problem  oxlinterPath not found...", oxlinterPath);
            return false;
        }
        s_linterExeFullPath = oxlinterPath;
        DevLog("init(0) s_linterExeFullPath :", s_linterExeFullPath);
        if (!VerifyLinterVersion()) {
            DevLog("invalid linter version");
            vscode.window.showErrorMessage("Incorrect OxLinter version, please re-install the extension");
            return false;
        }
        // it is tricky to update setting because methods are asynchrones so raise an error and let the user enter the correct path... 
        if (!oxConfig.has('oxmetricsFolder') || oxConfig['oxmetricsFolder'] == null) {  // C:\Program Files\OxMetrics8\ox\bin64\oxl.exe ou /Applications/OxMetrics8/ox/bin/oxl
            DevLog("invalid oxmetrics setting [KDSM]");
            vscode.window.showErrorMessage(sInvalidOxMetricsFolderMessage)
            return false;
        }
        else {
            var oxmetricPath = oxConfig['oxmetricsFolder']; // /Applications/OxMetrics8/ox/bin/oxl /// l'utilsateur doit donc rentrer /Applications/OxMetrics8/ox/bin/oxl 
            if (!initPaths(oxmetricPath)) {
                DevLog("!initPaths");
                vscode.window.showErrorMessage(sInvalidOxMetricsFolderMessage)
                return false;
            }
            DevLog("success check oxmetrics");
            return true;
        }
    } catch (error) {
        DevLog(error)
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
export function GetOxIncludeFolders(): string[] {
    return s_defaultIncludeFolder;
}

export function quoteFileName(fileName: string, fixPathWindows: boolean = true): string {
    if (fixPathWindows)
        return '\"' + FixPathWindows(fileName) + '\"';
    else
        return '\"' + (fileName) + '\"';
}

var bInDev: boolean
var bInDevInitialized: boolean
export function IsInDev(): boolean {
    if (bInDevInitialized) return bInDev;
    else {
        bInDev = vscode.workspace.getConfiguration('oxcode').get('isDev');
        bInDevInitialized = true;
        return bInDev;
    }


}
export function IsSignature(): boolean {
    return vscode.workspace.getConfiguration('oxcode').get('signature');

}
export function IsCompletion(): boolean {
    return vscode.workspace.getConfiguration('oxcode').get('completion');

}
export function GetOxLinter(flags?: any[]): ProcessInfo {
    var AddinConfig = vscode.workspace.getConfiguration('oxcode');
    var IsInDevModel = AddinConfig['isDev'];
    let oxlinter: string = s_linterExeFullPath;
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
    DevLog("oxlinter in GetOxLinter: ", oxlinter);
    var prog: ProcessInfo = { FullProgramPath: oxlinter, flags: oxlinterFlag };
    DevLog("prog in GetOxLinter: ", prog);
    return prog;
}