import * as vscode from "vscode";
import { Command, CommandData } from "./Interfaces";
import OpenFilesCommand from "./commands/OpenFilesCommand";
import VSCodeCommand from "./commands/VSCodeCommand";

export default class CommandsProcessor {
  private commands: Array<Command> = [];

  registerCommand(command: Command) {
    this.commands.push(command);
  }

  async parseCommand(commandData: CommandData) {
    try {
      switch (commandData.command) {
        case "openFiles":
          this.registerCommand(
            new OpenFilesCommand(commandData.args.data, commandData.args.layout)
          );
          break;

        case "runCommands":
          commandData.args.data.forEach((action: any) => {
            this.registerCommand(new VSCodeCommand(action.id, action.args));
          });
          break;

        case "runRoo":
          if (!commandData.args.file) {
            throw new Error("File parameter is required for runRoo command");
          }
          // Read the file content and pass it as prompt
          try {
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(commandData.args.file));
            this.registerCommand(
              new VSCodeCommand("roo-cline.newTask", { prompt: content.toString() })
            );
            await this.executeCommands();
          } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to read file: ${error.message}`);
          }
          break;

        default:
          vscode.window.showErrorMessage("Invalid command !");
          break;
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(error.toString());
    }
  }

  async executeCommands() {
    try {
      for (let command of this.commands) {
        await command.execute();
      }
      vscode.window.showInformationMessage(
        "The commands have been executed successfully !"
      );
    } catch (error: any) {
      vscode.window.showErrorMessage(error.toString());
    } finally {
      this.clearCommands();
    }
  }

  clearCommands() {
    this.commands = [];
  }

  async processRooTriggerFile() {
    const triggerFilePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath + "/.roo-trigger";
    if (!triggerFilePath) {
      return;
    }

    try {
      const content = await vscode.workspace.fs.readFile(vscode.Uri.file(triggerFilePath));
      const taskFilePath = content.toString().trim();

      if (!taskFilePath) {
        vscode.window.showErrorMessage("The .roo-trigger file is empty or invalid.");
        return;
      }

      await this.parseCommand({ command: "runRoo", args: { file: taskFilePath } });
      await this.executeCommands();

      await vscode.workspace.fs.delete(vscode.Uri.file(triggerFilePath));
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to process .roo-trigger file: ${error.message}`);
    }
  }
}
