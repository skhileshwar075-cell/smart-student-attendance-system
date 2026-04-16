# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in the Android SDK tools/proguard/proguard-android.txt

# Keep Retrofit interfaces
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# Keep OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Keep Gson model classes
-keep class com.smartattend.domain.model.** { *; }
-keep class com.smartattend.data.api.** { *; }

# Keep Hilt
-keep class dagger.hilt.** { *; }
-keep @dagger.hilt.android.HiltAndroidApp class * { *; }
-keep @dagger.hilt.android.AndroidEntryPoint class * { *; }

# Keep Parcelable
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
