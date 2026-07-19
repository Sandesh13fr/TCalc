package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.tcalc.plugin.runner.CliRunner

class GenerateAgentRulesAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val basePath = project.basePath ?: return
        runCliAction(project, { CliRunner().generateAgentRules(basePath) }) { result ->
            confirmAndWrite(project, "AGENTS.md", result.stdout.trimEnd(), "Preview Agent Rules")
        }
    }
}
