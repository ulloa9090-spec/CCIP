// Pinned to a version line that has been stable for a full release cycle
// rather than the newest available, since this project cannot be built or
// verified in the environment that generated it. Before your first build,
// Android Studio will offer an "Upgrade Assistant" if a newer stable AGP
// is available — safe to accept, but do it as its own step so any
// migration issues are easy to isolate.
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.0" apply false
}
