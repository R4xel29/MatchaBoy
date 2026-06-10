package com.matchaboy.driver;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONArray;
import org.json.JSONObject;

public class DriverService extends Service {
    public static DriverService instance = null;
    
    private static final String CHANNEL_ID = "DriverServiceChannel";
    private static final String ALERT_CHANNEL_ID = "DriverAlertChannel";
    private static final int FOREGROUND_NOTIFICATION_ID = 888;
    private static final int ALERT_NOTIFICATION_ID = 999;
    
    private Handler handler = new Handler(Looper.getMainLooper());
    private Thread pollingThread = null;
    private boolean isPollingRunning = false;
    private boolean isAlerting = false;
    private String currentAlertingOrderId = null;
    private MediaPlayer mediaPlayer = null;
    private Vibrator vibrator = null;
    
    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannels();
        
        // Show persistent foreground notification
        Notification notification = buildForegroundNotification();
        try {
            if (Build.VERSION.SDK_INT >= 34) { // Android 14+
                startForeground(FOREGROUND_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } else {
                startForeground(FOREGROUND_NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e("DriverService", "Failed to start foreground service: " + e.getMessage());
            try {
                // Fallback for older versions or missing service type permissions
                startForeground(FOREGROUND_NOTIFICATION_ID, notification);
            } catch (Exception ex) {
                Log.e("DriverService", "Fallback startForeground also failed: " + ex.getMessage());
            }
        }
        
        // Start polling
        startPolling();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if ("STOP_ALERT".equals(action)) {
                stopAlert();
            }
        }
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        stopPolling();
        stopAlert();
        instance = null;
        super.onDestroy();
    }
    
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.d("DriverService", "onTaskRemoved called, rescheduling service restart");
        // Schedule the service to restart in 1 second using AlarmManager
        try {
            Intent restartServiceIntent = new Intent(getApplicationContext(), this.getClass());
            restartServiceIntent.setPackage(getPackageName());
            PendingIntent restartServicePendingIntent = PendingIntent.getService(
                getApplicationContext(), 
                1, 
                restartServiceIntent, 
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );
            android.app.AlarmManager alarmService = (android.app.AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmService != null) {
                alarmService.set(
                    android.app.AlarmManager.ELAPSED_REALTIME,
                    android.os.SystemClock.elapsedRealtime() + 1000,
                    restartServicePendingIntent
                );
            }
        } catch (Exception e) {
            Log.e("DriverService", "Failed to reschedule service restart: " + e.getMessage());
        }
        super.onTaskRemoved(rootIntent);
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    public void stopAlertExternal() {
        handler.post(new Runnable() {
            @Override
            public void run() {
                stopAlert();
            }
        });
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Channel for foreground service
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "Matchaboy Driver Service",
                NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Keeps the driver app polling for new orders in the background");
            
            // Channel for loud alerts
            NotificationChannel alertChannel = new NotificationChannel(
                ALERT_CHANNEL_ID,
                "Driver New Order Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("Plays a loud alarm and vibrates for new driver assignments");
            alertChannel.enableVibration(true);
            alertChannel.setBypassDnd(true);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
                manager.createNotificationChannel(alertChannel);
            }
        }
    }
    
