package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.wm.ToolWindowManager
import com.tcalc.plugin.WmaToolWindowPanel
import com.tcalc.plugin.runner.CliRunner

class ScanWorkspaceAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val basePath = project.basePath ?: return
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("TCalc") ?: return
        val panel = toolWindow.contentManager.getContent(0)?.component as? WmaToolWindowPanel ?: return
        toolWindow.show()
        runCliAction(project, { CliRunner().scanWorkspace(basePath) }) { result -> panel.showResult(result) }
    }
}
