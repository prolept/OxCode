
/*---------------------------------------------------------
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
import vscode = require('vscode');
import cp = require('child_process');

export function getWorkspaceFolderPath(fileUri?: vscode.Uri): string {
	if (fileUri) {
		let workspace = vscode.workspace.getWorkspaceFolder(fileUri);
		if (workspace) {
			return workspace.uri.fsPath;
		}
	}

	// fall back to the first workspace
	let folders = vscode.workspace.workspaceFolders;
	if (folders && folders.length) {
		return folders[0].uri.fsPath;
	}
}
export function IsCorrectOxFile(): Boolean {
	if (!vscode.window.activeTextEditor) {
		return false;
	}
	var editor = vscode.window.activeTextEditor;
	if (!editor) return false;
	var document = editor.document;
	if (document.languageId !== 'Ox') {
		return false;
	}
	return true;
}
export function FixPathWindows(cwd: string): string {
	// Make the drive letter uppercase on Windows (see #9448)
	if (process.platform === 'win32' && cwd && cwd[1] === ':') {
		return cwd[0].toUpperCase() + cwd.substr(1);
	}
	return cwd;
}


export function byteOffsetAt(document: vscode.TextDocument, position: vscode.Position): number {
	let offset = document.offsetAt(position);
	let text = document.getText();
	return Buffer.byteLength(text.substr(0, offset));
}

export function killProcess(p: cp.ChildProcess) {
	if (p) {
		try {
			p.kill();
		} catch (e) {
			console.log('Error killing process: ' + e);
		}
	}
}


export interface OxIssue {
	Severity: string;
	category: string;
	startLine: number;
	endLine: number;
	startcharacter: number;
	endcharacter: number;
	file: string;
	generalmessage: string;
	detailmeassage: string;
}

export interface OxOutlineDeclaration {
	functionName: string;
	symboltype: string;
	startLine: number;
	endLine: number;
	startcharacter: number;
	endcharacter: number;
	classeName: string;
}
export interface OxOImplementation {
	FunctionName: string;
	symboltype: string;
	startLine: number;
	endLine: number;
	startcharacter: number;
	endcharacter: number;
	file: string;
	prototype: string;

}
export function getKeyForLru(word: string, document: vscode.TextDocument): string {
	let key = word + document.fileName.replace(/\s/g, "");
	return key;
}
export function isPositionInString(document: vscode.TextDocument, position: vscode.Position): boolean {
	let lineText = document.lineAt(position.line).text;
	let lineTillCurrentPosition = lineText.substr(0, position.character);
	// Count the number of double quotes in the line till current position. Ignore escaped double quotes
	let doubleQuotesCnt = (lineTillCurrentPosition.match(/\"/g) || []).length;
	let escapedDoubleQuotesCnt = (lineTillCurrentPosition.match(/\\\"/g) || []).length;
	doubleQuotesCnt -= escapedDoubleQuotesCnt;
	return doubleQuotesCnt % 2 === 1;
}

export function getExtensionCommands(): any[] {
	var extensionId = "Prolept.oxcode" //publisher.name
	const pkgJSON = vscode.extensions.getExtension(extensionId).packageJSON;
	if (!pkgJSON.contributes || !pkgJSON.contributes.commands) {
		return;
	}
	const extensionCommands: any[] = vscode.extensions.getExtension(extensionId).packageJSON.contributes.commands.filter((x: any) => x.command !== 'ox.show.commands');
	return extensionCommands;
}

export const oxKeywords: string[] = [
	'break',
	'case',
	'const',
	'continue',
	'default',
	'do',
	'else',
	'fakeoxkeywordfortesting',
	'for',
	'goto',
	'if',
	'import',
	'return',
	'select',
	'struct',
	'while',
	'switch',
	'type',
	'var',

];
export const oxStd: string[] = [
	'acf', 'acos', 'aggregatec', 'aggregater', 'any', 'arglist', 'asin', 'atan', 'atan2', 'bessel', 'betafunc', 'binand', 'bincomp', 'binor', 'binpop', 'binomial', 'binvec', 'binxor', 'cabs', 'cdiv', 'ceil', 'cerf', 'cexp', 'chdir', 'choleski', 'classname', 'clog', 'clone', 'cmul', 'columns', 'constant', 'correlation', 'cos', 'cosh', 'countc', 'countr', 'csqrt', 'cumprod', 'cumsum', 'cumulate', 'date', 'dawson', 'dayofcalendar', 'dayofeaster', 'dayofmonth', 'dayofweek', 'decldl', 'decldlband', 'declu', 'decmgs', 'decqr', 'decqrmul', 'decqrupdate', 'decschur', 'decschurgen', 'decsvd', 'deletec', 'deleteifc', 'deleteifr', 'deleter', 'denschi', 'densf', 'densn', 'denst', 'determinant', 'dfft', 'diag', 'diagcat', 'diagonal', 'diagonalize', 'diff', 'diff0', 'discretize', 'dropc', 'dropr', 'eigen', 'eigensym', 'eigensymgen', 'eprint', 'erf', 'exclusion', 'exit', 'exp', 'expint', 'fabs', 'factorial', 'fclose', 'feof', 'fflush', 'fft', 'fft1d', 'find', 'findsample', 'floor', 'fmod', 'fopen', 'format', 'fprint', 'fprintln', 'fread', 'fremove', 'fscan', 'fseek', 'fsize', 'ftime', 'fuzziness', 'fwrite', 'gammafact', 'gammafunc', 'getcwd', 'getenv', 'getfiles', 'getfolders', 'hyper_2F1', 'idiv', 'imod', 'insertc', 'insertr', 'intersection', 'invert', 'inverteps', 'invertgen', 'invertsym', 'isaddress', 'isarray', 'isclass', 'isdotfeq', 'isdotinf', 'isdotmissing', 'isdotnan', 'isdouble', 'iseq', 'isfeq', 'isfile', 'isfunction', 'isint', 'ismatrix', 'ismember', 'ismissing', 'isnan', 'isstatic', 'isstring', 'lag', 'lag0', 'limits', 'loadmat', 'loadsheet', 'log', 'log10', 'logdet', 'loggamma', 'lower', 'max', 'maxc', 'maxcindex', 'maxr', 'meanc', 'meanr', 'min', 'minc', 'mincindex', 'minr', 'moments', 'nans', 'norm', 'nullspace', 'ols2c', 'ols2r', 'olsc', 'olsr', 'ones', 'outer', 'oxfilename', 'oxprintlevel', 'oxrunerror', 'oxversion', 'oxversionispro', 'oxwarning', 'peak', 'periodogram', 'polydiv', 'polyeval', 'polygamma', 'polymake', 'polymul', 'polyroots', 'print', 'println', 'probchi', 'probf', 'probn', 'probt', 'prodc', 'prodr', 'pow', 'quanchi', 'quanf', 'quann', 'quant', 'quantilec', 'quantiler', 'range', 'rank', 'ranloopseed', 'rann', 'ranseed', 'ranu', 'reflect', 'replace', 'reshape', 'reversec', 'reverser', 'round', 'rows', 'savemat', 'savesheet', 'scan', 'selectc', 'selectifc', 'selectifr', 'selectr', 'selectrc', 'setbounds', 'setdiagonal', 'setlower', 'setupper', 'shape', 'sin', 'sinh', 'sizec', 'sizeof', 'sizer', 'sizerc', 'solveldl', 'solveldlband', 'solvelu', 'solvetoeplitz', 'sortbyc', 'sortbyr', 'sortc', 'sortcindex', 'sortr', 'spline', 'sprint', 'sprintbuffer', 'sqr', 'sqrt', 'sscan', 'standardize', 'strfind', 'strfindr', 'strifind', 'strifindr', 'strlwr', 'strtrim', 'strupr', 'submat', 'sumc', 'sumr', 'sumsqrc', 'sumsqrr', 'systemcall', 'tailchi', 'tailf', 'tailn', 'tailt', 'tan', 'tanh', 'thinc', 'thinr', 'time', 'timeofday', 'timer', 'timespan', 'timestr', 'timing', 'today', 'toeplitz', 'trace', 'trunc', 'truncf', 'union', 'unique', 'unit', 'unvech', 'upper', 'va_arglist', 'varc', 'variance', 'varr', 'vec', 'vech', 'vecindex', 'vecr', 'vecrindex', 'zeros']