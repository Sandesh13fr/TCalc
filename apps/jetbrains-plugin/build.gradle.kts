plugins {
    id("org.jetbrains.kotlin.jvm") version "2.0.21"
    id("org.jetbrains.intellij.platform") version "2.2.1"
}

group = providers.gradleProperty("pluginGroup").get()
version = providers.gradleProperty("pluginVersion").get()

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    testImplementation(kotlin("test"))
    intellijPlatform {
        create(providers.gradleProperty("platformType").get(), providers.gradleProperty("platformVersion").get())
        pluginVerifier()
        zipSigner()
    }
}

intellijPlatform {
    pluginConfiguration {
        name = providers.gradleProperty("pluginName").get()
        id = "com.tcalc.plugin.tcalc-jetbrains"
        version = providers.gradleProperty("pluginVersion").get()
        description = "Local-first workspace token calculator, model recommender, and coding-agent optimizer for JetBrains IDEs."
        vendor {
            name = "TCalc"
            url = "https://github.com/Sandesh13fr/TCalc"
        }
        ideaVersion {
            sinceBuild = providers.gradleProperty("pluginSinceBuild").get()
            untilBuild = providers.gradleProperty("pluginUntilBuild").get()
        }
    }

    publishing {
        token = System.getenv("JETBRAINS_TOKEN") ?: ""
    }

    pluginVerification {
        ides {
            ide("IC", "2024.2")
            ide("IC", "2024.3")
        }
    }
}

kotlin {
    jvmToolchain(21)
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

tasks {
    buildSearchableOptions {
        enabled = false
    }
    named("instrumentCode") {
        enabled = false
    }
    named("instrumentTestCode") {
        enabled = false
    }
}
