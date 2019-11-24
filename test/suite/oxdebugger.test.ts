
import * as assert from 'assert';
// import * as vscode from 'vscode';
import { OxDebugCodeLine, TreatSingleLine } from "../../src/debugger/backend/mi_parse";
// import { OxDebugRuntime } from "../../src/debugger/mockDebug";
// import * as vscode from 'vscode';
console.log("Debugger Tests");
suite("Debugger Tests", () => {

    async function test_parseOxOutput(): Promise<any> {

        try {
            let output = "test.ox (6): break!";
            let res = TreatSingleLine(output, 1);
            assert.equal(res.code, OxDebugCodeLine.Break);
            assert.equal(res.message, "break!");
            assert.equal(res.file, "test.ox");
            assert.equal(res.result, "OK");



            output = "(6): break!";
            res = TreatSingleLine(output, 1);
            assert.equal(res.code, OxDebugCodeLine.BreakNoFile);
            assert.equal(res.message, "break!");
            assert.equal(res.result, "OK");
            assert.equal(res.file, "");

            output = "test.ox (6): abc ..";
            res = TreatSingleLine(output, 1);
            assert.equal(res.code, OxDebugCodeLine.Running);
            assert.equal(res.message, "abc ..");
            assert.equal(res.result, "OK");
            assert.equal(res.file, "test.ox");

            output = "test.ox (6)";
            res = TreatSingleLine(output, 1);
            assert.equal(res.code, OxDebugCodeLine.Showbreaks);
            assert.equal(res.result, "OK");
            assert.equal(res.file, "test.ox");

            output = "abc abc";
            res = TreatSingleLine(output, 1);
            assert.equal(res.code, OxDebugCodeLine.Message);
            assert.equal(res.result, "OK");
            assert.equal(res.message, output);

            output = "(debug)";
            res = TreatSingleLine(output, 1);
            assert.equal(res.code, OxDebugCodeLine.Empty);
            assert.equal(res.result, "OK");

            output = "(debug) abc";
            res = TreatSingleLine(output, 1);
            assert.equal(res.code, OxDebugCodeLine.Message);
            assert.equal(res.result, "OK");
            assert.equal(res.message, "abc");

            return Promise.resolve(1);
        } catch (err) {
            assert.ok(false, `error in test_parseOxOutput ${err}`);
            return Promise.reject(err);
        }


    }

    test("Parse Ox Lines", (done) => {
        test_parseOxOutput().then(() => done(), done);
    });
});