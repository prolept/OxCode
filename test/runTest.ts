import * as path from 'path';

import { runTests } from 'vscode-test';

async function main() {
    try {
        let testOption = { extensionDevelopmentPath: path.resolve(__dirname, '../../'), extensionTestsPath: path.resolve(__dirname, './suite/index') };
        // Download VS Code, unzip it and run the integration test
        await runTests(testOption);
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();