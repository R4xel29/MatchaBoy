import webpush from 'web-push';
import { prisma } from './prisma';

// Ensure you have these environment variables set
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@matchaboy.com';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);
}

interface SendPushOptions {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export async function sendPushNotification(userId: string, options: SendPushOptions) {
  if (!publicVapidKey || !privateVapidKey) {
    console.warn('VAPID keys are not configured. Skipping push notification.');
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: options.title,
      body: options.body,
      icon: options.icon || '/icon.png',
      url: options.url || '/',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Subscription has expired or is no longer valid, delete it
          console.log('Subscription expired. Deleting endpoint:', sub.endpoint);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error('Error sending push notification:', error);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Failed to get subscriptions from DB:', error);
  }
}

export async function sendBlastNotification(options: SendPushOptions) {
  if (!publicVapidKey || !privateVapidKey) {
    console.warn('VAPID keys are not configured. Skipping blast notification.');
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany();

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: options.title,
      body: options.body,
      icon: options.icon || '/icon.png',
      url: options.url || '/',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Failed to get subscriptions from DB for blast:', error);
  }
}
