package com.tcalc.plugin.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service

@Service
final class WmaSettingsState {

    var nodePath: String = ""
    var cliPath: String = ""
    var defaultGoal: String = "build-mvp"
    var privacyMode: String = "local-first"
    var tokenBudget: Int = 0

    companion object {
        fun getInstance(): WmaSettingsState {
            return ApplicationManager.getApplication().getService(WmaSettingsState::class.java)
        }
    }
}
