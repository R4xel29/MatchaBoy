self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json()
    
    // Intense vibration pattern for driver alerts (vibrate 1s, pause 0.5s, repeat 4 times)
    const isDriverAlert = (data.title && data.title.toLowerCase().includes('ditugaskan')) || 
                         (data.body && data.body.toLowerCase().includes('pesanan baru'));
    const vibratePattern = isDriverAlert
                           ? [1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000]
                           : [100, 50, 100];

    const options = {
      body: data.body,
      icon: data.icon || '/icon.png',
      badge: '/icon.png',
      vibrate: vibratePattern,
      requireInteraction: isDriverAlert ? true : false, // keeps notification visible on screen until user interacts
      tag: isDriverAlert ? 'driver-new-order' : undefined, // replaces older driver alerts to prevent clutter
      renotify: isDriverAlert ? true : false, // vibrate again even if tag matches previous notification
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url
      }
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  } else {
    event.waitUntil(clients.openWindow('/'))
  }
})
