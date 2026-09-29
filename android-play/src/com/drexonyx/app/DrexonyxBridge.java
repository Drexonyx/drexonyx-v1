package com.drexonyx.app;

import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

/**
 * JavaScript→Java bridge exposed to the WebView as window.Android.
 * All methods annotated with @JavascriptInterface are callable from the SPA.
 */
public class DrexonyxBridge {

    private final MainActivity activity;

    public DrexonyxBridge(MainActivity activity) {
        this.activity = activity;
    }

    /** Open a URL in the system browser (for external payments, account deletion, etc.) */
    @JavascriptInterface
    public void openExternalUrl(String url) {
        if (url == null || (!url.startsWith("https://") && !url.startsWith("mailto:"))) return;
        activity.runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            activity.startActivity(intent);
        });
    }

    /** Open email client (contact action) */
    @JavascriptInterface
    public void openEmail(String address, String subject, String body) {
        activity.runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_SENDTO);
            intent.setData(Uri.parse("mailto:"));
            intent.putExtra(Intent.EXTRA_EMAIL, new String[]{address});
            if (subject != null) intent.putExtra(Intent.EXTRA_SUBJECT, subject);
            if (body != null) intent.putExtra(Intent.EXTRA_TEXT, body);
            if (intent.resolveActivity(activity.getPackageManager()) != null) {
                activity.startActivity(intent);
            }
        });
    }

    /** Share content using system share sheet */
    @JavascriptInterface
    public void shareText(String title, String text, String url) {
        activity.runOnUiThread(() -> {
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            if (text != null) intent.putExtra(Intent.EXTRA_TEXT, url != null ? text + " " + url : text);
            if (title != null) intent.putExtra(Intent.EXTRA_TITLE, title);
            activity.startActivity(Intent.createChooser(intent, "Share via"));
        });
    }

    /** Launch file picker for uploads. Returns via Android.onFilesSelected() callback. */
    @JavascriptInterface
    public void openFilePicker(String accept, boolean multiple) {
        activity.openFilePicker(accept, multiple);
    }

    /** Show native toast */
    @JavascriptInterface
    public void showToast(String message) {
        activity.runOnUiThread(() ->
            Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
        );
    }

    /** Returns true if the device has active network connectivity */
    @JavascriptInterface
    public boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) activity.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkInfo info = cm.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    /** Device info for analytics / debug */
    @JavascriptInterface
    public String getDeviceInfo() {
        return "{\"platform\":\"android\",\"sdk\":" + Build.VERSION.SDK_INT
                + ",\"model\":\"" + Build.MODEL.replace("\"", "") + "\""
                + ",\"package\":\"com.drexonyx.app\""
                + ",\"appVersion\":\"1.0.0\"}";
    }

    /** Clipboard write */
    @JavascriptInterface
    public void copyToClipboard(String text) {
        activity.runOnUiThread(() -> {
            android.content.ClipboardManager clipboard =
                (android.content.ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard != null) {
                clipboard.setPrimaryClip(android.content.ClipData.newPlainText("DREXONYX", text));
                Toast.makeText(activity, "Copied", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
