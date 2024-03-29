# Change Log
All notable changes to the extension will be documented in this file.
- DOING v 0.1.9
   - Beta version of the debbuger (OxMetrics 9 Only)
   - 2 new diagnotics: "An argument is never used" and "Enum should be written in UPPER CASE"
   - Improve the cache of the autocompletion

-  21/12/2020 - v 0.1.8
   - Improve the performance of the autocompletion and the Outline view features. Add the command `ClearCache` to delete all caches. 

-  09/05/2020 - v 0.1.7
    - Wrap console.log to improve the execution performance
    - Windows: add support to 32 bits version of ox on x64 platform.

-  05/03/2020 - v 0.1.6
    - Add suggestion for import/include statement
    - Add Ox environnement path to search directories (windows)
    - Improve autocompletion by skipping unnecessary calls to OxLinter
    - Fix syntax highlighting for include and import keywords
 
- 23/11/2019 - v 0.1.5 (release)
    - Add support for Linux 64-bit 
    - Optimize the performance of OxLinter (v0.0.19)
    - Fix a bug with the terminal and path on windows. 
    - Fix Continuous Integration / Azure Ops
    
- 20/10/2019 - v 0.1.4
    - Minor: the function "open file with oxmetrics" is fixed for the windows platform.
    - Improve autoclosing

- 25/05/2019 - version 0.1.3
    - Add syntax highlighting support for nested comments and try/catch/throw
    - Add OxLinter support for nested comments (new binary v0.0.17)
    - Remove linter rule "new/delete"
    - Change context menu and rename Ox Commands
    - Change default shortcut to run ox (`ctrl+r`)
    - update readme: fix broken link, add known issues, update tips and tricks

- 22/05/2019 - version 0.1.1
    - Initial release
    - v 0.1.2 HotFix : broken `OX Help` command
 