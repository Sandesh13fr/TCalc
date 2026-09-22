package com.tcalc.plugin.settings

import com.intellij.util.xmlb.XmlSerializer
import kotlin.test.Test
import kotlin.test.assertEquals

class WmaSettingsStateTest {
    @Test
    fun `fresh state keeps documented defaults`() {
        val settings = WmaSettingsState()

        assertEquals("", settings.nodePath)
        assertEquals("", settings.cliPath)
        assertEquals("build-mvp", settings.defaultGoal)
        assertEquals("local-first", settings.privacyMode)
        assertEquals(0, settings.tokenBudget)
    }

    @Test
    fun `loadState restores all persisted settings`() {
        val settings = WmaSettingsState()
        val persisted = WmaSettingsState.State(
            nodePath = "/usr/local/bin/node",
            cliPath = "/opt/tcalc/bin/tcalc",
            defaultGoal = "security-review",
            privacyMode = "cloud-ok",
            tokenBudget = 32000,
        )

        settings.loadState(persisted)

        assertEquals("/usr/local/bin/node", settings.nodePath)
        assertEquals("/opt/tcalc/bin/tcalc", settings.cliPath)
        assertEquals("security-review", settings.defaultGoal)
        assertEquals("cloud-ok", settings.privacyMode)
        assertEquals(32000, settings.tokenBudget)
        assertEquals(persisted, settings.state)
    }
    @Test
    fun `state survives XML serialization round trip`() {
        val original = WmaSettingsState.State(
            nodePath = "/usr/local/bin/node",
            cliPath = "/opt/tcalc/bin/tcalc",
            defaultGoal = "security-review",
            privacyMode = "cloud-ok",
            tokenBudget = 32000,
        )

        val xml = XmlSerializer.serialize(original)
        val restored = XmlSerializer.deserialize(xml, WmaSettingsState.State::class.java)
        val settings = WmaSettingsState()
        settings.loadState(restored)

        assertEquals("/usr/local/bin/node", settings.nodePath)
        assertEquals("/opt/tcalc/bin/tcalc", settings.cliPath)
        assertEquals("security-review", settings.defaultGoal)
        assertEquals("cloud-ok", settings.privacyMode)
        assertEquals(32000, settings.tokenBudget)
    }
}
