package com.smartattend.domain.model

import com.google.gson.annotations.SerializedName

data class UpdateProfilePhotoRequest(
    @SerializedName("photoBase64") val photoBase64: String
)

data class UpdateProfilePhotoResponse(
    val message: String,
    @SerializedName("profilePhoto") val profilePhoto: String?
)
