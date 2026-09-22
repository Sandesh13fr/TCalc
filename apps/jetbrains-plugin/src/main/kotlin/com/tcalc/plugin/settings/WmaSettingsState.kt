package com.tcalc.plugin.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@State(
    name = "TCalcSettings",
    storages = [Storage("tcalc.xml")]
)
final class WmaSettingsState : PersistentStateComponent<WmaSettingsState.State> {

    data class State(
        var nodePath: String = "",
        var cliPath: String = "",
        var defaultGoal: String = "build-mvp",
        var privacyMode: String = "local-first",
        var tokenBudget: Int = 0,
    )

    private var state = State()

    var nodePath: String
        get() = state.nodePath
        set(value) {
            state.nodePath = value
        }

    var cliPath: String
        get() = state.cliPath
        set(value) {
            state.cliPath = value
        }

    var defaultGoal: String
        get() = state.defaultGoal
        set(value) {
            state.defaultGoal = value
        }

    var privacyMode: String
        get() = state.privacyMode
        set(value) {
            state.privacyMode = value
        }

    var tokenBudget: Int
        get() = state.tokenBudget
        set(value) {
            state.tokenBudget = value
        }

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    companion object {
        fun getInstance(): WmaSettingsState {
            return ApplicationManager.getApplication().getService(WmaSettingsState::class.java)
        }
    }
}
