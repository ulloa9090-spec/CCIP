package com.boxop.phase0

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.Session
import com.google.ar.core.exceptions.UnavailableException
import java.time.Instant

/**
 * Reads real capability/permission state from the platform. Never guesses
 * from the device model name — every field is produced by calling the
 * relevant Android/ARCore API, per `docs/03_CLAUDE_CODE_RULES.md` rule 11.
 */
object CapabilityDetector {

    const val HARNESS_VERSION = "0.1.0-phase0"

    fun detect(context: Context): CapabilityMatrix {
        val packageManager = context.packageManager
        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager

        val cameraAvailable = packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)
        val cameraAuthorizationStatus = describeCameraPermission(context)

        val arAvailability = ArCoreApk.getInstance().checkAvailability(context)
        val arSupported = arAvailability.isSupported
        val arSupportDetail = "ArCoreApk.Availability.$arAvailability"

        val accelerometerAvailable = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null
        val gyroscopeAvailable = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE) != null
        val deviceMotionAvailable = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR) != null

        val depthSupported = checkArCoreDepthSupport(context, cameraAuthorizationStatus == "granted", arSupported)
        val tofAvailable = checkCamera2DepthOutputCapability(context)

        val (strategy, fallback) = recommendStrategy(
            arSupported = arSupported,
            depthSupported = depthSupported
        )

        return CapabilityMatrix(
            platform = "android",
            osVersion = "${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})",
            deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
            harnessVersion = HARNESS_VERSION,
            timestamp = Instant.now().toString(),
            cameraAvailable = cameraAvailable,
            cameraAuthorizationStatus = cameraAuthorizationStatus,
            arSupported = arSupported,
            arSupportDetail = arSupportDetail,
            // ARCore exposes plane finding as a Config option on any
            // session it can create; there is no separate capability flag.
            planeDetectionSupported = arSupported,
            accelerometerAvailable = accelerometerAvailable,
            gyroscopeAvailable = gyroscopeAvailable,
            deviceMotionAvailable = deviceMotionAvailable,
            depthSupported = depthSupported,
            // ARCore does not expose a distinct "LiDAR" API on Android the
            // way ARKit does; depthSupported above already reflects
            // whatever depth sensing (ToF, stereo, or software) ARCore can
            // fuse on this device.
            lidarAvailable = false,
            tofAvailable = tofAvailable,
            selectedMeasurementStrategy = strategy,
            fallbackStrategy = fallback,
            knownLimitations = "",
            rawNotes = ""
        )
    }

    private fun describeCameraPermission(context: Context): String {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        // Unlike iOS, Android's checkSelfPermission only distinguishes
        // granted vs. not-granted; it cannot tell "never asked" apart from
        // "denied" without an Activity reference to call
        // shouldShowRequestPermissionRationale. Documented in
        // phase0/shared/CAPABILITY_MATRIX.md.
        return if (granted) "granted" else "notGranted"
    }

    private fun recommendStrategy(arSupported: Boolean, depthSupported: Boolean): Pair<String, String> {
        if (depthSupported) {
            return "AR point-to-point using world tracking fused with the ARCore Depth API" to
                "Fall back to AR point-to-point without depth if depth data is unreliable in current lighting"
        }
        if (arSupported) {
            return "AR point-to-point using world tracking only (no depth)" to
                "Fall back to Reference-Assisted mode (known-size marker) if tracking is unstable"
        }
        return "Reference-Assisted mode using a calibrated marker/reference object" to
            "ARCore is not supported/installed on this device; measurement requires a visible reference"
    }

    /**
     * Official ARCore pattern for checking Depth API support: create a
     * temporary session and ask it directly, then close it. Requires
     * camera permission and ARCore to be installed, so this is skipped
     * (returns false) when either precondition is missing rather than
     * prompting for permission from a capability check.
     */
    private fun checkArCoreDepthSupport(context: Context, hasCameraPermission: Boolean, arSupported: Boolean): Boolean {
        if (!hasCameraPermission || !arSupported) return false
        var session: Session? = null
        return try {
            session = Session(context)
            session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
        } catch (e: UnavailableException) {
            false
        } catch (e: SecurityException) {
            false
        } catch (e: Exception) {
            false
        } finally {
            session?.close()
        }
    }

    /**
     * Raw Camera2 hardware signal, independent of ARCore: does any camera
     * on this device advertise DEPTH_OUTPUT capability (typically a
     * dedicated ToF sensor)? This is a different question from ARCore's
     * fused Depth API above, which can also work via stereo/software depth
     * on devices with no discrete ToF hardware.
     */
    private fun checkCamera2DepthOutputCapability(context: Context): Boolean {
        return try {
            val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            cameraManager.cameraIdList.any { cameraId ->
                val characteristics = cameraManager.getCameraCharacteristics(cameraId)
                val capabilities = characteristics.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
                capabilities?.contains(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_DEPTH_OUTPUT) == true
            }
        } catch (e: Exception) {
            false
        }
    }
}
