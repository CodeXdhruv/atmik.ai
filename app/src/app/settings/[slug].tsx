import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Linking, 
  Platform, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  ShieldCheck, 
  Bell, 
  Mail, 
  AlertTriangle 
} from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Notifications from 'expo-notifications';
import packageJson from '../../../package.json';

const COLORS = {
  background: '#FCFAF8',
  primary: '#243B5A',
  textSecondary: '#6B7280',
  divider: '#E5E7EB',
  success: '#10B981',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
};

// ==========================================
// 1. PERSONAL INFORMATION VIEW
// ==========================================
function PersonalInfoView({ router }: { router: any }) {
  const [userData, setUserData] = useState({ name: 'Loading...', email: '...' });

  useEffect(() => {
    const user = auth().currentUser;
    if (user) {
      setUserData({
        name: user.displayName || 'Atmik User',
        email: user.email || '',
      });
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal information</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Your personal information is securely managed via Google Authentication.
        </Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{userData.name}</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email Address</Text>
          <Text style={styles.value}>{userData.email}</Text>
        </View>
        
        <Text style={styles.note}>
          To change this information, update your Google Account settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 2. SECURITY VIEW
// ==========================================
function SecurityView({ router }: { router: any }) {
  const user = auth().currentUser;
  const providers = user?.providerData.map((p) => p.providerId) || [];
  const isGoogle = providers.includes('google.com');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <ShieldCheck color={COLORS.success} size={32} />
          <Text style={styles.statusTitle}>Account Secured</Text>
          <Text style={styles.statusDescription}>
            Your authentication and session security is fully managed by your login provider.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Sign-in method</Text>
        <View style={styles.providerRow}>
          <Text style={styles.providerLabel}>Linked Provider</Text>
          <Text style={styles.providerValue}>{isGoogle ? 'Google Account' : 'Email/Password'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 3. NOTIFICATIONS VIEW
// ==========================================
function NotificationsView({ router }: { router: any }) {
  const [status, setStatus] = useState<string>('checking...');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setStatus(status === 'granted' ? 'Enabled' : 'Disabled');
  };

  const openSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Manage how Atmik.AI communicates with you.
        </Text>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Bell color={COLORS.primary} size={20} />
            <Text style={styles.rowLabel}>System Notifications</Text>
          </View>
          <Text style={styles.rowValue}>{status}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={openSystemSettings}>
          <Text style={styles.buttonText}>Manage in Device Settings</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Daily reminders, inspiration, and wellness prompts require system notifications to be enabled.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 4. PRIVACY VIEW
// ==========================================
function PrivacyView({ router }: { router: any }) {
  const SettingsRow = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowText}>{title}</Text>
      <ChevronRight color={COLORS.textSecondary} size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Shield color={COLORS.primary} size={40} strokeWidth={1.5} />
        </View>
        <Text style={styles.description}>
          Atmik.AI believes in data minimization. We only collect the information absolutely necessary to provide you with a personalized experience.
        </Text>

        <View style={styles.section}>
          <SettingsRow title="Privacy Policy" onPress={() => router.push('/settings/privacy-policy')} />
          <SettingsRow title="Terms of Service" onPress={() => router.push('/settings/tos')} />
        </View>
        
        <View style={[styles.section, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <SettingsRow title="Delete Account" onPress={() => router.push('/settings/delete-account')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 5. SUPPORT VIEW
// ==========================================
function SupportView({ router }: { router: any }) {
  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@atmik.ai?subject=Support Request');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          If you are experiencing issues with the application or have questions about your account, please reach out to our support team.
        </Text>

        <TouchableOpacity style={styles.supportCard} onPress={handleEmailSupport} activeOpacity={0.7}>
          <Mail color={COLORS.primary} size={24} style={styles.cardIcon} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Email Support</Text>
            <Text style={styles.cardSubtitle}>support@atmik.ai</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 6. ABOUT VIEW
// ==========================================
function AboutView({ router }: { router: any }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.aboutContent}>
        <View style={styles.logoContainer}>
          <Image source={require('@/assets/images/app_icon.png')} style={styles.logo} />
        </View>
        <Text style={styles.appName}>Atmik.AI</Text>
        <Text style={styles.version}>Version {packageJson.version}</Text>

        <Text style={styles.descriptionText}>
          A minimal, secure platform for mindfulness, habit tracking, and personal growth powered by AI.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2026 Atmik.AI. All rights reserved.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// 7. PRIVACY POLICY VIEW
// ==========================================
function PrivacyPolicyView({ router }: { router: any }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: September 2026</Text>
        <Text style={styles.paragraph}>
          Atmik.AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
        </Text>

        <Text style={styles.policySectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Account Information:</Text> When you sign in using Google or Email, we collect your email address, name, and profile picture provided by your authentication service.{'\n\n'}
          <Text style={styles.bold}>Chat History:</Text> When you interact with our AI, the content of your conversations is transmitted to our servers and stored securely in our database to maintain conversation context.{'\n\n'}
          <Text style={styles.bold}>Device & App Data:</Text> We collect notification push tokens to send you reminders. Usage data and wellness habits are stored locally on your device.
        </Text>

        <Text style={styles.policySectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          • To provide, maintain, and personalize the application.{'\n'}
          • To communicate with the AI models to generate responses.{'\n'}
          • To send you requested push notifications.{'\n'}
          • To manage your account and provide customer support.
        </Text>

        <Text style={styles.policySectionTitle}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>AI Processors:</Text> Your chat prompts are transmitted to our AI processing partners solely for the purpose of generating responses. These partners are strictly prohibited from using your data to train their public models.{'\n\n'}
          <Text style={styles.bold}>Infrastructure:</Text> All data is stored securely using encrypted cloud infrastructure and database services.{'\n\n'}
          We do not sell your personal information to third parties.
        </Text>

        <Text style={styles.policySectionTitle}>4. Data Retention & Deletion</Text>
        <Text style={styles.paragraph}>
          We retain your personal information only for as long as your account is active. You may delete your account at any time via the Settings menu. Deleting your account will permanently erase your profile, email, chat history, and notification tokens from our active databases. Local device data is removed when you uninstall the app.
        </Text>

        <Text style={styles.policySectionTitle}>5. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us at support@atmik.ai.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// 8. TERMS OF SERVICE VIEW
// ==========================================
function TermsOfServiceView({ router }: { router: any }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: September 2026</Text>
        <Text style={styles.paragraph}>
          Welcome to Atmik.AI. By accessing or using our mobile application, you agree to be bound by these Terms of Service.
        </Text>

        <Text style={styles.policySectionTitle}>1. Services Provided</Text>
        <Text style={styles.paragraph}>
          Atmik.AI provides an AI-powered mindfulness and journaling platform. The guidance provided by the AI is for informational and educational purposes only and is not a substitute for professional mental health care or medical advice.
        </Text>

        <Text style={styles.policySectionTitle}>2. User Accounts</Text>
        <Text style={styles.paragraph}>
          You must provide accurate information when creating an account. You are responsible for safeguarding the password and for all activities that occur under your account. We reserve the right to terminate accounts that violate these Terms.
        </Text>

        <Text style={styles.policySectionTitle}>3. Acceptable Use</Text>
        <Text style={styles.paragraph}>
          You agree not to use the application to:{'\n'}
          • Submit illegal, harmful, or abusive content to the AI.{'\n'}
          • Attempt to reverse engineer or hack the application.{'\n'}
          • Interfere with or disrupt the integrity of the service.
        </Text>

        <Text style={styles.policySectionTitle}>4. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The application, including its original content, features, and functionality, are owned by Atmik.AI and are protected by international copyright and intellectual property laws.
        </Text>

        <Text style={styles.policySectionTitle}>5. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          The service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties regarding the reliability, accuracy, or availability of the AI generation features.
        </Text>

        <Text style={styles.policySectionTitle}>6. Contact Information</Text>
        <Text style={styles.paragraph}>
          For any questions regarding these Terms, please contact us at support@atmik.ai.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// 9. DELETE ACCOUNT VIEW
// ==========================================
function DeleteAccountView({ router }: { router: any }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Are you absolutely sure?",
      "This action cannot be undone. All your data, chat history, and personal information will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete My Account", 
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const user = auth().currentUser;
              if (user) {
                await user.delete();
                try {
                  await GoogleSignin.signOut();
                } catch (e) {}
                router.replace('/auth');
              }
            } catch (error: any) {
              console.error(error);
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert("Re-authentication required", "Please sign out and sign back in to verify your identity before deleting your account.");
              } else {
                Alert.alert("Error", "An error occurred while deleting your account.");
              }
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={COLORS.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.warningContainer}>
          <AlertTriangle color={COLORS.danger} size={32} />
          <Text style={styles.warningTitle}>Delete your account?</Text>
        </View>

        <Text style={styles.description}>
          This action permanently deletes your account and applicable associated data.
        </Text>

        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• All your profile information</Text>
          <Text style={styles.bulletItem}>• Your entire chat history with AI</Text>
          <Text style={styles.bulletItem}>• Any server-stored preferences</Text>
          <Text style={styles.bulletItem}>• Notification tokens</Text>
        </View>

        <Text style={styles.note}>
          Local app data (like unsynced habits) will be cleared when you uninstall the app.
        </Text>

        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.deleteButtonText}>I understand, delete my account</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// DYNAMIC SETTINGS ROUTER SCREEN
// ==========================================
export default function DynamicSettingsScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  switch (slug) {
    case 'personal-info':
      return <PersonalInfoView router={router} />;
    case 'security':
      return <SecurityView router={router} />;
    case 'notifications':
      return <NotificationsView router={router} />;
    case 'privacy':
      return <PrivacyView router={router} />;
    case 'support':
      return <SupportView router={router} />;
    case 'about':
      return <AboutView router={router} />;
    case 'privacy-policy':
      return <PrivacyPolicyView router={router} />;
    case 'tos':
      return <TermsOfServiceView router={router} />;
    case 'delete-account':
      return <DeleteAccountView router={router} />;
    default:
      return <PersonalInfoView router={router} />;
  }
}

// ==========================================
// UNIFIED SETTINGS STYLES
// ==========================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
  content: { padding: 24 },
  description: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  fieldContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, color: COLORS.primary },
  note: { fontSize: 12, color: COLORS.textSecondary, marginTop: 16, fontStyle: 'italic' },
  
  // Security
  statusCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 32,
  },
  statusTitle: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginTop: 12, marginBottom: 4 },
  statusDescription: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 16 },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  providerLabel: { fontSize: 16, color: COLORS.primary },
  providerValue: { fontSize: 16, color: COLORS.textSecondary },

  // Notifications
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: 24,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 16, color: COLORS.primary, marginLeft: 12 },
  rowValue: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  button: {
    backgroundColor: 'rgba(36, 59, 90, 0.05)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // Privacy
  iconContainer: { marginBottom: 16 },
  section: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  rowText: { fontSize: 16, color: COLORS.primary },

  // Support
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  cardIcon: { marginRight: 16 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: COLORS.textSecondary },

  // About
  aboutContent: { padding: 24, alignItems: 'center', paddingTop: 60 },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    overflow: 'hidden',
  },
  logo: { width: '80%', height: '80%', resizeMode: 'contain' },
  appName: { fontSize: 24, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  version: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  descriptionText: { fontSize: 15, color: COLORS.primary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  footer: { marginTop: 60 },
  copyright: { fontSize: 12, color: COLORS.textSecondary },

  // Policies (Privacy Policy & Terms of Service)
  scrollContent: { padding: 24, paddingBottom: 60 },
  lastUpdated: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24, fontStyle: 'italic' },
  policySectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: 24, marginBottom: 12 },
  paragraph: { fontSize: 14, color: COLORS.primary, lineHeight: 22 },
  bold: { fontWeight: '700' },

  // Delete Account
  warningContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningTitle: { fontSize: 18, fontWeight: '700', color: COLORS.danger, marginTop: 12 },
  bulletList: { marginBottom: 24, paddingLeft: 8 },
  bulletItem: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  deleteButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
