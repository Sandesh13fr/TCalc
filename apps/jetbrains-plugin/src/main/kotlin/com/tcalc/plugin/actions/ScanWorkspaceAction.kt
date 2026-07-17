package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager
import com.tcalc.plugin.runner.CliRunner
import com.tcalc.plugin.runner.CliRunnerException

class ScanWorkspaceAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("TCalc") ?: return
        val contentManager = toolWindow.contentManager
        val content = contentManager.getContent(0) ?: return
        val panel = content.component ?: return

        try {
            val runner = CliRunner()
            val result = runner.scanWorkspace(project.basePath ?: return)
            if (result.exitCode == 0) {
                panel.updateUI()
            }
        } catch (ex: CliRunnerException) {
            com.intellij.openapi.ui.Messages.showErrorDialog(project, ex.message, "TCalc Scan Error")
        } catch (ex: Exception) {
            com.intellij.openapi.ui.Messages.showErrorDialog(project, "Scan failed: ${ex.message}", "TCalc Error")
        }
    }
}
