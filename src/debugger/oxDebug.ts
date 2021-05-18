/*---------------------------------------------------------
 * Prolept 
 * Inspired by  : https://github.com/WebFreak001/code-debug and https://github.com/microsoft/vscode-mock-debug
 * MIT Licence
 *--------------------------------------------------------*/

import {
	Logger, logger,
	LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint, Variable
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import * as DebugAdapter from 'vscode-debugadapter';
import * as ChildProcess from "child_process";
import { OxDebugLine, OxDebugOutput, OxDebugCodeLine, TreatSingleLine, OxDebugResult, OxStd, BreakpointOx, Stack, OxVariable, IsAtLeastOne } from './ox_parse';



export interface regexMess {
	token: number;
	message: string;
}
/**
 * This interface describes the mock-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the mock-debug extension.
 * The interface should always match this schema.
 */
// interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
// 	/** An absolute path to the "program" to debug. */
// 	program: string;
// 	/** Automatically stop target after launch. If not specified, target does not stop. */
// 	stopOnEntry?: boolean;
// 	/** enable logging the Debug Adapter Protocol */
// }

export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	cwd: string;
	target: string;
	oxdpath: string;
	debugger_args: string[];
	source_directories: string[];
	showOxOutput: boolean;
	showDevDebugOutput: boolean;
}


