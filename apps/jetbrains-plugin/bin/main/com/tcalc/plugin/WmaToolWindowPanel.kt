package com.tcalc.plugin

import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.ui.ConsoleView
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTextArea
import com.tcalc.plugin.runner.CliRunner
import com.tcalc.plugin.runner.CliRunnerException
import java.awt.BorderLayout
import java.awt.Font
import javax.swing.Box
import javax.swing.BoxLayout
import javax.swing.JButton
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants
import javax.swing.SwingUtilities

class WmaToolWindowPanel(private val project: Project) : SimpleToolWindowPanel(true, true) {

    private val outputArea = JBTextArea().apply {
        isEditable = false
        font = Font(Font.MONOSPACED, Font.PLAIN, 12)
        lineWrap = true
        wrapStyleWord = true
        background = JBColor.background()
    }

    private val statusLabel = JLabel("Ready", SwingConstants.LEFT)

    init {
        val toolbar = createToolbar()
        val content = createContent()
        setToolbar(toolbar)
        setContent(content)
    }

    private fun createToolbar(): JPanel {
        val toolbar = JPanel()
        toolbar.layout = BoxLayout(toolbar, BoxLayout.X_AXIS)
        toolbar.border = javax.swing.BorderFactory.createEmptyBorder(4, 4, 4, 4)

        toolbar.add(createButton("Scan Workspace") {
            val basePath = project.basePath ?: return@createButton
            runCliTask("Scanning...") { runner ->
                runner.scanWorkspace(basePath)
            }
        })
        toolbar.add(Box.createHorizontalStrut(4))
        toolbar.add(createButton("Compare Models") {
            val basePath = project.basePath ?: return@createButton
            runCliTask("Comparing models...") { runner ->
                runner.recommendModels(basePath)
            }
        })
        toolbar.add(Box.createHorizontalStrut(4))
        toolbar.add(createButton("Repo Map") {
            val basePath = project.basePath ?: return@createButton
            runCliTask("Generating repo map...") { runner ->
                runner.generateRepoMap(basePath)
            }
        })
        toolbar.add(Box.createHorizontalStrut(4))
        toolbar.add(createButton("Agent Rules") {
            val basePath = project.basePath ?: return@createButton
            runCliTask("Generating agent rules...") { runner ->
                runner.generateAgentRules(basePath)
            }
        })
        toolbar.add(Box.createHorizontalStrut(4))
        toolbar.add(createButton("Export Report") {
            val basePath = project.basePath ?: return@createButton
            runCliTask("Exporting report...") { runner ->
                runner.exportReport(basePath)
            }
        })

        toolbar.add(Box.createHorizontalGlue())
        toolbar.add(createButton("Settings") {
            com.intellij.openapi.options.ShowSettingsUtil.getInstance().showSettingsDialog(
                project, com.tcalc.plugin.settings.WmaSettingsConfigurable::class.java
            )
        })

        return toolbar
    }

    private fun createContent(): JPanel {
        val panel = JPanel(BorderLayout())
        panel.add(JBScrollPane(outputArea), BorderLayout.CENTER)
        panel.add(statusLabel, BorderLayout.SOUTH)
        return panel
    }

    private fun createButton(text: String, action: () -> Unit): JButton {
        return JButton(text).apply {
            addActionListener { action() }
        }
    }

    private fun runCliTask(statusText: String, task: (CliRunner) -> Unit) {
        statusLabel.text = statusText
        outputArea.text = ""

        SwingUtilities.invokeLater {
            try {
                val runner = CliRunner()
                task(runner)
                statusLabel.text = "Done"
            } catch (ex: CliRunnerException) {
                outputArea.text = "Error: ${ex.message}"
                statusLabel.text = "Failed"
            } catch (ex: Exception) {
                outputArea.text = "Unexpected error: ${ex.message}"
                statusLabel.text = "Failed"
            }
        }
    }
}
