package com.drexonyx.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {

    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final String TAG = "DXWebView";

    private WebView webView;
    private View splashOverlay;
    private boolean overlayDismissed = false;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setBackgroundDrawableResource(android.R.color.black);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(Color.BLACK);
            getWindow().setNavigationBarColor(Color.BLACK);
        }

        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);

        configureWebView();
        setupWebViewClient();

        // Root: FrameLayout — WebView underneath, native splash overlay on top
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        root.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT));

        splashOverlay = buildSplashOverlay();
        root.addView(splashOverlay, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(root);

        handleDeepLink(getIntent());

        android.util.Log.d(TAG, "onCreate: loading index.html");
        webView.loadUrl("file:///android_asset/index.html");
    }

    private View buildSplashOverlay() {
        LinearLayout ll = new LinearLayout(this);
        ll.setOrientation(LinearLayout.VERTICAL);
        ll.setGravity(Gravity.CENTER);
        ll.setBackgroundColor(Color.BLACK);

        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int logoWidth = (int)(screenWidth * 0.85f);
        if (logoWidth > 340) logoWidth = 340;

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.dx_logo);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(
            logoWidth, LinearLayout.LayoutParams.WRAP_CONTENT);
        ll.addView(logo, logoParams);

        TextView name = new TextView(this);
        name.setText("DREXONYX");
        name.setTextColor(Color.WHITE);
        name.setTextSize(22f);
        name.setTypeface(Typeface.DEFAULT_BOLD);
        name.setGravity(Gravity.CENTER);
        if (Build.VERSION.SDK_INT >= 21) {
            name.setLetterSpacing(0.27f);
        }
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT);
        nameParams.topMargin = dpToPx(4);
        ll.addView(name, nameParams);

        TextView tagline = new TextView(this);
        tagline.setText("AI COMMERCIAL STUDIO");
        tagline.setTextColor(Color.parseColor("#d9a64a"));
        tagline.setTextSize(11f);
        tagline.setTypeface(Typeface.DEFAULT_BOLD);
        tagline.setGravity(Gravity.CENTER);
        if (Build.VERSION.SDK_INT >= 21) {
            tagline.setLetterSpacing(0.27f);
        }
        LinearLayout.LayoutParams taglineParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT);
        taglineParams.topMargin = dpToPx(8);
        ll.addView(tagline, taglineParams);

        return ll;
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private void dismissSplashOverlay() {
        if (overlayDismissed || splashOverlay == null) return;
        overlayDismissed = true;
        android.util.Log.d(TAG, "dismissSplashOverlay: fading out native overlay");
        splashOverlay.animate()
            .alpha(0f)
            .setDuration(500)
            .withEndAction(new Runnable() {
                @Override
                public void run() {
                    if (splashOverlay != null) {
                        splashOverlay.setVisibility(View.GONE);
                    }
                    android.util.Log.d(TAG, "dismissSplashOverlay: overlay removed");
                }
            })
            .start();
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setSupportZoom(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= 21) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        webView.addJavascriptInterface(new DrexonyxBridge(this), "Android");
    }

    private void setupWebViewClient() {
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("whatsapp:")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    return true;
                }
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                android.util.Log.d(TAG, "onPageStarted: " + url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                android.util.Log.d(TAG, "onPageFinished: " + url);
                // Short delay lets JS render Home before overlay fades
                new Handler().postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        dismissSplashOverlay();
                    }
                }, 400);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                android.util.Log.e(TAG, "onReceivedError: code=" + errorCode
                    + " desc=" + description + " url=" + failingUrl);
                // Always dismiss so user is never stuck
                dismissSplashOverlay();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                    WebChromeClient.FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                    filePathCallback = null;
                }
                filePathCallback = callback;
                Intent intent = params.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage msg) {
                android.util.Log.d(TAG, "JS[" + msg.messageLevel() + "] "
                    + msg.message() + " -- " + msg.sourceId() + ":" + msg.lineNumber());
                return true;
            }
        });
    }

    /** Called by DrexonyxBridge to open the system file picker */
    public void openFilePicker(String accept, boolean multiple) {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType(accept != null && !accept.isEmpty() ? accept : "*/*");
        if (multiple && Build.VERSION.SDK_INT >= 18) {
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(Intent.createChooser(intent, "Select File"), FILE_CHOOSER_REQUEST);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback != null) {
                Uri[] results = resultCode == RESULT_OK && data != null
                        ? WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                        : null;
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                String uri = data.getData().toString();
                webView.evaluateJavascript(
                    "if(window._onNativeFile) window._onNativeFile('" + uri.replace("'","") + "');",
                    null);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri uri = intent.getData();
        String url = uri.toString();
        if (webView != null) {
            String escaped = url.replace("'", "").replace("\"", "");
            webView.evaluateJavascript(
                "if(window._onDeepLink) window._onDeepLink('" + escaped + "');",
                null);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.evaluateJavascript("window._onBackPressed && window._onBackPressed()", value -> {
                if ("false".equals(value) || "null".equals(value) || value == null) {
                    if (webView.canGoBack()) webView.goBack();
                }
            });
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        if (webView != null) {
            webView.evaluateJavascript("if(window._onAppResume) window._onAppResume()", null);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
