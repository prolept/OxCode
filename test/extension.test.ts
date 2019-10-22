//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../src/extension';
import GoDefinitionProvider from '../src/oxGoToDefininition';
import * as path from 'path';
import { GoImplementationProvider } from '../src/oxGoToImplementations';
import { getExtensionCommands, IsCorrectOxFile, FixPathWindows } from '../src/util';
import { OxDocumentSymbolProvider } from '../src/oxOutline';
import { OxSignatureHelpProvider } from '../src/OxSignature';
import { OxCompletionItemProvider } from '../src/OxCompletion';
console.log(__dirname);
const extensionPackage = require('../../package.json');
/*
Tests are made in such a way that no Oxmetrics installation is needed. A fake Oxmetrics folder is given.
//TODO Gendoc, Formatter 
*/
// Defines a Mocha test suite to group tests of similar kind together
function getExtensionId() {
    // The extensionId is `publisher.name` from package.json // "Prolept.oxcode"
    const { name = '', publisher = '' } = extensionPackage;
    return `${publisher}.${name}`;
}

suite("Extension Tests", () => {
    let originalOxMetricsFolder;
    let apioxcode, ext;
    async function InitializeExt(goConfig: vscode.WorkspaceConfiguration): Promise<any> {

        try {

            originalOxMetricsFolder = vscode.workspace.getConfiguration('oxcode').inspect('oxmetricsFolder').globalValue;

            await vscode.workspace.getConfiguration('oxcode').update(('oxmetricsFolder'), undefined, vscode.ConfigurationTarget.Global);
            await vscode.workspace.getConfiguration('oxcode').update(('oxmetricsFolder'), FixPathWindows(path.resolve(__dirname, '..', '..', 'test', 'oxmetrics').toString()), vscode.ConfigurationTarget.Global);
            console.log("global : " + vscode.workspace.getConfiguration('oxcode').inspect('oxmetricsFolder').globalValue);
            ext = vscode.extensions.getExtension(getExtensionId());
            apioxcode = await ext.activate();

        } catch (error) {
            console.log(error);
        }

    }
    async function testDefinitionProvider(): Promise<any> {
        const provider = new GoDefinitionProvider();
        var dir = path.join(__dirname, '..', '..', 'test', 'data', 'test.ox'); //path.join(__dirname,"..\\test/data/test.ox")
        var uri = vscode.Uri.file(dir);
        const position = new vscode.Position(14, 6);
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const definitionInfo = await provider.provideDefinition(textDocument, position, null);
            assert.equal(definitionInfo.uri.path.toLowerCase(), uri.path.toLowerCase(), `${definitionInfo.uri.path} is not the same as ${uri.path}`);
            assert.equal(definitionInfo.range.start.line, 5);
            assert.equal(definitionInfo.range.start.character, 4);

        } catch (err) {
            assert.ok(false, `error in testDefinitionProvider ${err}`);
            return Promise.reject(err);
        }

        dir = path.join(__dirname, '..', '..', 'test', 'data', 'folder space', 'test.ox');
        uri = vscode.Uri.file(dir);
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const definitionInfo = await provider.provideDefinition(textDocument, position, null);
            assert.equal(definitionInfo.uri.path.toLowerCase(), uri.path.toLowerCase(), `${definitionInfo.uri.path} is not the same as ${uri.path}`);
            assert.equal(definitionInfo.range.start.line, 5);
            assert.equal(definitionInfo.range.start.character, 4);

        } catch (err) {
            assert.ok(false, `error in testDefinitionProvider ${err}`);
            return Promise.reject(err);
        }
    }

    async function testImplementationProvider(): Promise<any> {
        const provider = new GoImplementationProvider();
        var dir = path.join(__dirname, '..', '..', 'test', 'data', 'test.ox');
        var uri = vscode.Uri.file(dir);
        const position = new vscode.Position(14, 6);
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const definitionInfo = await provider.provideImplementation(textDocument, position, null);
            let def: vscode.Location;
            def = definitionInfo[0];
            assert.equal(def.uri.path.toLowerCase(), uri.path.toLowerCase(), `${def.uri.path} is not the same as ${uri.path}`);
            assert.equal(def.range.start.line, 7);
            assert.equal(def.range.start.character, 0);
            assert.equal(def.range.end.line, 7);
            assert.equal(def.range.end.character, 16);
        } catch (err) {
            assert.ok(false, `error in testImplementationProvider ${err}`);
            return Promise.reject(err);
        }

        dir = path.join(__dirname, '..', '..', 'test', 'data', 'folder space', 'test.ox');
        uri = vscode.Uri.file(dir);
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const definitionInfo = await provider.provideImplementation(textDocument, position, null);
            let def: vscode.Location;
            def = definitionInfo[0];
            assert.equal(def.uri.path.toLowerCase(), uri.path.toLowerCase(), `${def.uri.path} is not the same as ${uri.path}`);
            assert.equal(def.range.start.line, 7);
            assert.equal(def.range.start.character, 0);
            assert.equal(def.range.end.line, 7);
            assert.equal(def.range.end.character, 16);
        } catch (err) {
            assert.ok(false, `error in testImplementationProvider ${err}`);
            return Promise.reject(err);
        }
    }

    async function testSymbolsProvider(): Promise<any> {
        const provider = new OxDocumentSymbolProvider();
        var dir = path.join(__dirname, '..', '..', 'test', 'data', 'test.ox');
        var uri = vscode.Uri.file(dir);
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const definitionInfo = await provider.provideDocumentSymbols(textDocument, null);
            let symb: vscode.DocumentSymbol;
            symb = definitionInfo[0];
            assert.equal(symb.name, "Call1", `${symb.name} is not the same as Call1`);
            assert.equal(symb.kind, vscode.SymbolKind.Method)
            assert.equal(definitionInfo[1].name, "main")
            assert.equal(definitionInfo[1].kind, vscode.SymbolKind.Function)
        } catch (err) {
            assert.ok(false, `error in testSymbolsProvider ${err}`);
            return Promise.reject(err);
        }

        dir = path.join(__dirname, '..', '..', 'test', 'data', 'folder space', 'test.ox');
        uri = vscode.Uri.file(dir);
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const definitionInfo = await provider.provideDocumentSymbols(textDocument, null);
            let symb: vscode.DocumentSymbol;
            symb = definitionInfo[0];
            assert.equal(symb.name, "Call1", `${symb.name} is not the same as Call1`);
            assert.equal(symb.kind, vscode.SymbolKind.Method)
            assert.equal(definitionInfo[1].name, "main")
            assert.equal(definitionInfo[1].kind, vscode.SymbolKind.Function)
        } catch (err) {
            assert.ok(false, `error in testSymbolsProvider ${err}`);
            return Promise.reject(err);
        }
    }
    async function testCompletionProvider(): Promise<any> {
        const provider = new OxCompletionItemProvider();
        var dir = path.join(__dirname, '..', '..', 'test', 'data', 'test.ox');
        var uri = vscode.Uri.file(dir);
        const position = new vscode.Position(14, 3);
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const definitionInfo = await provider.provideCompletionItems(textDocument, position, null);
            let symb: vscode.CompletionItem;
            symb = definitionInfo[0];
            assert.equal(symb.label, "Call1", `${symb.label} is not the same as Call1`);

        } catch (err) {
            assert.ok(false, `error in testCompletionProvider ${err}`);
            return Promise.reject(err);
        }

        dir = path.join(__dirname, '..', '..', 'test', 'data', 'folder space', 'test.ox');
        uri = vscode.Uri.file(dir);
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const definitionInfo = await provider.provideCompletionItems(textDocument, position, null);
            let symb: vscode.CompletionItem;
            symb = definitionInfo[0];
            assert.equal(symb.label, "Call1", `${symb.label} is not the same as Call1`);

        } catch (err) {
            assert.ok(false, `error in testCompletionProvider ${err}`);
            return Promise.reject(err);
        }
    }
    async function testSignatureHelpProvider(): Promise<any> {
        const provider = new OxSignatureHelpProvider();
        var uri = vscode.Uri.file(path.join(__dirname, '..', '..', 'test', 'data', 'test.ox'));
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const position = new vscode.Position(14, 9);
            const sigHelp = await provider.provideSignatureHelp(textDocument, position, null);
            assert.equal(sigHelp.signatures[0].label, "Call1(un,deux)", `${sigHelp.signatures[0].label} is not the same as Call1(un,deux)`);
            assert.equal(sigHelp.signatures[0].parameters.length, 2);
            assert.equal(sigHelp.signatures[0].parameters[0].label, "un");
            assert.equal(sigHelp.signatures[0].parameters[1].label, "deux");
        } catch (err) {
            assert.ok(false, `error in OpenTextDocument ${err}`);
            return Promise.reject(err);
        }

        uri = vscode.Uri.file(path.join(__dirname, '..', '..', 'test', 'data', 'folder space', 'test.ox'));
        try {
            const textDocument = await vscode.workspace.openTextDocument(uri);
            const position = new vscode.Position(14, 9);
            const sigHelp = await provider.provideSignatureHelp(textDocument, position, null);
            assert.equal(sigHelp.signatures[0].label, "Call1(un,deux)", `${sigHelp.signatures[0].label} is not the same as Call1(un,deux)`);
            assert.equal(sigHelp.signatures[0].parameters.length, 2);
            assert.equal(sigHelp.signatures[0].parameters[0].label, "un");
            assert.equal(sigHelp.signatures[0].parameters[1].label, "deux");
        } catch (err) {
            assert.ok(false, `error in OpenTextDocument ${err}`);
            return Promise.reject(err);
        }
    }
    test("InitializeExt", (done) => {
        const config = Object.create(vscode.workspace.getConfiguration('oxcode'), { 'docsTool': { value: 'godoc' } });
        InitializeExt(config).then(() => done(), done);
    });

    test("Go To Definition", (done) => {
        testDefinitionProvider().then(() => done(), done);
    });

    test("Go To Implementation", (done) => {
        testImplementationProvider().then(() => done(), done);
    });

    test("Outline view", (done) => {
        testSymbolsProvider().then(() => done(), done);
    });

    test("test Signature", (done) => {
        testSignatureHelpProvider().then(() => done(), done);
    });

    test("test completion", (done) => {
        testCompletionProvider().then(() => done(), done);
    });


    async function resetSetting(): Promise<any> {
        if (originalOxMetricsFolder != undefined) {
            console.log("Reset oxmetrics folder to " + originalOxMetricsFolder);
            await vscode.workspace.getConfiguration('oxcode').update(('oxmetricsFolder'), originalOxMetricsFolder, vscode.ConfigurationTarget.Global);

        } else console.log("original oxmetrics folder is null.. ");
    }

    // not a test ...
    test("reset global setting", (done) => {
        resetSetting().then(() => done(), done);
    });

});