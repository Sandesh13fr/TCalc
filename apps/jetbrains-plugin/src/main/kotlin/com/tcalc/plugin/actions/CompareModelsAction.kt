package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages
import com.tcalc.plugin.runner.CliRunner

class CompareModelsAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val basePath = project.basePath ?: return
        runCliAction(project, { CliRunner().recommendModels(basePath) }) { result ->
            Messages.showInfoMessage(project, result.stdout.take(4000), "Model Recommendations")
        }
    }
}
