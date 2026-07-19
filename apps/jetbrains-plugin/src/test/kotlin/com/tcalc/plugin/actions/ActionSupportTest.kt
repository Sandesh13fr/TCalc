package com.tcalc.plugin.actions

import java.nio.file.Files
import kotlin.io.path.createTempDirectory
import kotlin.test.Test
import kotlin.test.assertEquals

class ActionSupportTest {
    @Test
    fun `atomic action writes preserve the previous file`() {
        val directory = createTempDirectory("tcalc-action-")
        try {
            val output = directory.resolve("AGENTS.md")
            Files.writeString(output, "old")

            atomicWriteWithBackup(output, "new")

            assertEquals("new", Files.readString(output))
            assertEquals("old", Files.readString(directory.resolve("AGENTS.md.bak")))
        } finally {
            directory.toFile().deleteRecursively()
        }
    }
}
