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
    intellijPlatform {
        create(providers.gradleProperty("platformType").get(), providers.gradleProperty("platformVersion").get())
        pluginVerifier()
        zipSigner()
    }
}

intellijPlatform {
    pluginConfiguration {
        name = providers.gradleProperty("pluginName").get()
        id = "${providers.gradleProperty("pluginGroup").get()}.${providers.gradleProperty("pluginName").get()}"
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
            recommended()
        }
    }
}

kotlin {
    jvmToolchain(17)
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

tasks {
    buildSearchableOptions {
        enabled = false
    }
    named("instrumentCode") {
        enabled = false
    }
}
