package com.tcalc.plugin.model

data class RecommendResult(
    val workspaceSummary: WorkspaceSummary = WorkspaceSummary(),
    val recommendations: List<ModelRecommendation> = emptyList(),
)

data class WorkspaceSummary(
    val totalFiles: Int = 0,
    val totalTokens: Long = 0,
    val goal: String = "",
)

data class ModelRecommendation(
    val model: String = "",
    val provider: String = "",
    val contextWindow: Int = 0,
    val sufficient: Boolean = false,
    val costPerInputToken: Double = 0.0,
    val costPerOutputToken: Double = 0.0,
    val estimatedInputCost: Double = 0.0,
    val estimatedOutputCost: Double = 0.0,
)
