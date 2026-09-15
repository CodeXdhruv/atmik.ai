import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronRight, User, Shield, Bell, Lock, 
  HelpCircle, Info, FileText, FileSignature, 
  LogOut, Trash2, Edit2, Sparkle
} from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const COLORS = {
  background: '#FCFAF8', // App's main background
  primary: '#243B5A', // Navy
  accent: '#DEAB5B', // Gold
  textSecondary: '#6B7280',
  divider: '#E5E7EB',
  danger: '#EF4444',
  cardBg: '#FFFFFF',
  iconBg: '#F3F4F6',
};

const FONTS = {
  heading: 'serif',
};

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: 'Loading...',
    email: '...',
    photoURL: null as string | null,
  });

  useEffect(() => {
    const user = auth().currentUser;
    if (user) {
      setUserData({
        name: user.displayName || 'Atmik User',
        email: user.email || '',
        photoURL: user.photoURL,
      });
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore Google sign-out errors
      }
      router.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const SettingsSection = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const SettingsRow = ({ 
    title, 
    subtitle,
    icon: Icon,
    onPress, 
    isDestructive = false,
    showDivider = true
  }: { 
    title: string; 
    subtitle?: string;
    icon: any;
    onPress: () => void; 
    isDestructive?: boolean;
    showDivider?: boolean;
  }) => (
    <>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.iconContainer, isDestructive && { backgroundColor: '#FEF2F2' }]}>
          <Icon color={isDestructive ? COLORS.danger : COLORS.primary} size={20} strokeWidth={1.5} />
        </View>
        <View style={styles.rowTextContainer}>
          <Text style={[styles.rowTitle, isDestructive && { color: COLORS.danger }]}>{title}</Text>
          {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
        </View>
        <ChevronRight color={isDestructive ? COLORS.danger : COLORS.textSecondary} size={20} />
      </TouchableOpacity>
      {showDivider && <View style={styles.rowDivider} />}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.pageHeader}>Settings</Text>

        {/* Profile Compact Header */}
        <View style={styles.compactProfileHeader}>
          <View style={styles.compactAvatarContainer}>
            {userData.photoURL ? (
              <Image source={{ uri: userData.photoURL }} style={styles.compactAvatarImage} />
            ) : (
              <View style={styles.compactAvatarInitials}>
                <Text style={styles.compactAvatarText}>
                  {userData.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.compactProfileInfo}>
            <Text style={styles.compactName}>{userData.name}</Text>
            <Text style={styles.compactEmail}>{userData.email}</Text>
            <TouchableOpacity 
              style={styles.compactEditRow} 
              onPress={() => router.push('/settings/personal-info')}
            >
              <Text style={styles.compactEditText}>Edit Profile</Text>
              <ChevronRight color={COLORS.textSecondary} size={16} />
            </TouchableOpacity>
          </View>
        </View>

        <SettingsSection title="Account" />
        <View style={styles.settingsCard}>
          <SettingsRow 
            title="Account Settings" 
            subtitle="Manage your personal information"
            icon={User}
            onPress={() => router.push('/settings/personal-info')} 
          />
          <SettingsRow 
            title="Security" 
            subtitle="Manage your login methods"
            icon={Shield}
            onPress={() => router.push('/settings/security')} 
            showDivider={false}
          />
        </View>

        <SettingsSection title="Preferences" />
        <View style={styles.settingsCard}>
          <SettingsRow 
            title="Notifications" 
            subtitle="Manage your notification preferences"
            icon={Bell}
            onPress={() => router.push('/settings/notifications')} 
            showDivider={false}
          />
        </View>

        <SettingsSection title="Privacy & Support" />
        <View style={styles.settingsCard}>
          <SettingsRow 
            title="Privacy & Data" 
            subtitle="Manage your privacy and data"
            icon={Lock}
            onPress={() => router.push('/settings/privacy')} 
          />
          <SettingsRow 
            title="Help & Support" 
            subtitle="Contact us for assistance"
            icon={HelpCircle}
            onPress={() => router.push('/settings/support')} 
            showDivider={false}
          />
        </View>

        <SettingsSection title="About" />
        <View style={styles.settingsCard}>
          <SettingsRow 
            title="About Atmik.AI" 
            subtitle="Version and developer info"
            icon={Info}
            onPress={() => router.push('/settings/about')} 
          />
          <SettingsRow 
            title="Privacy Policy" 
            subtitle="How we handle your data"
            icon={FileText}
            onPress={() => router.push('/settings/privacy-policy')} 
          />
          <SettingsRow 
            title="Terms of Service" 
            subtitle="Rules and guidelines"
            icon={FileSignature}
            onPress={() => router.push('/settings/tos')} 
            showDivider={false}
          />
        </View>

        <View style={[styles.settingsCard, { marginTop: 32, borderColor: '#FEF2F2', borderWidth: 1, shadowColor: COLORS.danger }]}>
          <SettingsRow 
            title="Sign Out" 
            subtitle="You will be signed out from this device"
            icon={LogOut}
            onPress={handleSignOut} 
            isDestructive 
            showDivider={false}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  pageHeader: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  // Settings Styles
  compactProfileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  compactAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.iconBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  compactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  compactAvatarInitials: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAvatarText: {
    fontSize: 24,
    color: '#FFF',
    fontFamily: FONTS.heading,
  },
  compactProfileInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.heading,
    marginBottom: 4,
  },
  compactEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  compactEditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginLeft: 8,
    marginTop: 12,
  },
  settingsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    paddingVertical: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.iconBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rowTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 72, // Aligns with the text, skipping the icon
    marginRight: 16,
  },
});
