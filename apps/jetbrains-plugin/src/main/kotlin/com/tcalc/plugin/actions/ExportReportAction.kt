package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFileManager
import com.tcalc.plugin.runner.CliRunner
import com.tcalc.plugin.runner.CliRunnerException
import java.io.File

class ExportReportAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        try {
            val runner = CliRunner()
            val result = runner.exportReport(project.basePath ?: return)
            if (result.exitCode != 0) {
                com.intellij.openapi.ui.Messages.showErrorDialog(project,
                    result.stderr.ifBlank { "Unknown error" }, "TCalc Error")
                return
            }

            val outputFile = File(project.basePath, "TCALC_REPORT.md")
            outputFile.writeText(result.stdout)

            VirtualFileManager.getInstance().refreshWithoutFileWatcher(false)
            val vf = VirtualFileManager.getInstance().findFileByNioPath(outputFile.toPath())
            if (vf != null) {
                FileEditorManager.getInstance(project).openFile(vf, true)
            }
            com.intellij.openapi.ui.Messages.showInfoMessage(project,
                "Report written to TCALC_REPORT.md", "Report Generated")
        } catch (ex: CliRunnerException) {
            com.intellij.openapi.ui.Messages.showErrorDialog(project, ex.message, "TCalc Error")
        } catch (ex: Exception) {
            com.intellij.openapi.ui.Messages.showErrorDialog(project,
                "Report failed: ${ex.message}", "TCalc Error")
        }
    }
}
