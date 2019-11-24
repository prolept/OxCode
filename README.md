 
<!---
//cSpell:ignore pfor, lambdafunc, unpad, oper, endregion, paren, Intelli, oxcode, PROGRA
-->
# Ox for Visual Studio Code

by [Prolept](https://www.prolept.com)

This extension provides rich language support for [Ox](https://www.doornik.com/ox/). 

| Branch       | Status           |
|---------------|---------------------|
| Master          |[![Build Status](https://dev.azure.com/prolept/OxCodeProlept/_apis/build/status/prolept.OxCode%20(1)?branchName=master)](https://dev.azure.com/prolept/OxCodeProlept/_build/latest?definitionId=5&branchName=master)     |
| Dev         | [![Build Status](https://dev.azure.com/prolept/OxCodeProlept/_apis/build/status/prolept.OxCode%20(1)?branchName=dev)](https://dev.azure.com/prolept/OxCodeProlept/_build/latest?definitionId=5&branchName=dev) |


 If you are new to VS Code see [Getting started with Visual Studio Code](https://code.visualstudio.com/docs/introvideos/basics)

## Requirements
 
- [OxMetrics 8](https://www.timberlake.co.uk/software/oxmetrics.html) or above.
- Windows 64 bits, MacOS or Linux 64 bits

## Installation


After installation, the extension setting `oxmetricsFolder` must be set to the folder path of oxmetrics. 

Example:

- Windows :   `C:\Program Files\OxMetrics8`
- MacOs   :   `/Applications/OxMetrics8/`
- Linux   :   `/usr/share/OxMetrics8/`

You can change the extension setting via : `File` -> `Preferences` -> `Setting` -> `Extension` -> `OxCode`  (see [Setting](https://code.visualstudio.com/docs/getstarted/settings)) 

A reload of Visual Studio Code is needed to complete installation.

## Language Features
 
### IntelliSense
 
- [Auto Completion of symbols as you type](#Auto-Completion)
- [Signature Help for functions as you type](#Signature-Help)
- [Auto completion when typing #include or #import statements](#Include-Autocomplete)
- [Suggestion for Import/Include](#Suggestion-for-Import/Include)

### Code Navigation

- [Go To (or Peek) Implementation of symbols](#Go-To-Implementation)   
- [Go To (or Peek) Definition of symbols](#Go-To-Definition)   
- Go to the symbol in file 
- Provide symbols to the [outline view](https://code.visualstudio.com/docs/getstarted/userinterface#_outline-view).

### Diagnostics

- [Linter (basic errors checking)](#Linter) 


### Code Editing

- Formatter : right click -> `Format Document`, thanks to [AStyle](http://astyle.sourceforge.net/astyle.html)
- [Code Snippets for quick coding](#Code-Snippets)


### Others

- Command to run a `.ox` code (right click, and click `Ox Run`)
- Syntax Highlighting for `.ox` and `.oxh` files.
- A problem matcher is implemented to quickly jump to errors.
- [Documentation generation (javadoc style)](#Doc-Generation)
- region folding ( via `//region` and `//endregion` )

---

#### Auto Completion


Autocompletion is provided as you type, after `[.]` (while calling a function ) or `[this.]` (inside a member function).

![doc generation](https://www.prolept.com/vscode/completion.gif)

#### Include Autocomplete

Provide autocompletion when you type an `#include` or `#import` statement. After typing `<` or `"` to begin the file name, the extension will scan your include directories to provide suggestions. 

#### Suggestion for Import/Include

![Import Suggestion](https://www.prolept.com/vscode/importsuggestion.gif)

#### Signature Help 

Signature Help is given after a parenthesis `(`.  If the function declaration is documented with a javadoc comment, then the documentation is displayed. 

#### Linter

A basic linter rule is currently supported : 

- Check for unused local variables.

To run the linter,  right click an ox file, click `Show All Commands` and `OX Lint my code`.

![doc generation](https://www.prolept.com/vscode/unused.gif)

#### Go To Implementation

Go To Implementation (or Peek) is supported for functions (`CTRL+F12` or `CTRL + Shift + F12`).

![Go To Implementation](https://www.prolept.com/vscode/peekimplementation.gif)


####  Go To Definition

Go To Definition (or Peek) is supported for functions: 

![Go To Definition](https://www.prolept.com/vscode/peekDefinition.gif)


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

* `Ox Compile and Link` to compile the current ox file and link
* `Ox Compile` to compile the current ox file
* `Ox Stop` to stop the running ox session
* `Ox Clean .bak files` to delete .bak files that are in the current directory
* `Ox Lint my code` to lint the current file
* `Ox Help` to open the official ox help
* `Ox Open file with oxmetrics` to open a file in oxmetrics
* `Ox Run` to run the current file
* `Ox OxRun` to run the current file using OxRun (for graphics)
* `Ox Run in terminal` to run the current file via a terminal
 
You can access all of the above commands from the command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`).

---

## Extension Settings

This extension contributes the following settings:

* `oxcode.astyleOptions`:  see [Astyle options](http://astyle.sourceforge.net/) (default : ` --pad-header --break-blocks  --pad-oper --style=java --delete-empty-lines --unpad-paren`)
* `oxcode.oxmetricsFolder`: The path to the root folder of oxmetrics .
* `oxcode.checkSyntaxOnSave`: If true, check the syntax on save (default : true).
* `oxcode.completion`: True to enable completion (default : true).
* `oxcode.signature`: True to enable signature Help (default : true).


## Credits 

  - [Wave (Boost libraries) ](https://github.com/boostorg/wave)
  - [Anltr 4 (Parser generator)](https://www.antlr.org/)
  - [Artistic Style (Automatic Formatter)](http://astyle.sourceforge.net/astyle.html)
  - [vscode-go](https://github.com/Microsoft/vscode-go)
  - [intellij plugin for ANTLR v4 ](https://github.com/antlr/intellij-plugin-v4)
  - [cmake](https://cmake.org/)
  - Jurgen Doornik and Sébastien Laurent for helpful discussions.
  

 

## FAQ 

 - Does this extension use any online services? 
    - No, this extension is self contained. It doesn't use any telemetry services.
 - How to report a bug  ?
    - via the github repository. If you can fix it, feel free to send us pull requests. However, please note that the command-line executable is a closed-source software.
 - Does this extension support prior version of OxMetrics ? 
    - It has not been tested, but it should work.
 - How to request a feature ?
    - via the github repository, don't hesitate: all comments are welcome !

  
## Tips and Tricks

- If you want to use OxMetrics directly in Excel: see [XlModeler](https://www.timberlake.co.uk/software/xl-modeler.html)

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

- If you have an issue about ox, you can ask it on [stackoverflow](https://stackoverflow.com/) with the tag "ox". 

## Known Issues 

 - `Format Document` doesn't work properly when the ox file contains a nested comment. 

## Licence 

- This extension: The MIT License (MIT) 
- OxLinter : copyright [Prolept](https://www.prolept.com), this extension relies heavily on a command line executable named `OxLinter` (freeware) that is bundled with this extension.

  