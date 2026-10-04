import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const MORNING_COPY = [
  {
    title: 'Before the world gets loud',
    body: 'One quiet minute with Atmik. Name what today is for, then step into it.',
  },
  {
    title: 'The day is still yours',
    body: 'Tell Atmik the one thing that matters today. Leave the rest outside.',
  },
  {
    title: 'Start from the inside',
    body: 'A short talk with Atmik now. Clear the mind before the day fills it.',
  },
];

const EVENING_COPY = [
  {
    title: 'Put the day down',
    body: 'Say what you carried all day. Atmik is here to listen.',
  },
  {
    title: 'The day is over. You are not.',
    body: 'Speak it out loud. A gentle voice talk with Atmik, just you two.',
  },
  {
    title: 'Something is still unspoken',
    body: 'Come sit with Atmik. Leave the day in words, not in your chest.',
  },
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export class LocalNotificationService {
  static async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Atmik AI Wellness & Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D9A05B',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  // 1. Morning Alignment (8:30 AM) -> Chat with Atmik AI
  static async scheduleMorningAlignment() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const morning = pick(MORNING_COPY);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: morning.title,
        body: morning.body,
        sound: true,
        data: { route: '/chat', type: 'CHAT_ALIGNMENT' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 30,
      },
    });
    console.log('Scheduled morning alignment notification for 8:30 AM');
  }

  // 2. Evening Heart-to-Heart Voice Chat (6:30 PM) -> Voice Mode
  static async scheduleEveningVoiceChat() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const evening = pick(EVENING_COPY);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: evening.title,
        body: evening.body,
        sound: true,
        data: { route: '/voice', type: 'VOICE_CHAT' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 30,
      },
    });
    console.log('Scheduled evening voice chat notification for 6:30 PM');
  }

  static async setupAllLocalReminders() {
    // Clear all existing scheduled notifications so we don't duplicate
    await Notifications.cancelAllScheduledNotificationsAsync();

    await this.scheduleMorningAlignment();
    await this.scheduleEveningVoiceChat();
  }
}
