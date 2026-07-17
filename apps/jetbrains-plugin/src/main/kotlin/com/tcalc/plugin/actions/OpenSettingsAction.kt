package com.tcalc.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.options.ShowSettingsUtil
import com.tcalc.plugin.settings.WmaSettingsConfigurable

class OpenSettingsAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        ShowSettingsUtil.getInstance().showSettingsDialog(e.project, WmaSettingsConfigurable::class.java)
    }
}
