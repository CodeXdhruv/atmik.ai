import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Button, Input } from '@/components/ui';
import { ArrowLeft, User, Mail, Lock, CheckSquare, Square } from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthService } from '@/api';

export default function SignUpScreen() {
  const router = useRouter();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '114419958748-7gasra4os0847ig60en259s5920nd21q.apps.googleusercontent.com',
    });
  }, []);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Create user in Firebase
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);

      // 2. Update Firebase Display Name
      await userCredential.user.updateProfile({ displayName: name });

      // 3. Sync user to our Cloudflare D1 Database (non-blocking)
      AuthService.syncUser(userCredential.user.uid, email, name).catch(console.error);

      // 4. Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('No ID token found');

      const tokens = await GoogleSignin.getTokens();
      const googleCredential = auth.GoogleAuthProvider.credential(idToken, tokens.accessToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      // Sync to database non-blocking
      AuthService.syncUser(
        userCredential.user.uid,
        userCredential.user.email || '',
        userCredential.user.displayName || ''
      ).catch(console.error);

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign up with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Image
        source={require('@/assets/images/quotes_background.webp')}
        style={styles.bottomBg}
        resizeMode="cover"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color={Colors.textPrimary} size={24} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.subtitle}>Start your journey with</Text>
            </View>

            <View style={[styles.logoContainer, { marginBottom: 32 }]}>
              <Text style={{ fontFamily: 'Samarkan', fontSize: 48, color: '#1C1C1E', textAlign: 'center' }}>Atmik AI</Text>
            </View>

            <View style={styles.formContainer}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                leftIcon={<User color={Colors.textSecondary} size={20} />}
              />

              <Input
                label="Email Address"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail color={Colors.textSecondary} size={20} />}
              />

              <Input
                label="Password"
                placeholder="Create a strong password"
                isPassword
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock color={Colors.textSecondary} size={20} />}
              />


              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.8}
              >
                {agreedToTerms ? (
                  <CheckSquare color={Colors.primary} size={20} style={{ marginRight: 12 }} />
                ) : (
                  <Square color={Colors.textSecondary} size={20} style={{ marginRight: 12 }} />
                )}
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <Button
                title={isLoading ? "Creating Account..." : "Create Account"}
                style={styles.signUpButton}
                disabled={!agreedToTerms || isLoading}
                onPress={handleSignUp}
              />
            </View>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or sign up with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignUp} disabled={isLoading}>
                <Image
                  source={require('@/assets/images/google.png')}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFCFF',
  },
  bottomBg: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 300,
    opacity: 0.15,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: -20,
  },
  logo: {
    width: 150,
    height: 150,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.primary,
    marginBottom: 4,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 16,
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 16,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  linkText: {
    color: '#D4AF37', // Gold color from design
    fontWeight: '500',
  },
  signUpButton: {
    marginTop: 8,
    height: 56,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleG: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#4285F4',
  },
});
