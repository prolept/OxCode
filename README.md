 
<!---
//cSpell:ignore pfor, lambdafunc, unpad, oper, endregion, paren, Intelli, oxcode, PROGRA
-->
# Ox for Visual Studio Code (Beta Version)

by [Prolept](https://www.prolept.com)

This extension provides rich language support for [Ox](https://www.doornik.com/ox/). 


| Platform       | Status           |
|---------------|---------------------|
| Windows          |  [![Build Status windows](https://dev.azure.com/malickfall/OxCode/_apis/build/status/malickf.OxCode-MF?branchName=master&jobName=Windows)](https://dev.azure.com/malickfall/OxCode/_build/latest?definitionId=1&branchName=master)        |
| Mac OS         |  [![Build Status](https://dev.azure.com/malickfall/OxCode/_apis/build/status/malickf.OxCode-MF?branchName=master&jobName=macOS)](https://dev.azure.com/malickfall/OxCode/_build/latest?definitionId=1&branchName=master)  |
 

***Please do not distribute***

 If you are new to VS Code see [Getting started with Visual Studio Code](https://code.visualstudio.com/docs/introvideos/basics)

## Requirements
 
- [OxMetrics 8](http://www.oxmetrics.net) or above. 
- Windows 64 bits or MacOS

## Installation


After installation, the extension setting `oxmetricsFolder` must be set to the folder path of oxmetrics. 

Example:

- Windows :   `C:\\Program Files\\OxMetrics8\\`
- MacOs   :   `/Applications/OxMetrics8/`

You can change the extension setting via : `File` -> `Preferences` -> `Setting` -> `Extension` -> `OxCode`  (see [Setting](https://code.visualstudio.com/docs/getstarted/settings)) 

After that `oxmetricsFolder` has been changed, a reload of Visual Studio Code is needed to complete installation.

## Language Features
 
### IntelliSense
 
- [Auto Completion of symbols as you type](#Auto-Completion)
- [Signature Help for functions as you type](#Signature-Help)

### Code Navigation

- Go To (or Peek) Implementation of symbols   (`CTRL+F12`)
- Go To (or Peek) Definition of symbols  (GO/Peek Definition (`ALT+F12` / `ctrl + Shift + F12`))
- Go to the symbol in file 
- Provide symbols to the [outline view](https://code.visualstudio.com/docs/getstarted/userinterface#_outline-view).

### Diagnostics

- [Linter (basic errors checking)](#Linter) 


### Code Editing

- Formatter : right click -> `Format Document`, thanks to [AStyle](http://astyle.sourceforge.net/astyle.html)
- [Code Snippets for quick coding](#Code-Snippets)


### Others

- Command to run/compile a `.ox` code (right click, and click `Ox Run` or `OX Compile`)
- Syntax Highlighting
- A problem matcher is implemented to quickly jump to errors.
- [Documentation generation (javadoc style)](#Doc-Generation)
- region folding ( via `//region` and `//endregion` )

---

#### Auto Completion


Autocompletion is provided as you type, after `[.]` (while calling a function ) or `[this.]` (inside a member function).

![doc generation](https://www.prolept.com/vscode/completion.gif)

#### Signature Help 

Signature Help is given after a parenthesis `(`.  If the function declaration is documented with a javadoc comment, then the documentation is displayed. 

#### Linter

Two basic errors checking are currently implemented : 

- Check for new/delete.
- Check for unused local variables.

To run the linter,  right click an ox file, click `Show All Commands` and `OX Lint my code`.

![doc generation](https://www.prolept.com/vscode/unused.gif)

#### Code Snippets



| snippet       | statement           |
|---------------|---------------------|
| for           |  for loop           |
| pfor          |  parallel for loop  |
| fore          |  foreach            |
| lambdafunc    |  lambda function    |
| switch        |  switch             |
| if            |  if                 |
| if/else       |  if/else            |
| main          |  initialize an ox code            |

![doc generation](https://www.prolept.com/vscode/snippets.gif)


#### Doc generation

Documentation for function can automatically be inserted by inserting  `/**` + `Enter` :

![doc generation](https://www.prolept.com/vscode/gendoc.gif)


#### Commands

The extension  provides several commands in the Command Palette for working with Ox files:

* `OX Compile and Link` to compile the current ox file and link
* `OX Compile` to compile the current ox file
* `OX Stop` to stop the running ox session
* `OX Clean .bak files` to delete .bak files that are in the current directory
* `OX Lint my code` to lint the current file
* `OX Help` to open the official ox help
* `OX Open file with oxmetrics` to open a file in oxmetrics
* `OX Run` to run the current file
* `OX OxRun` to run the current file using OxRun (for graphics)
* `OX Run in terminal` to run the current file via a terminal
 
You can access all of the above commands from the command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`).

---

## Extension Settings

This extension contributes the following settings:

* `oxcode.astyleOptions`:  see [Astyle options](http://astyle.sourceforge.net/) (default : ` --pad-header --break-blocks  --pad-oper --style=java --delete-empty-lines --unpad-paren`)
* `oxcode.oxmetricsFolder`: The path to the root folder of oxmetrics .
* `oxcode.checkSyntaxOnSave`: If true, check the syntax on save (default : false).
* `oxcode.completion`: True to enable completion (default : true).
* `oxcode.signature`: True to enable signature Help (default : true).

## Known Issues

 - See Github Issues. 

## To do 

Repository github... 


## Credits 

  - [Wave (Boost libraries) ](https://github.com/boostorg/wave)
  - [Anltr 4 (Parser generator)](https://www.antlr.org/)
  - [Artistic Style (Automatic Formatter)](http://astyle.sourceforge.net/astyle.html)
  - [vscode-go](https://github.com/Microsoft/vscode-go)


## Licence 

- This extension: The MIT License (MIT) 
- OxLinter : copyright [Prolept](https://www.prolept.com), this extension relies heavily on a command line executable named `OxLinter` (freeware) that is bundled with this extension.

  *Please note that futures versions of this extension may be commercialized.*
 

 ## FAQ 

 - Does this extension use any online services? 
    - No, this extension is self contained. It doesn't use any telemetry services.
 - How to report a bug  ?
    - via the github repository. If you can fix it, feel free to send us pull requests.
 - Does this extension support prior version of OxMetrics ? 
    - It has not been tested, but it should work.
  
### Tips and Tricks

- You can easily exclude *.bak files from the explorer using the following in your user setting: 

```
   "files.exclude": {
         "**/*.bak": true
      }
```

- An alternative way to run/compile ox files is via tasks. See [Tasks](https://code.visualstudio.com/docs/editor/tasks) . 

   Example (windows): 
```
 {
    // See https://go.microsoft.com/fwlink/?LinkId=733558
    // for the documentation about the tasks.json format
    "version": "2.0.0",
    "tasks": [
    
        {
            "label": "Run ox",
            "type": "shell",
            "command": "C:\\PROGRA~1\\OxMetrics8\\ox\\bin64\\oxl.exe",
            "args": [
                "-i${workspaceFolder}",
                "-i${fileDirname}",
                 "-v2",
                "${file}"
            ],
            "problemMatcher": [],
            "group": {
                "kind": "build",
                "isDefault": true
            }
        }
    ]
}
```
 