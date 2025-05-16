import * as vscode from "vscode";
import CommandsProcessor from "./CommandsProcessor";
import StartupProcessor from "./startup/StartupProcessor";
import CustomUriHandler from "./UriHandler";
import VSCodeCommand from "./commands/VSCodeCommand";

export async function activate(context: vscode.ExtensionContext) {
  let commandsProcessor = new CommandsProcessor();

  // process any postponed commands
  let postponedCommand: any = context.globalState.get("postponedCommand");

  if (postponedCommand) {
    context.globalState.update("postponedCommand", undefined);
    commandsProcessor.parseCommand(postponedCommand);

    commandsProcessor.executeCommands();
  }

  // listen for new commands
  let uriHandler = new CustomUriHandler(context, commandsProcessor);
  uriHandler.register();

  context.subscriptions.push(
    vscode.commands.registerCommand("roo-executor.run", (args) => {
      if (args && args.args && args.args.newWindow) {
        context.globalState.update("postponedCommand", args);

        // doing this to allow the new window to take the focus
        setTimeout(() => {
          vscode.commands.executeCommand("workbench.action.newWindow");
        }, 200);
      } else {
        commandsProcessor.parseCommand(args);
        commandsProcessor.executeCommands();
      }
    })
  );

  const startupProcessor = new StartupProcessor();
  startupProcessor.readConfigurations();
  startupProcessor.runCommands();

  watchRooTriggerFile(context, commandsProcessor);
}

function watchRooTriggerFile(context: vscode.ExtensionContext, commandsProcessor: CommandsProcessor) {
  const watcher = vscode.workspace.createFileSystemWatcher("**/.roo-trigger");

  watcher.onDidCreate(() => processRooTriggerFile(commandsProcessor));
  watcher.onDidChange(() => processRooTriggerFile(commandsProcessor));

  context.subscriptions.push(watcher);
}

async function processRooTriggerFile(commandsProcessor: CommandsProcessor) {
  const triggerFilePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath + "/.roo-trigger";
  if (!triggerFilePath) {
    return;
  }

  try {
    const content = await vscode.workspace.fs.readFile(vscode.Uri.file(triggerFilePath));

    try {
      const command = new VSCodeCommand("roo-cline.newTask", { prompt: content.toString() })
      await command.execute();
      await vscode.workspace.fs.delete(vscode.Uri.file(triggerFilePath));
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to read file: ${error.message}`);
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to process .roo-trigger file: ${error.message}`);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
