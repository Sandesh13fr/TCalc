package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.tcalc.plugin.runner.CliRunner

class ExportReportAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val basePath = project.basePath ?: return
        runCliAction(project, { CliRunner().exportReport(basePath) }) { result ->
            confirmAndWrite(project, "TCALC_REPORT.md", result.stdout, "Report Generated")
        }
    }
}
