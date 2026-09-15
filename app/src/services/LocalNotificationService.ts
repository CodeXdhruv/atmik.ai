import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class LocalNotificationService {
  static async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D9A05B',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  static async scheduleMorningForYou() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // Schedule for 8:30 AM every day
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌱 A moment for yourself',
        body: 'What has pulled you away from yourself lately? Take a quick breath and let it go with Atmik.',
        sound: 'default',
        data: { type: 'REMINDER_FOR_YOU' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 30,
      },
    });
    console.log('Scheduled morning For You notification for 8:30 AM');
  }

  static async scheduleEveningReflection() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // Schedule for 9:00 PM every day
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 Your daily reflection is ready',
        body: 'Before you rest, take a gentle look back at your day. Reflect and gain clarity.',
        sound: 'default',
        data: { type: 'REMINDER_TODAYS_REFLECTION' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
    console.log('Scheduled evening reflection notification for 9:00 PM');
  }

  static async scheduleRandomInnerJourney() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // Schedule a random time between 12 PM and 5 PM
    const hour = Math.floor(Math.random() * (17 - 12 + 1)) + 12;
    const minute = Math.floor(Math.random() * 60);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✨ Look Within',
        body: 'Feeling overwhelmed or need someone to talk to? Atmik is here to guide your inner journey right now.',
        sound: 'default',
        data: { type: 'REMINDER_INNER_JOURNEY' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    console.log(`Scheduled random inner journey nudge for ${hour}:${minute.toString().padStart(2, '0')}`);
  }

  static async setupAllLocalReminders() {
    // Clear all existing scheduled notifications so we don't duplicate
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    await this.scheduleMorningForYou();
    await this.scheduleEveningReflection();
    await this.scheduleRandomInnerJourney();
  }
}
