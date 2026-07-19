package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.tcalc.plugin.runner.CliRunner

class GenerateRepoMapAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val basePath = project.basePath ?: return
        runCliAction(project, { CliRunner().generateRepoMap(basePath) }) { result ->
            confirmAndWrite(project, "REPO_MAP.md", result.stdout, "Repo Map Generated")
        }
    }
}
