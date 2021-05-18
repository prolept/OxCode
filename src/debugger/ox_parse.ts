import fs = require('fs');

export interface BreakpointOx {
	filepath: string;
	filename: string;
	line: number;
	raw?: string;
	condition?: string;
	countCondition?: string;
	verified?: boolean

}
export interface OxVariable {
	local?: boolean
	name: string;
	valueStr: string;
	type: string;
	id: number;
	raw?: any;
}

export interface Thread {
	id: number;
	targetId: string;
	name?: string;
}

export interface Stack {
	level: number;
	address: string;
	function: string;
	fileName: string;
	file: string;
	line: number;
}

export interface Variable {
	name: string;
	valueStr: string;
	type: string;
	raw?: any;
}
 
 




export enum OxDebugCodeLine {
	Running,
	Showbreaks,
	Empty,
	Unknow,
	Message,
	Break,
	BreakNoFile,
	BreakPointSet,
	BreakPointDeleted
}
export enum OxDebugOxDebugLineResult {
	Unknow,
	Ok,
	Error
}
export class OxDebugLine {
	line: number;
	file: string;
	code: OxDebugCodeLine;
	result: OxDebugOxDebugLineResult;
	token: number;
	message?: string;

}
export enum OxDebugResult {
	Unknow,
	Ok,
	Error
}
export enum OxStd {
	stderr,
	stdout,
}
// export function IsAllOrEmpty(AllType: OxDebugCodeLine, lines: OxDebugLine[]): boolean {
// 	var res: boolean = true;
// 	for (let item of lines) {
// 		if (item.code != AllType) {
// 			res = false;
// 			return;
// 		}
// 	}
// 	return res;
// }

export function IsAtLeastOne(TypeToCheck: OxDebugCodeLine, lines: OxDebugLine[]): boolean {
	for (let item of lines) {
		if (item.code === TypeToCheck) {
			return true;
		}
	}
	return false;
}
export class OxDebugOutput {
	lines: OxDebugLine[];
	token: number;
	output: string;
	result: OxDebugResult;
	constructor() {
		this.lines = [];
	}
	isBreakStatement(): boolean {
		for (let el of this.lines) {
			if (el === null)
				continue;
			if (el.code === OxDebugCodeLine.Break)
				return true;
		};
		return false;
	}
	GetBreakLine(): OxDebugLine {
		for (let el of this.lines) {
			if (el === null)
				continue;
			if (el.code === OxDebugCodeLine.Break)
				return el;
		};
		return null;
	}
}
function FindFullPathFromFileName(filename: string, sourceDirectories: string[] = []): string {
	let result = null;
	sourceDirectories.forEach(directory => {

		var filetest = directory + "//" + filename;
		var stats = fs.statSync(filetest);
		if (stats) {
			result = filetest;
			return;
		}

	});
	return result;
}

function remove_linebreaks(str: string): string {
	return str.replace(/[\r\n]+/gm, "");
}

// public static readonly PROMPT = 'debug> ';

