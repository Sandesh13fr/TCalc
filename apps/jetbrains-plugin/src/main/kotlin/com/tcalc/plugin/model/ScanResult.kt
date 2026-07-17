package com.tcalc.plugin.model

data class ScanResult(
    val totalFiles: Int = 0,
    val totalTokens: Long = 0,
    val includedFiles: Int = 0,
    val includedTokens: Long = 0,
    val excludedFiles: Int = 0,
    val topFolders: List<FolderSummary> = emptyList(),
    val byExtension: Map<String, ExtensionSummary> = emptyMap(),
    val riskyFiles: List<String> = emptyList(),
    val privacy_mode: String = "local-first",
)

data class FolderSummary(
    val path: String = "",
    val files: Int = 0,
    val tokens: Long = 0,
)

data class ExtensionSummary(
    val files: Int = 0,
    val tokens: Long = 0,
)
