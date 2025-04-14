import * as vscode from "vscode";
import StartupRule from "./StartupRule";
import { RuleConfiguration } from "./RuleConfiguration";

export default class StartupProcessor {
  private rules: StartupRule[] = [];

  readConfigurations() {
    const config = vscode.workspace.getConfiguration();
    const rules = config.get<RuleConfiguration[]>("roo-executor.startupRules");

    if (!rules) {
      return;
    }

    this.rules = rules.map((rule) => new StartupRule(rule));
  }

  async runCommands() {
    for (const rule of this.rules) {
      if (await rule.isApplicable()) {
        await rule.executeCommands();
      }
    }
  }
}