export function TreatSingleLine(output: string, token: number, sourceDirectories: string[] = []): OxDebugLine {
	let match = undefined;
	var cleanstr = remove_linebreaks(output.replace(/\(debug\)/g, "")).trim();  //il est possible d'avoir des lines breaks mal traités ?
	if (cleanstr === "") {
		var empty = {
			line: -1,
			file: "",
			code: OxDebugCodeLine.Empty,
			result: OxDebugOxDebugLineResult.Ok,
			token: token
		};
		return empty;
	}
	//parse --->  test.ox (6): break! ; 
	//            test.ox (6): message ...
	// const lintRegex = /(.*) \((\d+)\).*?:(.*)/g;

	const lintRegex = /(.*) \((\d+)\).*?:(.*) (.*)/g; 
	/* parse : C:/Users/mfall/Desktop/TestGdb/test.ox (9): func3 break!
	0 - C:/Users/mfall/Desktop/TestGdb/test.ox (9): func3 break!
	1 -	C:/Users/mfall/Desktop/TestGdb/test.ox
	2 - 9
	3 - 	func3   /// ---> to use somewhere ...
	4 - 	break!

	 c:/Users/mfall/Desktop/TestGdb/test.ox (33): breakpoint set
	0 - c:/Users/mfall/Desktop/TestGdb/test.ox (33): breakpoint set
	1 -	c:/Users/mfall/Desktop/TestGdb/test.ox
	2 - 33
	3 - 	breakpoint   /// ---> to use somewhere ...
	4 - 	set
	*/
	match = lintRegex.exec(cleanstr);// 

	if (match != null) {
		var filepath = String(match[1]);
		const line = Number(match[2]);
		if (line < 0) return null;
		if (!filepath.includes("\\") && !filepath.includes("/")) {
			var fullpath = FindFullPathFromFileName(filepath, sourceDirectories);
			if (fullpath != null)
				filepath = fullpath;
			else
				console.log("full path not found");
			// debugger;
			// so it is not a full path (for oxo compiled with -d 32 bits flags)
			// should try to find the file from arguments...
			// for the moment try without oxo files
			// debugger;
		}
		const message = String(match[4]).trim();
	 
		if(message === "break!") // C:/Users/mfall/Desktop/TestGdb/test.ox (9): func3 break!
		{
			var res = {
				line: line,
				file: filepath,
				message: message.trim(),
				code:   OxDebugCodeLine.Break,
				result: OxDebugOxDebugLineResult.Ok,
				token: token
			};
			return res;
		}
		else if(message === "set") // c:/Users/mfall/Desktop/TestGdb/test.ox (33): breakpoint set
		{
			var res = {
				line: line,
				file: filepath,
				message: message.trim(),
				code:  OxDebugCodeLine.BreakPointSet,
				result: OxDebugOxDebugLineResult.Ok,
				token: token
			};
			return res;
		}
		else if(message === "deleted") // C:/Users/mfall/Desktop/TestGdb/test.ox (36): breakpoint deleted
		{
			var res = {
				line: line,
				file: filepath,
				message: message.trim(),
				code:  OxDebugCodeLine.BreakPointDeleted,
				result: OxDebugOxDebugLineResult.Ok,
				token: token
			};
			return res;
		}
		else
		{
			var res = {
				line: line,
				file: filepath,
				message: message.trim(),
				code:  OxDebugCodeLine.Running,
				result: OxDebugOxDebugLineResult.Ok,
				token: token
			};
			return res;
		}
		 
	}
	//  (no file available)/parse --->  (6): break! ; 
	const BreakNoFileRegex = /\((\d+)\).*?: break!/g;
	match = BreakNoFileRegex.exec(cleanstr);// 
	if (match != null) {
		var fullmess = String(match[0]);
		const line = Number(match[1]);
		if (line < 0) return null;
		var res3 = {
			line: line,
			file: "",
			message: "break!",
			code: OxDebugCodeLine.BreakNoFile,
			result: OxDebugOxDebugLineResult.Ok,
			token: token
		};
		return res3;
	}
	const RegexShowBreaks = /(.*) \((\d+)\).*?/g; 	// /parse --->  test.ox (6)
	match = RegexShowBreaks.exec(cleanstr);
	if (match != null) {
		var filepath = String(match[1]);
		const line = Number(match[2]);
		if (line < 0) return null;
		var res2 = {
			line: line,
			file: filepath,
			code: OxDebugCodeLine.Showbreaks,
			result:OxDebugOxDebugLineResult.Ok,
			token: token
		};

		return res2;
	}
	if (cleanstr.length > 0) {
		var msg = {
			line: -1,
			file: "",
			result: OxDebugOxDebugLineResult.Ok,
			message: cleanstr.trim(),
			code: OxDebugCodeLine.Message,
			token: token
		};
		return msg;
	}
	debugger;
	var nottreated = {
		line: -1,
		file: "",
		result: OxDebugOxDebugLineResult.Error,
		code: OxDebugCodeLine.Unknow,
		token: token
	};
	return nottreated;
}