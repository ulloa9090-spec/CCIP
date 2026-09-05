package com.boxop.phase0

import org.json.JSONObject

/**
 * Canonical Phase 0 capability record.
 *
 * Field names and meaning are defined in
 * `phase0/shared/CAPABILITY_MATRIX.md` and
 * `phase0/shared/capability-matrix.schema.json`. Keep this data class in
 * sync with that document and with the iOS equivalent
 * (`CapabilityMatrix.swift`) field-for-field.
 */
data class CapabilityMatrix(
    val platform: String,
    val osVersion: String,
    val deviceModel: String,
    val harnessVersion: String,
    val timestamp: String,

    val cameraAvailable: Boolean,
    val cameraAuthorizationStatus: String,

    val arSupported: Boolean,
    val arSupportDetail: String,
    val planeDetectionSupported: Boolean,

    val accelerometerAvailable: Boolean,
    val gyroscopeAvailable: Boolean,
    val deviceMotionAvailable: Boolean,

    val depthSupported: Boolean,
    val lidarAvailable: Boolean,
    val tofAvailable: Boolean,

    val selectedMeasurementStrategy: String,
    val fallbackStrategy: String,
    val knownLimitations: String,
    val rawNotes: String
) {
    /** No JSON library dependency needed: org.json ships with Android. */
    fun toJson(): String {
        val json = JSONObject()
        json.put("platform", platform)
        json.put("osVersion", osVersion)
        json.put("deviceModel", deviceModel)
        json.put("harnessVersion", harnessVersion)
        json.put("timestamp", timestamp)
        json.put("cameraAvailable", cameraAvailable)
        json.put("cameraAuthorizationStatus", cameraAuthorizationStatus)
        json.put("arSupported", arSupported)
        json.put("arSupportDetail", arSupportDetail)
        json.put("planeDetectionSupported", planeDetectionSupported)
        json.put("accelerometerAvailable", accelerometerAvailable)
        json.put("gyroscopeAvailable", gyroscopeAvailable)
        json.put("deviceMotionAvailable", deviceMotionAvailable)
        json.put("depthSupported", depthSupported)
        json.put("lidarAvailable", lidarAvailable)
        json.put("tofAvailable", tofAvailable)
        json.put("selectedMeasurementStrategy", selectedMeasurementStrategy)
        json.put("fallbackStrategy", fallbackStrategy)
        json.put("knownLimitations", knownLimitations)
        json.put("rawNotes", rawNotes)
        return json.toString(2)
    }
}
