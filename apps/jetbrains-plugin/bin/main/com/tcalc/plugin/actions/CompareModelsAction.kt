package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.tcalc.plugin.runner.CliRunner
import com.tcalc.plugin.runner.CliRunnerException

class CompareModelsAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        try {
            val runner = CliRunner()
            val result = runner.recommendModels(project.basePath ?: return)
            if (result.exitCode == 0) {
                Messages.showInfoMessage(project, result.stdout.take(2000), "Model Recommendations")
            } else {
                Messages.showErrorDialog(project, result.stderr.ifBlank { "Unknown error" }, "TCalc Error")
            }
        } catch (ex: CliRunnerException) {
            Messages.showErrorDialog(project, ex.message, "TCalc Error")
        } catch (ex: Exception) {
            Messages.showErrorDialog(project, "Compare failed: ${ex.message}", "TCalc Error")
        }
    }
}
