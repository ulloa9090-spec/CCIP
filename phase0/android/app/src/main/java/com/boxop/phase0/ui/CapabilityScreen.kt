package com.boxop.phase0.ui

import android.Manifest
import android.content.Intent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Divider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.boxop.phase0.CapabilityDetector
import com.boxop.phase0.CapabilityMatrix
import java.io.File

/**
 * Phase 0 shell. Currently ships the capability report only; the AR
 * point-to-point measurement screen is the next queued task (see
 * phase0/README.md).
 */
@Composable
fun CapabilityScreen() {
    val context = LocalContext.current
    var matrix by remember { mutableStateOf(CapabilityDetector.detect(context)) }
    var knownLimitations by remember { mutableStateOf("") }
    var rawNotes by remember { mutableStateOf("") }

    val requestCameraPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        matrix = CapabilityDetector.detect(context)
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text("BoxOp Phase 0", style = androidx.compose.material3.MaterialTheme.typography.headlineSmall)

        SectionTitle("Device")
        Row("Platform", matrix.platform)
        Row("OS version", matrix.osVersion)
        Row("Device model", matrix.deviceModel)
        Row("Harness version", matrix.harnessVersion)

        SectionTitle("Camera")
        Row("Available", boolText(matrix.cameraAvailable))
        Row("Permission", matrix.cameraAuthorizationStatus)
        if (matrix.cameraAuthorizationStatus == "notGranted") {
            Button(onClick = { requestCameraPermission.launch(Manifest.permission.CAMERA) }) {
                Text("Request Camera Permission")
            }
        }

        SectionTitle("AR / Spatial")
        Row("ARCore supported", boolText(matrix.arSupported))
        Row("Detail", matrix.arSupportDetail)
        Row("Plane detection", boolText(matrix.planeDetectionSupported))

        SectionTitle("Motion")
        Row("Accelerometer", boolText(matrix.accelerometerAvailable))
        Row("Gyroscope", boolText(matrix.gyroscopeAvailable))
        Row("Device motion (rotation vector)", boolText(matrix.deviceMotionAvailable))

        SectionTitle("Depth")
        Row("ARCore Depth API supported", boolText(matrix.depthSupported))
        Row("LiDAR mesh available", boolText(matrix.lidarAvailable))
        Row("Camera2 ToF (DEPTH_OUTPUT)", boolText(matrix.tofAvailable))

        SectionTitle("Recommended strategy")
        Text(matrix.selectedMeasurementStrategy)
        Text("Fallback: ${matrix.fallbackStrategy}", style = androidx.compose.material3.MaterialTheme.typography.bodySmall)

        SectionTitle("Tester notes")
        OutlinedTextField(
            value = knownLimitations,
            onValueChange = { knownLimitations = it },
            label = { Text("Known limitations observed") },
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = rawNotes,
            onValueChange = { rawNotes = it },
            label = { Text("Raw notes") },
            modifier = Modifier.fillMaxWidth()
        )

        Divider(modifier = Modifier.padding(vertical = 8.dp))

        Button(onClick = { matrix = CapabilityDetector.detect(context) }) {
            Text("Refresh")
        }
        Button(onClick = {
            val finalMatrix = matrix.copy(knownLimitations = knownLimitations, rawNotes = rawNotes)
            shareCapabilityMatrix(context, finalMatrix)
        }) {
            Text("Export Capability Matrix (JSON)")
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text,
        style = androidx.compose.material3.MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(top = 12.dp, bottom = 4.dp)
    )
}

@Composable
private fun Row(label: String, value: String) {
    Text("$label: $value")
}

private fun boolText(value: Boolean) = if (value) "Yes" else "No"

private fun shareCapabilityMatrix(context: android.content.Context, matrix: CapabilityMatrix) {
    val exportsDir = File(context.cacheDir, "exports").apply { mkdirs() }
    val file = File(exportsDir, "boxop-capability-matrix-${System.currentTimeMillis()}.json")
    file.writeText(matrix.toJson())

    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/json"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Share BoxOp capability matrix"))
}
