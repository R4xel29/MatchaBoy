package com.matchaboy.driver;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.WebView;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.OutputStream;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Keep screen awake for the driver app
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Show over lockscreen and turn screen on like a phone call
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        // Allow media autoplay without user interaction gesture (crucial for alarms)
        WebView webView = (WebView) this.getBridge().getWebView();
        if (webView != null) {
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            // Add Javascript Interface for local driver settings
            webView.addJavascriptInterface(new WebAppInterface(this), "AndroidDriverSettings");
        }

        // Request notification and location permissions dynamically
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.ArrayList<String> permissions = new java.util.ArrayList<>();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (this.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    permissions.add(Manifest.permission.POST_NOTIFICATIONS);
                }
            }
            if (this.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
            }
            if (this.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            }
            if (permissions.size() > 0) {
                this.requestPermissions(permissions.toArray(new String[0]), 101);
            }
        }

        // Prompt user to disable battery optimizations for uninterrupted background polling
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    Intent optIntent = new Intent();
                    optIntent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    optIntent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(optIntent);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Start background driver service
        try {
            Intent serviceIntent = new Intent(this, DriverService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                this.startForegroundService(serviceIntent);
            } else {
                this.startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Handle intent if launched from notification action
        handleIntent(getIntent());
    }

    private Handler cookieSyncHandler = new Handler(Looper.getMainLooper());
    private Runnable cookieSyncRunnable = new Runnable() {
        @Override
        public void run() {
            syncCookiesToPreferences();
            cookieSyncHandler.postDelayed(this, 5000); // Sync every 5 seconds
        }
    };

    private void syncCookiesToPreferences() {
        try {
            WebView webView = (WebView) this.getBridge().getWebView();
            if (webView != null) {
                CookieManager.getInstance().flush(); // Flush cookies to disk
                String cookieStr = CookieManager.getInstance().getCookie("https://arumseduh.vercel.app");
                if (cookieStr != null && cookieStr.contains("session-token")) {
                    SharedPreferences sharedPref = getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE);
                    SharedPreferences.Editor editor = sharedPref.edit();
                    editor.putString("session_cookie", cookieStr);
                    editor.apply();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Stop the alarm sound immediately when the app enters the foreground
        if (DriverService.instance != null) {
            DriverService.instance.stopAlertExternal();
        }
        // Start syncing cookies
        cookieSyncHandler.post(cookieSyncRunnable);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Stop syncing cookies when app is minimized/paused
        cookieSyncHandler.removeCallbacks(cookieSyncRunnable);
        // Force one final sync
        syncCookiesToPreferences();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && "ACCEPT_ORDER".equals(intent.getAction())) {
            String orderId = intent.getStringExtra("ORDER_ID");
            if (orderId != null) {
                // Stop the alarm immediately
                if (DriverService.instance != null) {
                    DriverService.instance.stopAlertExternal();
                }
                // Accept the order in background thread
                acceptOrderInBackground(orderId);
            }
        }
    }

    private void acceptOrderInBackground(final String orderId) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    SharedPreferences sharedPref = getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE);
                    String cookieStr = sharedPref.getString("session_cookie", null);
                    if (cookieStr == null) {
                        android.util.Log.e("MatchaboyDriver", "Cannot accept order: session cookie is null");
                        return;
                    }

                    URL url = new URL("https://arumseduh.vercel.app/api/driver/orders/" + orderId);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("PATCH");
                    conn.setRequestProperty("Cookie", cookieStr);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);

                    // Write JSON body: { "status": "PICKED_UP" }
                    JSONObject body = new JSONObject();
                    body.put("status", "PICKED_UP");
                    OutputStream os = conn.getOutputStream();
                    os.write(body.toString().getBytes("UTF-8"));
                    os.close();

                    int responseCode = conn.getResponseCode();
                    android.util.Log.d("MatchaboyDriver", "Accept order response code: " + responseCode);
                    
                    // Reload WebView on main thread to reflect changes
                    new Handler(Looper.getMainLooper()).post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                WebView webView = (WebView) getBridge().getWebView();
                                if (webView != null) {
                                    webView.reload();
                                }
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }).start();
    }

    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @android.webkit.JavascriptInterface
        public void setAlarmSetting(String key, String value) {
            SharedPreferences sharedPref = mContext.getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = sharedPref.edit();
            editor.putString(key, value);
            editor.apply();
        }

        @android.webkit.JavascriptInterface
        public String getAlarmSetting(String key, String defaultValue) {
            SharedPreferences sharedPref = mContext.getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE);
            return sharedPref.getString(key, defaultValue);
        }

        @android.webkit.JavascriptInterface
        public void setAlarmBooleanSetting(String key, boolean value) {
            SharedPreferences sharedPref = mContext.getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = sharedPref.edit();
            editor.putBoolean(key, value);
            editor.apply();
        }

        @android.webkit.JavascriptInterface
        public boolean getAlarmBooleanSetting(String key, boolean defaultValue) {
            SharedPreferences sharedPref = mContext.getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE);
            return sharedPref.getBoolean(key, defaultValue);
        }
    }
}
