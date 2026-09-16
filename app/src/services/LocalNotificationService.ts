import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class LocalNotificationService {
  static async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Atmik AI Wellness & Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D9A05B',
        sound: 'default',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  // 1. Morning Alignment (8:30 AM) -> Chat with Atmik AI
  static async scheduleMorningAlignment() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Start Your Morning with Atmik AI',
        body: 'Set your intention for today. Have a quick voice or text conversation with Atmik AI to clear your mind!',
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

  // 2. Afternoon Inner Check-In (1:30 PM) -> Reflect Your Inner Self (Practice)
  static async scheduleAfternoonReflection() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧘 Reflect Your Inner Self',
        body: 'Pause for 2 minutes. Take a deep breath and explore your inner journey in Practice to realign your peace.',
        sound: true,
        data: { route: '/health', type: 'REFLECT_INNER_SELF' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 13,
        minute: 30,
      },
    });
    console.log('Scheduled afternoon reflection notification for 1:30 PM');
  }

  // 3. Evening Heart-to-Heart Voice Chat (6:30 PM) -> Voice Mode
  static async scheduleEveningVoiceChat() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎙️ Atmik AI is Listening',
        body: 'How was your day? Speak your heart out in a gentle 1-on-1 voice conversation with Atmik.',
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

  // 4. Nightly Peaceful Unwind (9:30 PM) -> Daily Reflection
  static async scheduleNightlyUnwind() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌙 Evening Inner Peace & Reflections',
        body: 'Before you sleep, reflect on your thoughts and gain clarity with today’s inner reflection.',
        sound: true,
        data: { route: '/health', type: 'NIGHTLY_REFLECTION' }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 30,
      },
    });
    console.log('Scheduled nightly unwind notification for 9:30 PM');
  }

  static async setupAllLocalReminders() {
    // Clear all existing scheduled notifications so we don't duplicate
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    await this.scheduleMorningAlignment();
    await this.scheduleAfternoonReflection();
    await this.scheduleEveningVoiceChat();
    await this.scheduleNightlyUnwind();
  }
}
