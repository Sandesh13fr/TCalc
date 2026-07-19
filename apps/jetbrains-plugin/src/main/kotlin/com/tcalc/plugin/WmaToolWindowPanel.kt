package com.tcalc.plugin

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTextArea
import com.tcalc.plugin.runner.CliRunner
import com.tcalc.plugin.runner.CliResult
import com.tcalc.plugin.runner.CliRunnerException
import kotlinx.serialization.json.Json
import java.awt.BorderLayout
import java.awt.Font
import javax.swing.Box
import javax.swing.BoxLayout
import javax.swing.JButton
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants

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

    private fun runCliTask(statusText: String, task: (CliRunner) -> CliResult) {
        statusLabel.text = statusText
        outputArea.text = ""

        ApplicationManager.getApplication().executeOnPooledThread {
            try {
                val result = task(CliRunner())
                ApplicationManager.getApplication().invokeLater { showResult(result) }
            } catch (ex: CliRunnerException) {
                showError(ex.message)
            } catch (ex: Exception) {
                showError("Unexpected error: ${ex.message}")
            }
        }
    }

    fun showResult(result: CliResult) {
        outputArea.text = if (result.exitCode == 0) formatOutput(result.stdout) else result.stderr.ifBlank { "CLI exited with code ${result.exitCode}" }
        outputArea.caretPosition = 0
        statusLabel.text = if (result.exitCode == 0) "Done" else "Failed"
    }

    private fun showError(message: String?) {
        ApplicationManager.getApplication().invokeLater {
            outputArea.text = "Error: ${message ?: "Unknown error"}"
            statusLabel.text = "Failed"
        }
    }

    private fun formatOutput(output: String): String = try {
        Json { prettyPrint = true }.encodeToString(kotlinx.serialization.json.JsonElement.serializer(), Json.parseToJsonElement(output))
    } catch (_: Exception) {
        output
    }
}
