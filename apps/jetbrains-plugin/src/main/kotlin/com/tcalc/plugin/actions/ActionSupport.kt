package com.tcalc.plugin.actions

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.vfs.VirtualFileManager
import com.tcalc.plugin.runner.CliResult
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

internal fun runCliAction(project: Project, task: () -> CliResult, onSuccess: (CliResult) -> Unit) {
    ApplicationManager.getApplication().executeOnPooledThread {
        try {
            val result = task()
            ApplicationManager.getApplication().invokeLater {
                if (result.exitCode == 0) onSuccess(result)
                else Messages.showErrorDialog(project, result.stderr.ifBlank { "CLI exited with code ${result.exitCode}" }, "TCalc Error")
            }
        } catch (error: Exception) {
            ApplicationManager.getApplication().invokeLater {
                Messages.showErrorDialog(project, error.message ?: "Unknown error", "TCalc Error")
            }
        }
    }
}

internal fun confirmAndWrite(project: Project, fileName: String, content: String, title: String) {
    val outputPath = Path.of(project.basePath ?: return, fileName)
    val exists = Files.exists(outputPath)
    val backupNotice = if (exists) "\n\nThe existing file will be backed up to $fileName.bak." else ""
    val preview = content.take(4000) + if (content.length > 4000) "\n\n[preview truncated]" else ""
    if (Messages.showYesNoDialog(project, "Write this output to $fileName?$backupNotice\n\n$preview", title, Messages.getQuestionIcon()) != Messages.YES) return

    atomicWriteWithBackup(outputPath, content)
    VirtualFileManager.getInstance().refreshWithoutFileWatcher(false)
    VirtualFileManager.getInstance().findFileByNioPath(outputPath)?.let {
        FileEditorManager.getInstance(project).openFile(it, true)
    }
    Messages.showInfoMessage(project, "$fileName written successfully.", title)
}

internal fun atomicWriteWithBackup(outputPath: Path, content: String) {
    if (Files.exists(outputPath)) {
        Files.copy(outputPath, outputPath.resolveSibling("${outputPath.fileName}.bak"), StandardCopyOption.REPLACE_EXISTING)
    }
    val temporary = Files.createTempFile(outputPath.parent, ".${outputPath.fileName}.", ".tmp")
    try {
        Files.writeString(temporary, content)
        try {
            Files.move(temporary, outputPath, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        } catch (_: AtomicMoveNotSupportedException) {
            Files.move(temporary, outputPath, StandardCopyOption.REPLACE_EXISTING)
        }
    } finally {
        Files.deleteIfExists(temporary)
    }
}
