package com.tcalc.plugin.runner

import com.intellij.openapi.diagnostic.thisLogger
import com.tcalc.plugin.settings.WmaSettingsState
import kotlinx.serialization.json.Json
import java.io.File
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

data class CliResult(
    val exitCode: Int,
    val stdout: String,
    val stderr: String,
)

class CliRunner {

    private val log = thisLogger()

    fun runCommand(args: List<String>, workspacePath: String, timeoutSeconds: Int = 60): CliResult {
        val settings = WmaSettingsState.getInstance()

        val nodePath = settings.nodePath.ifBlank { "node" }
        val cliPath = settings.cliPath.ifBlank {
            throw CliRunnerException("TCalc CLI path not configured. Set it in Settings → Tools → TCalc.")
        }

        val cliFile = File(cliPath)
        if (!cliFile.exists()) {
            throw CliRunnerException("CLI not found at: $cliPath. Check the path in Settings.")
        }

        val command = listOf(nodePath, cliPath) + args

        log.info("Running: ${command.joinToString(" ")}")

        val processBuilder = ProcessBuilder(command)
            .directory(File(workspacePath))
            .redirectErrorStream(false)

        return try {
            val process = processBuilder.start()
            val stdoutFuture = CompletableFuture.supplyAsync { process.inputStream.bufferedReader().readText() }
            val stderrFuture = CompletableFuture.supplyAsync { process.errorStream.bufferedReader().readText() }

            val finished = process.waitFor(timeoutSeconds.toLong(), TimeUnit.SECONDS)
            if (!finished) {
                process.destroyForcibly()
                process.waitFor()
                throw CliRunnerException("CLI command timed out after ${timeoutSeconds}s")
            }

            val stdout = stdoutFuture.get(5, TimeUnit.SECONDS)
            val stderr = stderrFuture.get(5, TimeUnit.SECONDS)
            val exitCode = process.exitValue()

            if (exitCode != 0) {
                log.warn("CLI exited with code $exitCode: $stderr")
            }

            CliResult(exitCode, stdout, stderr)
        } catch (e: CliRunnerException) {
            throw e
        } catch (e: Exception) {
            throw CliRunnerException("Failed to run CLI command: ${e.message}", e)
        }
    }

    fun scanWorkspace(workspacePath: String): CliResult {
        return runCommand(
            listOf("scan", workspacePath, "--format", "json"),
            workspacePath,
        )
    }

    fun recommendModels(workspacePath: String): CliResult {
        val settings = WmaSettingsState.getInstance()
        val args = mutableListOf("recommend", workspacePath, "--format", "json")
        if (settings.defaultGoal.isNotBlank()) {
            args.addAll(listOf("--goal", settings.defaultGoal))
        }
        if (settings.privacyMode.isNotBlank()) {
            args.addAll(listOf("--privacy", settings.privacyMode))
        }
        if (settings.tokenBudget > 0) {
            args.addAll(listOf("--token-budget", settings.tokenBudget.toString()))
        }
        return runCommand(args, workspacePath)
    }

    fun generateRepoMap(workspacePath: String): CliResult {
        val args = mutableListOf("repo-map", workspacePath, "--format", "markdown")
        val budget = WmaSettingsState.getInstance().tokenBudget
        if (budget > 0) {
            args.addAll(listOf("--budget", budget.toString()))
        }
        return runCommand(args, workspacePath)
    }

    fun generateAgentRules(workspacePath: String): CliResult {
        return runCommand(
            listOf("rules", workspacePath, "--target", "generic", "--mode", "repo-map-first", "--stdout"),
            workspacePath,
        )
    }

    fun exportReport(workspacePath: String): CliResult {
        val args = mutableListOf("report", workspacePath, "--format", "markdown", "--include-repo-map")
        val settings = WmaSettingsState.getInstance()
        if (settings.defaultGoal.isNotBlank()) {
            args.addAll(listOf("--goal", settings.defaultGoal))
        }
        if (settings.privacyMode.isNotBlank()) {
            args.addAll(listOf("--privacy", settings.privacyMode))
        }
        return runCommand(args, workspacePath)
    }
}

class CliRunnerException(message: String, cause: Throwable? = null) : Exception(message, cause)
