import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/ui';
import { Mail } from 'lucide-react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>

        <View style={styles.headerArea}>
          <Image
            source={require('../../../assets/images/app_icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome to</Text>
          
          <View style={styles.wordmarkRow}>
            <Text style={[styles.samarkanText, { color: '#1C1C1E' }]}>Atmik AI</Text>
          </View>

          <Text style={styles.subtitle}>
            A lifelong companion for health, wisdom, inner growth and universal welfare.
          </Text>

          <View style={styles.dividerContainer}>
            <View style={styles.goldLine} />
            <View style={styles.diamond} />
            <View style={styles.goldLine} />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.customBtn, { backgroundColor: Colors.primary }]} activeOpacity={0.8}>
            <View style={styles.iconCircle}>
              <Image 
                source={require('@/assets/images/google.png')}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.customBtnText, { color: 'white' }]}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.customBtn, { backgroundColor: 'white', borderColor: Colors.border, borderWidth: 1 }]} activeOpacity={0.8} onPress={() => router.push('/auth/sign-in')}>
            <View style={styles.iconBox}>
              <Mail color={Colors.textPrimary} size={20} />
            </View>
            <Text style={[styles.customBtnText, { color: Colors.primary }]}>Continue with Email</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.orContainer}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text
            style={styles.signInText}
            onPress={() => router.push('/auth/sign-in')}
          >
            Sign In
          </Text>
        </Text>

        <View style={styles.quoteContainer}>
          <Text style={styles.quote}>
            The journey within leads to infinite peace.
          </Text>
          <Text style={styles.quoteAuthor}>— Dr. Atmik Jain</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFCFF',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 20,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  appIcon: {
    width: 200,
    height: 200,
    marginBottom: -20,
    borderRadius: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  samarkanText: {
    fontFamily: 'Samarkan',
    fontSize: 56,
    color: '#1C1C1E',
    marginTop: 6,
  },
  aiText: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: 4,
    marginLeft: 6,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60%',
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.accent,
    opacity: 0.5,
  },
  diamond: {
    width: 8,
    height: 8,
    backgroundColor: Colors.accent,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: 12,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
    gap: 16,
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  googleG: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  iconBox: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  customBtnText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 48,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    marginHorizontal: 16,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 'auto',
  },
  signInText: {
    color: Colors.accent,
    fontWeight: '600',
  },
  quoteContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  quote: {
    fontSize: 18,
    fontStyle: 'italic',
    color: Colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'serif',
    marginBottom: 12,
  },
  quoteAuthor: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});