    private Notification buildForegroundNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );
        
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        
        return builder
            .setContentTitle("Matchaboy Driver Aktif")
            .setContentText("Mencari pesanan baru di latar belakang...")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentIntent(pendingIntent)
            .build();
    }
    
    private void startPolling() {
        if (isPollingRunning) return;
        isPollingRunning = true;
        
        pollingThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (isPollingRunning) {
                    try {
                        checkNewOrders();
                    } catch (Exception e) {
                        Log.e("DriverService", "Error in polling loop: " + e.getMessage());
                    }
                    try {
                        Thread.sleep(10000); // Poll every 10 seconds
                    } catch (InterruptedException e) {
                        break;
                    }
                }
            }
        });
        pollingThread.start();
        Log.d("DriverService", "Polling thread started");
    }
    
    private void stopPolling() {
        isPollingRunning = false;
        if (pollingThread != null) {
            pollingThread.interrupt();
            pollingThread = null;
        }
        Log.d("DriverService", "Polling thread stopped");
    }
    
    private void checkNewOrders() {
        try {
            // Get NextAuth session cookie from SharedPreferences
            android.content.SharedPreferences sharedPref = getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE);
            final String cookieStr = sharedPref.getString("session_cookie", null);
            
            if (cookieStr == null || !cookieStr.contains("session-token")) {
                // Driver is not logged in yet or session expired
                return;
            }
            
            URL url = new URL("https://arumseduh.vercel.app/api/driver/orders");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Cookie", cookieStr);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            
            int responseCode = conn.getResponseCode();
            if (responseCode == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String inputLine;
                while ((inputLine = in.readLine()) != null) {
                    response.append(inputLine);
                }
                in.close();
                
                JSONArray orders = new JSONArray(response.toString());
                boolean hasAssignedOrder = false;
                String assignedOrderId = null;
                for (int i = 0; i < orders.length(); i++) {
                    JSONObject order = orders.getJSONObject(i);
                    if ("ASSIGNED".equals(order.optString("status"))) {
                        hasAssignedOrder = true;
                        assignedOrderId = order.optString("id");
                        break;
                    }
                }
                
                final boolean finalHasAssigned = hasAssignedOrder;
                final String finalOrderId = assignedOrderId;
                
                handler.post(new Runnable() {
                    @Override
                    public void run() {
                        if (finalHasAssigned) {
                            startAlert(finalOrderId);
                        } else {
                            stopAlert();
                        }
                    }
                });
            } else if (responseCode == 401) {
                // Unauthorized
                handler.post(new Runnable() {
                    @Override
                    public void run() {
                        stopAlert();
                    }
                });
            }
        } catch (Exception e) {
            Log.e("DriverService", "Error fetching orders: " + e.getMessage());
        }
    }
    
    private void startAlert(String orderId) {
        // If we are already alerting for this specific order, do nothing
        if (isAlerting && orderId != null && orderId.equals(currentAlertingOrderId)) {
            return;
        }
        
        currentAlertingOrderId = orderId;
        isAlerting = true;
        Log.d("DriverService", "Starting alert for order: " + orderId);
        
        // Read preferences
        android.content.SharedPreferences sharedPref = getSharedPreferences("DriverPrefs", Context.MODE_PRIVATE);
        boolean alarmEnabled = sharedPref.getBoolean("alarm_enabled", true);
        boolean vibrateEnabled = sharedPref.getBoolean("vibrate_enabled", true);
        boolean forceMaxVolume = sharedPref.getBoolean("force_max_volume", true);
        boolean loopAlarm = sharedPref.getBoolean("loop_alarm", true);
        
        // Force alarm stream volume to maximum (if enabled)
        if (forceMaxVolume) {
            try {
                AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                if (audioManager != null) {
                    int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                    audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);
                }
            } catch (Exception e) {
                Log.e("DriverService", "Failed to set volume to max: " + e.getMessage());
            }
        }
        
        // Play system alarm / ringtone at max volume in loop (if enabled)
        if (alarmEnabled && mediaPlayer == null) {
            try {
                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) {
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }
                
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setDataSource(this, alarmUri);
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                mediaPlayer.setLooping(loopAlarm);
                mediaPlayer.prepare();
                mediaPlayer.start();
            } catch (Exception e) {
                Log.e("DriverService", "Failed to start media player: " + e.getMessage());
            }
        }
        
        // Vibrate aggressively and continuously (if enabled)
        if (vibrateEnabled && vibrator == null) {
            try {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null) {
                    long[] pattern = {0, 1200, 400, 1200, 400};
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, loopAlarm ? 0 : -1));
                    } else {
                        vibrator.vibrate(pattern, loopAlarm ? 0 : -1);
                    }
                }
            } catch (Exception e) {
                Log.e("DriverService", "Failed to trigger vibration: " + e.getMessage());
            }
        }
        
        showHeadsUpNotification(orderId);
    }
    
    private void stopAlert() {
        if (!isAlerting) return;
        isAlerting = false;
        currentAlertingOrderId = null;
        Log.d("DriverService", "Stopping alert");
        
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) {
                Log.e("DriverService", "Failed to stop media player: " + e.getMessage());
            }
            mediaPlayer = null;
        }
        
        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception e) {
                Log.e("DriverService", "Failed to cancel vibration: " + e.getMessage());
            }
            vibrator = null;
        }
        
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(ALERT_NOTIFICATION_ID);
        }
    }
    
    private void showHeadsUpNotification(String orderId) {
        String orderIdShort = "Baru";
        if (orderId != null && orderId.length() >= 4) {
            orderIdShort = orderId.substring(orderId.length() - 4).toUpperCase();
        } else if (orderId != null) {
            orderIdShort = orderId.toUpperCase();
        }
        
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            1,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        // Intent for the action button "Terima"
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.setAction("ACCEPT_ORDER");
        acceptIntent.putExtra("ORDER_ID", orderId);
        acceptIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent acceptPendingIntent = PendingIntent.getActivity(
            this,
            2,
            acceptIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, ALERT_CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        
        Notification alert = builder
            .setContentTitle("Ada Pesanan Baru! 🛵")
            .setContentText("Ada pesanan #" + orderIdShort + ", segera ambil pesanan.")
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setPriority(Notification.PRIORITY_MAX)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setFullScreenIntent(pendingIntent, true) // Show full screen on lockscreen/idle like a call
            .addAction(android.R.drawable.ic_media_play, "Terima", acceptPendingIntent) // Action button
            .build();
            
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(ALERT_NOTIFICATION_ID, alert);
        }
        Log.d("DriverService", "Heads-up notification posted for order #" + orderIdShort);
    }
}