export class OxDebugSession extends LoggingDebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;

	// a Mock runtime (or debugger)
	// private _runtime: OxDebugRuntime;
	private _variableHandles = new Handles<string>();
	// private _configurationDone = new Subject();
	// private _cancelationTokens = new Map<number, boolean>();
	// private _isLongrunning = new Map<number, boolean>();

	printCalls: boolean;
	// debugOutput: boolean;
	protected launchError(err: any) {
		this.handleMsg(OxStd.stderr, "Could not start debugger process, does the program exist in filesystem?\n");
		this.handleMsg(OxStd.stderr, err.toString() + "\n");
		this.quitEvent();
	}



	//region RUNTIME
	protected buffer: string;
	protected errbuf: string;
	sourceFilesDirectories: string[];
	protected lastRecordedBreakLine: OxDebugLine;
	debugReady: boolean = false;
	firstcall: boolean = true;
	AcceptSameBreak: boolean = false;
	showOxOutput: boolean = true;
	currentToken: number = 1;
	IsBlockuniqflagSendCommandTestFlag: boolean = false;
	protected handlers: { [index: number]: (info: OxDebugOutput) => any; } = {};

	protected process: ChildProcess.ChildProcess;
	public procEnv: any;
	showDevDebugOutput: boolean = false;
	// skipNextBreak: boolean = false;

	//ENREGION
	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super()
		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(true);

		// this._runtime = new OxDebugRuntime();
		this.sourceFilesDirectories = [];

		this.on("launcherror", this.launchError.bind(this));
		// setup event handlers
		this.on('stopOnEntry', () => {
			this.sendEvent(new StoppedEvent('entry', OxDebugSession.THREAD_ID));
		});
		this.on('stopOnStep', () => {
			this.sendEvent(new StoppedEvent('step', OxDebugSession.THREAD_ID));
		});
		this.on('stopOnBreakpoint', () => {
			this.sendEvent(new StoppedEvent('breakpoint', OxDebugSession.THREAD_ID));
		});

		// this._runtime.on("msg", this.handleMsg.bind(this));
		// this._runtime.on('stopOnDataBreakpoint', () => {
		// 	this.sendEvent(new StoppedEvent('data breakpoint', MockDebugSession.THREAD_ID));
		// });
		// this._runtime.on('stopOnException', () => {
		// 	this.sendEvent(new StoppedEvent('exception', MockDebugSession.THREAD_ID));
		// });
		// this._runtime.on('breakpointValidated', (bp: MockBreakpoint) => {
		// 	this.sendEvent(new BreakpointEvent('changed', <DebugProtocol.Breakpoint>{ verified: bp.verified, id: bp.id }));
		// });
		// this._runtime.on('output', (text, filePath, line, column) => {
		// 	const e: DebugProtocol.OutputEvent = new OutputEvent(`${text}\n`);
		// 	e.body.source = this.createSource(filePath);
		// 	e.body.line = this.convertDebuggerLineToClient(line);
		// 	e.body.column = this.convertDebuggerColumnToClient(column);
		// 	this.sendEvent(e);
		// });

		this.on("debug-ready", this.Init.bind(this));
		this.on("quit", this.quitEvent.bind(this));
		this.on("thread-created", this.threadCreatedEvent.bind(this));
		this.on("thread-exited", this.threadExitedEvent.bind(this));
	}

	log(msg: string) {
		if (this.showDevDebugOutput)
			this.handleMsg(OxStd.stderr, msg[msg.length - 1] == '\n' ? msg : (msg + "\n"));
	}

	protected Init() {
		this.sendEvent(new InitializedEvent())
	}
	protected quitEvent() {
		this.sendEvent(new TerminatedEvent());//The ‘terminate’ request is sent from the client to the debug adapter in order to give the debuggee a chance for terminating itself.

		// if (this.serverPath)
		// 	fs.unlink(this.serverPath, (err) => {
		// 		console.error("Failed to unlink debug server");
		// 	});
	}
	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {

		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = false;

		// make VS Code to show a 'step back' button
		response.body.supportsStepBack = false;

		// make VS Code to support data breakpoints
		response.body.supportsDataBreakpoints = false;

		// make VS Code to support completion in REPL
		response.body.supportsCompletionsRequest = false;
		response.body.completionTriggerCharacters = [".", "["];

		// make VS Code to send cancelRequests
		response.body.supportsCancelRequest = false;

		// make VS Code send the breakpointLocations request
		response.body.supportsBreakpointLocationsRequest = false; //TODO TRUE

		/**
	   * The debug adapter supports a 'format' attribute on the stackTraceRequest, variablesRequest, and evaluateRequest.
	   */
		// response.body.supportsValueFormattingOptions = true; no support by vscode 


		this.sendResponse(response);

		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		// this.sendEvent(new InitializedEvent());
	}

	/**
	 * Called at the end of the configuration sequence.
	 * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
	 */
	// protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
	// 	super.configurationDoneRequest(response, args);

	// 	// notify the launchRequest that configuration has finished
	// 	// this._configurationDone.notify();
	// }

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments) {

		this.showOxOutput = !!args.showOxOutput;
		this.showDevDebugOutput = !!args.showDevDebugOutput;

		if (args.debugger_args === null) {
			args.debugger_args = [];
		}
		if (args.source_directories === null) {
			args.source_directories = [];
		}
		if (args.oxdpath == null || args.cwd == null || args.target == null) {
			this.sendErrorResponse(response, 1, "Invalid arguments");
			return;
		}

		this.startRuntime(args.oxdpath, args.target, args.cwd, args.debugger_args, args.source_directories);

		this.sendResponse(response);
	}

	startRuntime(oxlipath: string, file: string, cwd: string, othersargs: string[], sourceDirectories: string[]) {
		var arg: string[] = [];
		arg.push("-d");
		if (othersargs != null) {
			othersargs.forEach(el => {
				arg.push(el);
			});
		}
		this.sourceFilesDirectories = sourceDirectories;
		arg.push(file);
		this.log("arguments to oxd : " + arg.toString());
		this.log("oxlipath : " + oxlipath);
		this.process = ChildProcess.spawn(oxlipath, arg, { cwd: cwd });
		this.process.stdout.on("data", this.stdout.bind(this));
		this.process.stderr.on("data", this.stderr.bind(this));
		this.process.on("exit", (() => { this.emit("quit"); }).bind(this));
		this.process.on("error", ((err) => { this.emit("launcherror", err); }).bind(this));
		this.once("debug-ready", () => { this.log("DEBUG READY EMITTED"); this.debugReady = true; });
		this.FirstStart().then(() => {
			this.emit("debug-ready");
		}, err => {
			this.log("error " + err.toString());

		});

	}
	FirstStart(): Thenable<boolean> {
		return new Promise((resolve, reject) => {
			this.once("ui-break-done", (): void => {
				this.log("Running executable");
				this.sendCommandToOx("show").then((info) => { //Unknown debug command but show current break..
					if (info.isBreakStatement())
						resolve(true);
					else
						reject();
				},
					() => { resolve(false); });
			});
		});

	}


	//#region Output

	stdout(data) {

		if (typeof data == "string")
			this.buffer += data;
		else
			this.buffer += data.toString("utf8");

		const lintRegex = /<@ox token=(\d+)>([\s\S]+?)<\/@ox token=(\1)>/g;
		// <@ox token=5>test.ox (6): break! </@ox token=5>
		// analysed as: 
		// match[0] = <@ox token=5>test.ox (6): break! </@ox token=5>
		// match[1] = 5 
		// match[2] = test.ox (6): break!
		// match[3] = 5

		var match = lintRegex.exec(this.buffer);
		if (match != null) {

			const res = { token: Number(match[1]), message: match[2] };
			if (Number(match[1]) != Number(match[3])) {
				debugger;
			}
			this.buffer = this.buffer.replace(match[0], ""); // clean buffer
			if (this.showOxOutput) {
				this.handleMsg(OxStd.stdout, res.message);
			}
			this.onOutput(res);
		}
		else {
			if (this.firstcall) {
				if (this.buffer.includes("break!")) {
					const res = { token: Number(0), message: this.buffer };
					this.onOutput(res);
					this.buffer = "";
				}
			}
			else {
				if (this.showOxOutput) {
					this.handleMsg(OxStd.stdout, "BUFFER >>>>: " + data.toString("utf8"));
				}
			}
		}
	}

	stderr(data) {
		this.handleMsg(OxStd.stderr, data);
		if (typeof data == "string")
			this.errbuf += data;
		else
			this.errbuf += data.toString("utf8");
	}
	parseOxOutput(output: regexMess): OxDebugOutput {
		var lines = <string[]>output.message.split(/\r?\n/);
		let OxDebugLines: OxDebugLine[] = [];
		lines.forEach(line => {
			var res = TreatSingleLine(line, output.token, this.sourceFilesDirectories);
			if (res != null)
				OxDebugLines.push(res);
		});
		if (OxDebugLines.length === 0)
			return null;
		let isOneNotNull: boolean;
		OxDebugLines.forEach(line => {
			if (line.code != OxDebugCodeLine.Empty && line.code != OxDebugCodeLine.Unknow)
				isOneNotNull = true;
		});
		//only keep not null
		if (isOneNotNull) {
			let OxDebugLines2: OxDebugLine[] = [];
			OxDebugLines.forEach(line => {
				if (line.code != OxDebugCodeLine.Empty && line.code != OxDebugCodeLine.Unknow)
					OxDebugLines2.push(line);
			});
			OxDebugLines = OxDebugLines2;
		}
		let res = new OxDebugOutput;
		res.lines = OxDebugLines;
		res.token = output.token;
		res.output = output.message;
		if (res.lines.length > 0)
			res.result = OxDebugResult.Ok;
		else
			res.result = OxDebugResult.Error;
		return res;
	}


	onOutput(lines: regexMess) {
		// this.log(`onOutput  token: ${lines.token} message: ` + lines.message);
		const parsed = this.parseOxOutput(lines);
		let handled = false;
		if (parsed !== null) {
			if (parsed.token !== undefined) {
				if (this.handlers[parsed.token]) {
					this.handlers[parsed.token](parsed); // le Handle qui correspond a l'appel (sendcommand) qui a provoqué l'output
					delete this.handlers[parsed.token];
					handled = true;
					if (parsed.isBreakStatement()) { //TODO CHANGE PR NE PAS emit si c'est le meme break point exactemnt
						this.log("Update last recorded Line");

						if (!this.debugReady)
							this.emit("debug-ready");

						var line = parsed.GetBreakLine();
						line.token = -1;

						if (this.lastRecordedBreakLine == null) {
							line.token = -1;
							this.lastRecordedBreakLine = line;
							this.emit("stopOnStep", parsed);
						}
						else if ((JSON.stringify(this.lastRecordedBreakLine) != JSON.stringify(line)) || this.AcceptSameBreak ) { //prevent infinite loop on same breakpoints 
							line.token = -1;
							this.lastRecordedBreakLine = line;
							this.emit("stopOnStep", parsed);
							if(this.AcceptSameBreak)
								this.AcceptSameBreak = false;

						}
					}
					// else if (this.IsAtLeastOne(OxDebugCodeLine.BreakNoFile, parsed.lines)) {
					// 	this.log("No file available");
					// 	this.emit("stopOnStep", parsed); // OxDebug --> VsCode 
					// }

				}
				else {
					this.log(`this.handlers[${parsed.token}]  == FAUX `);
					if (this.firstcall && (parsed.isBreakStatement())) {
						this.firstcall = false;
						handled = true;
						this.lastRecordedBreakLine = parsed.GetBreakLine();
						this.lastRecordedBreakLine.token = -1;
						this.log("Oxli -> App: first breakpoint ");
						if (!this.debugReady)
							this.emit("debug-ready");
						this.log("emit( stopOnEntry ) ");
						this.emit("stopOnEntry");
					}
				}
			}
			else {
				debugger;
			}

		}
		if (!handled) {
			if (this.showOxOutput) {
				this.handleMsg(OxStd.stdout, "Unhandled: " + lines);
			}


			// debugger;
		}
	}
	//#endregion 



	// Supports 256 threads.
	protected threadAndLevelToFrameId(threadId: number, level: number) {
		return level << 8 | threadId;
	}
	protected frameIdToThreadAndLevel(frameId: number) {
		return [frameId & 0xff, frameId >> 8];
	}


	//#region IO
	sendCommandToOx(raw: string, token: number = -1): Thenable<OxDebugOutput> {
		this.currentToken++;
		return new Promise((resolve, reject) => {
			const sel = this.currentToken;
			this.handlers[sel] = (node: OxDebugOutput) => {
				if (node && node.result === OxDebugResult.Ok) {
					resolve(node);
				}
				else {
					debugger;
					reject(node);
				}
			};

			if (!this.IsBlockuniqflagSendCommandTestFlag) {
				this.IsBlockuniqflagSendCommandTestFlag = true;
				var numStr = sel.toString();
				this.log(`send command ${numStr}  ` + raw);
				this.write(numStr + " " + raw, () => {
					this.IsBlockuniqflagSendCommandTestFlag = false;
				});
			}
			else {
				this.log(`Tentative d'ecrire simulatenement, message ${raw} !!!!!!!`);
				debugger;
			}
		});


	}
	write(data, cb) {
		if (!this.process.stdin.write(data + "\n")) {
			this.process.stdin.once('drain', cb);
		} else {
			process.nextTick(cb);
		}
	}

	writeRaw(raw: string): void {
		this.process.stdin.write(raw + "\n");
	}

	sendUserInput(command: string): Thenable<any> {
		return this.sendCommandToOx(command);
	}

	//#endregion


	//#region Breakpoints 

	async testperso(args: DebugProtocol.SetBreakpointsArguments): Promise<DebugAdapter.Breakpoint[]> {
		// debugger;
		var filepath = args.source.path;
		var name = args.source.name;
		const finalBrks = [];
		for (let i = 0; i < args.breakpoints.length; i++) {
			const brk = args.breakpoints[i];
			const res = await this.addBreakPoint({ filepath: filepath, filename: name, line: brk.line })
			if (res[0]) // if success
			{
				finalBrks.push(new DebugAdapter.Breakpoint(true, res[1].line), args.source);
				this.log(`OK breakpoint SET ${res[1].line} - ${res[1].filename}`);
			} else {

				finalBrks.push(new DebugAdapter.Breakpoint(false, res[1].line), args.source);
				this.log(`FALSE breakpoint SET ${res[1].line} - ${res[1].filename}`);
			}
		}
		return finalBrks;

	}
	addBreakPoint(breakpoint: BreakpointOx): Thenable<[boolean, BreakpointOx]> {
		return new Promise((resolve, reject) => {
			this.log("addBreakPoint");
			let location = "";
			const newBrk = {
				filename: breakpoint.filename,
				line: breakpoint.line,
				filepath: breakpoint.filepath
			};
			location += '"' + breakpoint.filename + '":' + breakpoint.line;
			this.log("break " + location);
			this.sendCommandToOx("break " + location).then((result) => {
				if (IsAtLeastOne(OxDebugCodeLine.BreakPointSet, result.lines)) {
					this.log(" OK SET #break " + location);
					resolve([true, newBrk]);
				}
				else {
					debugger;
					reject([false, newBrk]);
				}
			}, () => { debugger; reject; });
		});

	}

	removeBreakPoint(breakpoint: BreakpointOx): Thenable<boolean> {
		return new Promise((resolve, reject) => {
			this.log("removeBreakPoint");
			this.sendCommandToOx(`clear  "${breakpoint.filename}":${breakpoint.line}`).then((result) => {
				if (IsAtLeastOne(OxDebugCodeLine.BreakPointDeleted, result.lines)) {
					this.log(" OK deleted breakpoint #break");
					resolve(true);
				}
				else {
					debugger;
					resolve(false);
				}
			});
		});
	}
	async serialclean(args: BreakpointOx[]): Promise<boolean> {
		return new Promise((resolve, reject) => {
			for (let i = 0; i < args.length; i++) {
				const brk = args[i];
				const res = this.removeBreakPoint(brk);
			}

			resolve(true);
		});
	}

	clearBreakpoints(sourcefile: string): Thenable<boolean> {
		//remove all breakpoints for a source file

		this.log("clearBreakpoints");
		return new Promise((resolve, reject) => {
			this.sendCommandToOx("info breakpoints").then((result) => {
				if (result === null) {
					debugger;
					resolve(false);
				}
				else if (result.lines.length === 1 && result.lines[0].code === OxDebugCodeLine.Empty)
					resolve(true);
				else if (result.lines.length === 1 && result.lines[0].code === OxDebugCodeLine.Message)
					resolve(true);
				else if (result.lines.length > 1) {
					const brps: BreakpointOx[] = [];
					for (let i = 0; i < result.lines.length; i++) {
						const el = result.lines[i];
						if (el.code === OxDebugCodeLine.Showbreaks) {
							const Brk = {
								filename: el.file.replace(/^.*[\\\/]/, ''),
								line: el.line,
								filepath: el.file // problem ox ne sauvegarde que le filname
							};
							if (sourcefile === Brk.filename || sourcefile === Brk.filepath)
								brps.push(Brk);
						} else {
							//debugger;
							// there is no breaks to show.
						}
					}
					if (brps.length < 1)
						resolve(true);
					else {
						this.serialclean(brps).then(a => {
							return true;
						}, () => { return true; });

					}
				}
				else {
					debugger;
					resolve(false);
				}
			}, () => {
				debugger;
				this.log("fail to show breaks");
				resolve(false);
			});

		});
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		/*
			Sets multiple breakpoints for a single source and clears all previous breakpoints in that source.
			To clear all breakpoint for a source, specify an empty array.
			When a breakpoint is hit, a ‘stopped’ event (with reason ‘breakpoint’) is generated.*/

		const path = <string>args.source.path;
		const cb = (() => {
			this.clearBreakpoints(path).then(() => {
				this.log("DO setBreakPointsRequest\n");

				this.testperso(args).then(a => {
					response.body = {
						breakpoints: a
					};
					this.sendResponse(response);
				}).catch(() => { debugger; this.sendResponse(response) })

			},
				msg => { debugger; this.sendErrorResponse(response, 9, msg.toString()) });
		}).bind(this);

		if (this.debugReady)
			cb();
		else
			this.once("debug-ready", () => cb());
		// this.sendErrorResponse(response, 9, "cant set breakpoint");

	}
	//#endregion 




	// protected breakpointLocationsRequest(response: DebugProtocol.BreakpointLocationsResponse, args: DebugProtocol.BreakpointLocationsArguments, request?: DebugProtocol.Request): void {

	// 	if (args.source.path) {
	// 		const bps = this._runtime.getBreakpoints(args.source.path, this.convertClientLineToDebugger(args.line));
	// 		response.body = {
	// 			breakpoints: bps.map(col => {
	// 				return {
	// 					line: args.line,
	// 					column: this.convertDebuggerColumnToClient(col)
	// 				}
	// 			})
	// 		};
	// 	} else {
	// 		response.body = {
	// 			breakpoints: []
	// 		};
	// 	}
	// 	this.sendResponse(response);
	// }


	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		// const [threadId, level] = this.frameIdToThreadAndLevel(args.frameId);
		this.sendUserInput(args.expression).then(output => {
			if (typeof output == "undefined")
				response.body = {
					result: "",
					variablesReference: 0
				};
			else
				response.body = {
					result: JSON.stringify(output),
					variablesReference: 0
				};
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 8, msg.toString());
		});

	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		if (!this.debugReady) {
			this.sendResponse(response);
			return;
		}
		// runtime supports no threads so just return a default thread.
		response.body = {
			threads: [
				new Thread(OxDebugSession.THREAD_ID, "thread 1")
			]
		};
		this.sendResponse(response);
	}





	//#region Stacks


	GetVarFromLine(lines: string, islocal: boolean): OxVariable {
		// const lintRegex = /(\d+)\s([\S]+?)\s+([\S]+?)\s+(.*)/g
		const lintRegex = /(^\d+)\s([\S]+?)\s+([\S]+?)\s+(.*)/g
		/*
			=== global variables ===
			315 Sample[5]               class    Sample
			316 Database[22]            class    Database : Sample
			317 fakeglobal              int      5

			=== local variables ===
			1 ddc[2][1]               matrix   1 ...
			2 c2[5][5]                matrix   0 ...
			3 c                       int      5
					
			MATCH :
			0 - 	316 Database[22]            class    Database : Sample
			1 - 	316
			2 -  	Database[22]
			3 - 	class
			4 -   Database : Sample
   */
		var match = lintRegex.exec(lines.trim());
		if (match != null) {
			let value: string = "";
			var ID = Number(match[1]);
			var name = String(match[2]).trim();
			var type = String(match[3]).trim();
			name += " (" + type + ")";

			value = String(match[4]).trim();
			var vari = {
				local: islocal,
				name: name,
				valueStr: value,
				id: ID,
				type: type
			};
			return vari;

		}
		
		
		const lintRegex2 = /(^\d+)\s([\S]+?)\s+(.*)/g
		match = lintRegex2.exec(lines.trim());
			/*	

			3 values[2]               array  
			
			
			parsed as: 
			0: 3 values[2]               array
			1: 3
			2: values[2]
			3: array
			*/
		if (match != null) {
			let value: string = "";
			var ID = Number(match[1]);
			var name = String(match[2]).trim();
			var type = String(match[3]).trim();
			name += " (" + type + ")";
			value =""; // no value
			var vari = {
				local: islocal,
				name: name,
				valueStr: value,
				id: ID,
				type: type
			};
			return vari;

		}
		
		return null;
	}

	async getStackVariables(): Promise<OxVariable[]> {
		this.log("getStackVariables");
		const ret: OxVariable[] = [];
		const result = await this.sendCommandToOx(`info variables`);
		let isGlobal: boolean = false;
		if (result.result === OxDebugResult.Ok) {
			if (result.lines.length > 0) {
				result.lines.forEach(el => {
					if (el.code === OxDebugCodeLine.Message)
						if (el.message === "=== global variables ===")
							isGlobal = true;
						else if (el.message === "=== local variables ===")
							isGlobal = false;
						else if (el.message === "no symbols defined") {
							//do nothing
						}
						else {
							var vari = this.GetVarFromLine(el.message, !isGlobal);
							if (vari != null) {
								ret.push(vari);
							}
						}

				});
			}
		}
		else {
			debugger;
		}
		return ret;
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request) {
		/*Retrieves all child variables for the given variable reference.
		An optional filter can be used to limit the fetched children to either named or indexed children.*/
		this.log("DO variablesRequest\n");
		const test = args;
		const test2 = request;
		//TODO ce n'est pas logique je pense qu'il faut utiliser les arguments ci dessus.
		const variables: DebugProtocol.Variable[] = [];
		this.getStackVariables().then(varox => {
			response.body = {
				variables: variables
			};
			if (varox.length < 1) this.sendResponse(response);

			varox.forEach(el => {

				let name = "";
				if (!el.local)
					name = "[Global] "
				name = name + el.name;
				variables.push({
					name: name,
					type: el.type,
					value: el.valueStr,
					variablesReference: 0
				});
			});
			response.body = {
				variables: variables
			};
			this.sendResponse(response)
		},
			err => {
				debugger;
				this.sendErrorResponse(response, 12, `Failed to get variables: ${err.toString()}`);
			});
	}


	getStack(maxLevels: number, thread: number): Thenable<Stack[]> {
		this.log("getStack");
		return new Promise((resolve, reject) => {
			this.sendCommandToOx("info stack").then((result) => {
				// this.log("getStack result -->: " + JSON.stringify(result));
				const ret: Stack[] = [];
				let pointer: Stack;
				let counter: number = 0;
				for (let i = 0; i < result.lines.length; i++) {
					const element = result.lines[i];
					if (element.code === OxDebugCodeLine.Running) {
						let st: Stack;
						var path = this.FixPath(element.file);
						var filename = element.file.replace(/^.*[\\\/]/, '');
						st = {
							level: counter,
							address: "",
							function: element.message,
							fileName: filename,
							file: path,
							line: element.line
						};
						counter++;
						ret.push(st);
					}
				}
				// this.skipNextBreak = true;
				resolve(ret);
			}, err => { debugger; });
		});;
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		let threadId = 1;
		this.getStack(args.levels, threadId).then(stack => {
			const ret: StackFrame[] = [];
			stack.forEach(element => {
				let source = undefined;
				let file = element.file;
				if (file) {
					if (process.platform === "win32") {
						if (file[1] === ':') {
							file = file[0].toUpperCase() + file.substr(1);
						}
					}
					source = new Source(element.fileName, file);
				}
				ret.push(new StackFrame(
					this.threadAndLevelToFrameId(threadId, element.level),
					element.function,
					source,
					element.line,
					0));
			});
			response.body = {
				stackFrames: ret
			};
			this.sendResponse(response);
		}, err => {
			debugger;
			this.sendErrorResponse(response, 12, `Failed to get Stack Trace: ${err.toString()}`);
		});
	}
	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		/*The request returns the variable scopes for a given stackframe ID. */

		response.body = {
			scopes: [
				new Scope("Local", this._variableHandles.create("local"), false),
				// new Scope("Global", this._variableHandles.create("global"), true)
			]
		};
		this.sendResponse(response);
	}
	//#endregion 


	//#region Helpers

	FixPath(path: string): string {
		if (path[1] === ':') {
			path = path[0].toUpperCase() + path.substr(1);
		}
		return path;
	}

	//#endregion

	protected threadCreatedEvent(info: OxDebugLine) {
		this.sendEvent(new DebugAdapter.ThreadEvent("started", 1));
	}
	protected threadExitedEvent(info: OxDebugLine) {
		this.sendEvent(new DebugAdapter.ThreadEvent("exited", 1));
	}



	//#region Moove 
	continue(): Thenable<boolean> {
		this.log("continue");
		return new Promise((resolve, reject) => {
			this.sendCommandToOx("continue").then((info) => { // #go
				resolve(info.result === OxDebugResult.Ok);
			}, () => { debugger; reject; });
		});
	}
	next(): Thenable<boolean> {
		this.log("next");
		return new Promise((resolve, reject) => {
			this.AcceptSameBreak = true;
			this.sendCommandToOx("next").then((info) => { // #step over
				resolve(info.lines[0].code === OxDebugCodeLine.Running);
			}, () => { debugger; reject; });
		});
	}
	stepOut(reverse: boolean = false): Thenable<boolean> {
		this.log("stepOut");
		return new Promise((resolve, reject) => {
			this.sendCommandToOx("finish").then((info) => { // #step out
				resolve(info.lines[0].code === OxDebugCodeLine.Running);
			}, () => { debugger; reject; });
		});
	}
	step(reverse: boolean = false): Thenable<boolean> {
		this.log("step");
		return new Promise((resolve, reject) => {
			this.AcceptSameBreak = true;
			this.sendCommandToOx("step").then((info) => { // #step in
				resolve(info.lines[0].code === OxDebugCodeLine.Running);
			 
			}, () => { debugger; reject; });
		});
	}
	protected stepOutRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.stepOut().then(done => {
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 5, `Could not step out: ${msg}`);
		});
	}
	protected stepInRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.step().then(done => {
			this.sendResponse(response);
		}, msg => {
			this.sendErrorResponse(response, 4, `Could not step in: ${msg}`);
		});
	}
	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {



		this.next().then(done => {
			this.sendResponse(response);
		}, msg => {
			debugger;
			this.sendErrorResponse(response, 2, `Could not continue: ${msg}`);
		});
		// this.sendResponse(response);
	}
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {

		this.continue().then(done => {
			this.sendResponse(response);
		}, msg => {
			debugger;
			this.sendErrorResponse(response, 2, `Could not continue: ${msg}`);
		});

	}
	//#endregion


	protected handleMsg(type: OxStd, msg: string) {
		let cat: string
		if (type == OxStd.stdout)
			cat = "stdout";
		if (type == OxStd.stderr)
			cat = "stderr";
		this.sendEvent(new OutputEvent(msg, cat));
	}


	//#region NotUsed

	// protected stepBackRequest(response: DebugProtocol.StepBackResponse, args: DebugProtocol.StepBackArguments): void {
	// 	this._runtime.step(true);
	// 	this.sendResponse(response);
	// }

	// protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {

	// 	let reply: string | undefined = undefined;

	// 	if (args.context === 'repl') {
	// 		// 'evaluate' supports to create and delete breakpoints from the 'repl':
	// 		const matches = /new +([0-9]+)/.exec(args.expression);
	// 		if (matches && matches.length === 2) {
	// 			const mbp = this._runtime.setBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
	// 			const bp = <DebugProtocol.Breakpoint>new Breakpoint(mbp.verified, this.convertDebuggerLineToClient(mbp.line), undefined, this.createSource(this._runtime.sourceFile));
	// 			bp.id = mbp.id;
	// 			this.sendEvent(new BreakpointEvent('new', bp));
	// 			reply = `breakpoint created`;
	// 		} else {
	// 			const matches = /del +([0-9]+)/.exec(args.expression);
	// 			if (matches && matches.length === 2) {
	// 				const mbp = this._runtime.clearBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
	// 				if (mbp) {
	// 					const bp = <DebugProtocol.Breakpoint>new Breakpoint(false);
	// 					bp.id = mbp.id;
	// 					this.sendEvent(new BreakpointEvent('removed', bp));
	// 					reply = `breakpoint deleted`;
	// 				}
	// 			}
	// 		}
	// 	}

	// 	response.body = {
	// 		result: reply ? reply : `evaluate(context: '${args.context}', '${args.expression}')`,
	// 		variablesReference: 0
	// 	};
	// 	this.sendResponse(response);
	// }

	// protected dataBreakpointInfoRequest(response: DebugProtocol.DataBreakpointInfoResponse, args: DebugProtocol.DataBreakpointInfoArguments): void {

	// 	response.body = {
	// 		dataId: null,
	// 		description: "cannot break on data access",
	// 		accessTypes: undefined,
	// 		canPersist: false
	// 	};

	// 	if (args.variablesReference && args.name) {
	// 		const id = this._variableHandles.get(args.variablesReference);
	// 		if (id.startsWith("global_")) {
	// 			response.body.dataId = args.name;
	// 			response.body.description = args.name;
	// 			response.body.accessTypes = ["read"];
	// 			response.body.canPersist = false;
	// 		}
	// 	}

	// 	this.sendResponse(response);
	// }


	// protected setDataBreakpointsRequest(response: DebugProtocol.SetDataBreakpointsResponse, args: DebugProtocol.SetDataBreakpointsArguments): void {
	// 	/*
	// 	Replaces all existing data breakpoints with new data breakpoints.
	// 	To clear all data breakpoints, specify an empty array.
	// 	When a data breakpoint is hit, a ‘stopped’ event (with reason ‘data breakpoint’) is generated.
	// 	*/
	// 	// clear all data breakpoints
	// 	this._runtime.clearAllDataBreakpoints();

	// 	response.body = {
	// 		breakpoints: []
	// 	};

	// 	for (let dbp of args.breakpoints) {
	// 		// assume that id is the "address" to break on
	// 		const ok = this._runtime.setDataBreakpoint(dbp);
	// 		response.body.breakpoints.push({
	// 			verified: ok
	// 		});
	// 	}

	// 	this.sendResponse(response);
	// }

	// protected completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments): void {

	// 	response.body = {
	// 		targets: [
	// 			{
	// 				label: "item 10",
	// 				sortText: "10"
	// 			},
	// 			{
	// 				label: "item 1",
	// 				sortText: "01"
	// 			},
	// 			{
	// 				label: "item 2",
	// 				sortText: "02"
	// 			}
	// 		]
	// 	};
	// 	this.sendResponse(response);
	// }

	// protected cancelRequest(response: DebugProtocol.CancelResponse, args: DebugProtocol.CancelArguments) {
	// 	if (args.requestId) {
	// 		this._cancelationTokens.set(args.requestId, true);
	// 	}
	// }

	//---- helpers

	// private createSource(filePath: string): Source {
	// 	return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mock-adapter-data');
	// }

	//#endregion
}


DebugAdapter.DebugSession.run(OxDebugSession);