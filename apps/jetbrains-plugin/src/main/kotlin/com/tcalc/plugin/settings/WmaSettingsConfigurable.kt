package com.tcalc.plugin.settings

import com.intellij.openapi.options.Configurable
import java.awt.BorderLayout
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.JTextField
import javax.swing.JComboBox
import javax.swing.JSpinner
import javax.swing.SpinnerNumberModel
import javax.swing.BoxLayout
import javax.swing.BorderFactory
import java.awt.GridBagLayout
import java.awt.GridBagConstraints

class WmaSettingsConfigurable : Configurable {

    private var panel: JPanel? = null
    private var nodePathField: JTextField = JTextField()
    private var cliPathField: JTextField = JTextField()
    private var goalField: JTextField = JTextField()
    private var privacyCombo: JComboBox<String> = JComboBox(arrayOf("local-first", "cloud-ok"))
    private var budgetSpinner: JSpinner = JSpinner(SpinnerNumberModel(0, 0, 1_000_000, 1000))

    override fun getDisplayName(): String = "TCalc"

    override fun createComponent(): JComponent {
        val settings = WmaSettingsState.getInstance()

        nodePathField.text = settings.nodePath
        cliPathField.text = settings.cliPath
        goalField.text = settings.defaultGoal
        privacyCombo.selectedItem = settings.privacyMode
        budgetSpinner.value = settings.tokenBudget

        val panel = JPanel(GridBagLayout()).apply {
            border = BorderFactory.createEmptyBorder(10, 10, 10, 10)
        }
        val c = GridBagConstraints().apply {
            fill = GridBagConstraints.HORIZONTAL
            insets = java.awt.Insets(4, 4, 4, 4)
            gridy = 0
        }

        fun addRow(label: String, component: JComponent) {
            c.gridx = 0
            c.weightx = 0.0
            panel.add(JLabel(label), c)
            c.gridx = 1
            c.weightx = 1.0
            panel.add(component, c)
            c.gridy++
        }

        addRow("Node executable path:", nodePathField)
        addRow("WMA CLI path:", cliPathField)
        addRow("Default goal:", goalField)
        addRow("Privacy mode:", privacyCombo)
        addRow("Token budget:", JPanel().apply {
            layout = BorderLayout()
            add(budgetSpinner, BorderLayout.WEST)
        })

        val note = JLabel("<html><small>Set Node path and WMA CLI path to enable scanning. " +
                "CLI must be built first with <code>pnpm build</code>.</small></html>")
        c.gridx = 0
        c.gridwidth = 2
        c.weightx = 1.0
        panel.add(note, c)

        this.panel = panel
        return panel
    }

    override fun isModified(): Boolean {
        val s = WmaSettingsState.getInstance()
        return nodePathField.text != s.nodePath ||
                cliPathField.text != s.cliPath ||
                goalField.text != s.defaultGoal ||
                privacyCombo.selectedItem != s.privacyMode ||
                budgetSpinner.value != s.tokenBudget
    }

    override fun apply() {
        val s = WmaSettingsState.getInstance()
        s.nodePath = nodePathField.text.trim()
        s.cliPath = cliPathField.text.trim()
        s.defaultGoal = goalField.text.trim()
        s.privacyMode = privacyCombo.selectedItem as? String ?: "local-first"
        s.tokenBudget = budgetSpinner.value as? Int ?: 0
    }

    override fun reset() {
        val s = WmaSettingsState.getInstance()
        nodePathField.text = s.nodePath
        cliPathField.text = s.cliPath
        goalField.text = s.defaultGoal
        privacyCombo.selectedItem = s.privacyMode
        budgetSpinner.value = s.tokenBudget
    }
}
