import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import auth from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import { LocalNotificationService } from '../services/LocalNotificationService';

export function usePushNotifications() {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Set handler inside the effect so it's stable across Fast Refresh
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      
      // Also setup all the local daily reminders once we have push permissions
      LocalNotificationService.setupAllLocalReminders().catch(console.error);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User tapped notification:', response);
      const targetRoute = response.notification.request.content.data?.route;
      if (targetRoute) {
        try {
          router.push(targetRoute as any);
        } catch (e) {
          console.error("Failed to navigate from notification tap:", e);
        }
      }
    });

    return () => {
      // .remove() is the correct API in expo-notifications v0.28+
      // Notifications.removeNotificationSubscription() was removed
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Sync push token whenever token is generated or authentication state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(user => {
      if (user && expoPushToken) {
        syncPushTokenToBackend(user.uid, expoPushToken);
      }
    });

    // Also try immediately in case the initial event fired before we mounted
    const currentUser = auth().currentUser;
    if (currentUser && expoPushToken) {
      syncPushTokenToBackend(currentUser.uid, expoPushToken);
    }

    return () => unsubscribe();
  }, [expoPushToken]);

  return {
    expoPushToken,
    notification,
  };
}

async function syncPushTokenToBackend(firebaseUid: string, pushToken: string) {
  try {
    const idToken = await auth().currentUser?.getIdToken();
    if (!idToken) return;

    // Use the production backend URL
    const backendUrl = process.env.EXPO_PUBLIC_API_URL || 'https://atmik-ai-backend.swatantra-backend.workers.dev';

    await fetch(`${backendUrl}/api/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        firebaseUid,
        pushToken
      })
    });
    console.log('Push token synced to backend successfully');
  } catch (error) {
    console.error('Failed to sync push token:', error);
  }
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D9A05B', // Accent color
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      // Hardcoded Project ID to bypass Constants caching issues
      const projectId = '119f9131-c5c6-41e3-981e-6c2922f0871d';


      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);
    } catch (e) {
      console.error(e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
