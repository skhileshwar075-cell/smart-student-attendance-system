package com.fanind09.smartattendance

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ConsoleMessage
import android.util.Log
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.fanind09.smartattendance.BuildConfig
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import com.fanind09.smartattendance.databinding.ActivityMainBinding
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    companion object {
        // Updated to use the NEW Network IP and Frontend (Vite) port (5173)
        const val BASE_URL = "https://smart-student-attendance-system-ten.vercel.app/"
        private const val PERMISSION_REQUEST_CODE = 1001
    }

    private lateinit var binding: ActivityMainBinding
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileChooserCallback ?: return@registerForActivityResult
        val uris: Array<Uri>? = when {
            result.resultCode != RESULT_OK -> null
            result.data?.dataString != null -> arrayOf(Uri.parse(result.data!!.dataString))
            result.data?.clipData != null -> {
                val clip = result.data!!.clipData!!
                Array(clip.itemCount) { clip.getItemAt(it).uri }
            }
            cameraImageUri != null -> arrayOf(cameraImageUri!!)
            else -> null
        }
        callback.onReceiveValue(uris)
        fileChooserCallback = null
        cameraImageUri = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, 0)
            insets
        }

        setupWebView()
        setupSwipeRefresh()
        setupBackHandler()
        setupRetryButton()

        if (savedInstanceState != null) {
            binding.webView.restoreState(savedInstanceState)
            cameraImageUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                savedInstanceState.getParcelable("cameraImageUri", Uri::class.java)
            } else {
                @Suppress("DEPRECATION")
                savedInstanceState.getParcelable("cameraImageUri")
            }
        } else {
            loadStartUrl()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val wv = binding.webView
        with(wv.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            allowFileAccess = false
            allowContentAccess = false
            setGeolocationEnabled(true)
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            userAgentString = "$userAgentString SmartAttendanceAndroid/${BuildConfig.VERSION_NAME}"
        }

        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(wv.settings, false)
        } else if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            @Suppress("DEPRECATION")
            WebSettingsCompat.setForceDark(wv.settings, WebSettingsCompat.FORCE_DARK_OFF)
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(wv, true)
        }

        wv.isVerticalScrollBarEnabled = true
        wv.isHorizontalScrollBarEnabled = false
        wv.overScrollMode = View.OVER_SCROLL_NEVER

        wv.webViewClient = AppWebViewClient()
        wv.webChromeClient = AppWebChromeClient()
        wv.setDownloadListener(AppDownloadListener())
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setOnRefreshListener {
            if (isOnline()) {
                binding.webView.reload()
            } else {
                binding.swipeRefresh.isRefreshing = false
                showOfflineView()
            }
        }
    }

    private fun setupBackHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    confirmExit()
                }
            }
        })
    }

    private fun setupRetryButton() {
        binding.retryButton.setOnClickListener {
            if (isOnline()) {
                hideOfflineView()
                if (binding.webView.url.isNullOrEmpty()) loadStartUrl() else binding.webView.reload()
            } else {
                Toast.makeText(this, R.string.still_offline, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadStartUrl() {
        if (isOnline()) {
            val url = if (BuildConfig.DEBUG && (Build.PRODUCT.contains("sdk") || Build.MODEL.contains("Emulator"))) {
                // For emulator, replace the PC's IP with 10.0.2.2 if developing locally
                val uri = Uri.parse(BASE_URL)
                if (uri.host?.startsWith("10.") == true || uri.host == "localhost") {
                    uri.buildUpon().encodedAuthority("10.0.2.2:${uri.port}").build().toString()
                } else {
                    BASE_URL
                }
            } else {
                BASE_URL
            }
            binding.webView.loadUrl(url)
        } else {
            showOfflineView()
        }
    }

    private fun confirmExit() {
        AlertDialog.Builder(this)
            .setTitle(R.string.exit_title)
            .setMessage(R.string.exit_message)
            .setPositiveButton(R.string.exit_yes) { _, _ -> finish() }
            .setNegativeButton(R.string.exit_no, null)
            .show()
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        // Relaxed for local development: only check for INTERNET capability
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun showOfflineView() {
        binding.offlineView.visibility = View.VISIBLE
        binding.progressBar.visibility = View.GONE
    }

    private fun hideOfflineView() {
        binding.offlineView.visibility = View.GONE
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
        outState.putParcelable("cameraImageUri", cameraImageUri)
    }

    override fun onPause() {
        super.onPause()
        binding.webView.onPause()
        CookieManager.getInstance().flush()
    }

    override fun onResume() {
        super.onResume()
        binding.webView.onResume()
    }

    override fun onDestroy() {
        binding.webView.apply {
            stopLoading()
            settings.javaScriptEnabled = false
            clearHistory()
            removeAllViews()
            destroy()
        }
        super.onDestroy()
    }

    /* ---------------- WebViewClient ---------------- */
    private inner class AppWebViewClient : WebViewClient() {
        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            binding.progressBar.visibility = View.VISIBLE
        }

        override fun onPageFinished(view: WebView?, url: String?) {
            binding.progressBar.visibility = View.GONE
            binding.swipeRefresh.isRefreshing = false
            CookieManager.getInstance().flush()
        }

        override fun shouldOverrideUrlLoading(
            view: WebView,
            request: WebResourceRequest
        ): Boolean {
            val url = request.url
            val scheme = url.scheme ?: return false

            // Handle special schemes
            when (scheme) {
                "mailto", "tel", "sms", "geo", "intent" -> {
                    return openExternal(Intent(Intent.ACTION_VIEW, url))
                }
            }

            val host = url.host ?: return false
            val baseHost = Uri.parse(BASE_URL).host ?: return false

            // Keep same-host navigation inside WebView
            // Also trust 10.0.2.2 for emulator support
            val isLocalHost = host.equals(baseHost, ignoreCase = true) ||
                    host.endsWith(".$baseHost", ignoreCase = true) ||
                    host == "10.0.2.2" ||
                    host == "localhost"

            return if (isLocalHost) {
                false
            } else {
                openExternal(Intent(Intent.ACTION_VIEW, url))
            }
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            if (request?.isForMainFrame == true) {
                binding.progressBar.visibility = View.GONE
                binding.swipeRefresh.isRefreshing = false
                if (!isOnline()) showOfflineView()
            }
        }

        override fun onReceivedSslError(
            view: WebView?,
            handler: SslErrorHandler?,
            error: SslError?
        ) {
            val builder = AlertDialog.Builder(this@MainActivity)
            builder.setTitle(R.string.ssl_error_title)
            builder.setMessage(R.string.ssl_error_message)
            builder.setPositiveButton(R.string.continue_anyway) { _, _ -> handler?.proceed() }
            builder.setNegativeButton(R.string.cancel) { _, _ -> handler?.cancel() }
            
            // Only allow proceeding in DEBUG builds, or show warning in production
            if (BuildConfig.DEBUG) {
                builder.show()
            } else {
                handler?.cancel()
                Toast.makeText(this@MainActivity, R.string.ssl_error, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun openExternal(intent: Intent): Boolean {
        return try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
            true
        } catch (_: Exception) {
            Toast.makeText(this, R.string.no_app_to_handle, Toast.LENGTH_SHORT).show()
            true
        }
    }

    /* ---------------- WebChromeClient ---------------- */
    private var geolocationOrigin: String? = null
    private var geolocationCallback: android.webkit.GeolocationPermissions.Callback? = null

    private inner class AppWebChromeClient : WebChromeClient() {
        override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
            if (BuildConfig.DEBUG) {
                consoleMessage?.let {
                    Log.d("WebViewConsole", "${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}")
                }
            }
            return true
        }

        override fun onProgressChanged(view: WebView?, newProgress: Int) {
            binding.progressBar.progress = newProgress
            binding.progressBar.visibility =
                if (newProgress in 1..99) View.VISIBLE else View.GONE
        }

        override fun onPermissionRequest(request: PermissionRequest) {
            runOnUiThread {
                val needed = mutableListOf<String>()
                request.resources.forEach {
                    when (it) {
                        PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                            needed += Manifest.permission.CAMERA
                        PermissionRequest.RESOURCE_AUDIO_CAPTURE ->
                            needed += Manifest.permission.RECORD_AUDIO
                    }
                }
                if (needed.isEmpty()) {
                    request.grant(request.resources)
                    return@runOnUiThread
                }
                val missing = needed.filter {
                    ContextCompat.checkSelfPermission(this@MainActivity, it) !=
                            PackageManager.PERMISSION_GRANTED
                }
                if (missing.isEmpty()) {
                    request.grant(request.resources)
                } else {
                    pendingPermissionRequest = request
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        missing.toTypedArray(),
                        PERMISSION_REQUEST_CODE
                    )
                }
            }
        }

        override fun onGeolocationPermissionsShowPrompt(
            origin: String?,
            callback: android.webkit.GeolocationPermissions.Callback?
        ) {
            val permissions = arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
            val missing = permissions.filter {
                ContextCompat.checkSelfPermission(this@MainActivity, it) != PackageManager.PERMISSION_GRANTED
            }

            if (missing.isNotEmpty()) {
                geolocationOrigin = origin
                geolocationCallback = callback
                ActivityCompat.requestPermissions(
                    this@MainActivity,
                    missing.toTypedArray(),
                    PERMISSION_REQUEST_CODE
                )
            } else {
                callback?.invoke(origin, true, false)
            }
        }

        override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams
        ): Boolean {
            fileChooserCallback?.onReceiveValue(null)
            fileChooserCallback = filePathCallback

            val contentSelectionIntent = fileChooserParams.createIntent().apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                if (fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }
            }

            val takePictureIntent = createCameraIntent()
            val chooser = Intent(Intent.ACTION_CHOOSER).apply {
                putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                putExtra(Intent.EXTRA_TITLE, getString(R.string.choose_file))
                if (takePictureIntent != null) {
                    putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(takePictureIntent))
                }
            }

            return try {
                fileChooserLauncher.launch(chooser)
                true
            } catch (_: Exception) {
                fileChooserCallback = null
                false
            }
        }
    }

    private fun createCameraIntent(): Intent? {
        val cameraGranted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        if (!cameraGranted) {
            return null
        }
        return try {
            val photoFile = createImageFile() ?: return null
            cameraImageUri = FileProvider.getUriForFile(
                this, "$packageName.fileprovider", photoFile
            )
            Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun createImageFile(): File? {
        return try {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val storageDir = File(filesDir, "images").apply { mkdirs() }
            File.createTempFile("IMG_${timeStamp}_", ".jpg", storageDir)
        } catch (_: Exception) {
            null
        }
    }

    /* ---------------- Downloads ---------------- */
    private inner class AppDownloadListener : DownloadListener {
        override fun onDownloadStart(
            url: String?, userAgent: String?, contentDisposition: String?,
            mimeType: String?, contentLength: Long
        ) {
            url ?: return

            // Request notification permission on Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(
                        this@MainActivity, Manifest.permission.POST_NOTIFICATIONS
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        PERMISSION_REQUEST_CODE
                    )
                }
            }

            try {
                val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimeType)
                    addRequestHeader("User-Agent", userAgent)
                    addRequestHeader(
                        "Cookie",
                        CookieManager.getInstance().getCookie(url) ?: ""
                    )
                    setNotificationVisibility(
                        DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                    )
                    setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS, fileName
                    )
                    setAllowedOverMetered(true)
                    setAllowedOverRoaming(true)
                    setTitle(fileName)
                    setDescription(getString(R.string.downloading))
                }
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(
                    this@MainActivity, R.string.download_started, Toast.LENGTH_SHORT
                ).show()
            } catch (_: Exception) {
                Toast.makeText(
                    this@MainActivity, R.string.download_failed, Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val anyGranted = grantResults.isNotEmpty() &&
                    grantResults.any { it == PackageManager.PERMISSION_GRANTED }
            
            // For general requests like Camera/Mic, we check if all requested were granted
            val allGranted = grantResults.isNotEmpty() &&
                    grantResults.all { it == PackageManager.PERMISSION_GRANTED }

            // Handle pending WebView PermissionRequest (Camera/Microphone)
            pendingPermissionRequest?.let { request ->
                if (allGranted) {
                    request.grant(request.resources)
                } else {
                    request.deny()
                }
                pendingPermissionRequest = null
            }

            // Handle pending Geolocation permission
            // For Geolocation, we allow it if at least one (Coarse or Fine) is granted
            geolocationCallback?.let { callback ->
                val locationGranted = permissions.indices.any { i ->
                    (permissions[i] == Manifest.permission.ACCESS_FINE_LOCATION ||
                     permissions[i] == Manifest.permission.ACCESS_COARSE_LOCATION) &&
                    grantResults[i] == PackageManager.PERMISSION_GRANTED
                }
                callback.invoke(geolocationOrigin, locationGranted, false)
                geolocationCallback = null
                geolocationOrigin = null
            }

            if (!anyGranted && permissions.isNotEmpty() && permissions[0] != Manifest.permission.POST_NOTIFICATIONS) {
                Toast.makeText(this, R.string.permission_denied, Toast.LENGTH_SHORT).show()
            }
        }
    }
}
