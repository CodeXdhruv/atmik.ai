import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Button, Input } from '@/components/ui';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { getAuth, signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthService } from '@/api';

const { width } = Dimensions.get('window');

export default function SignInScreen() {
  const router = useRouter();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '114419958748-7gasra4os0847ig60en259s5920nd21q.apps.googleusercontent.com',
    });
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Sign in with Firebase
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Sync user to our Cloudflare D1 Database (non-blocking)
      AuthService.syncUser(userCredential.user.uid, email, userCredential.user.displayName || '').catch(console.error);

      // 3. Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      // 1. Check if device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // 2. Get the users ID token
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('No ID token found');
      
      // 3. Create a Google credential with both idToken and accessToken
      const tokens = await GoogleSignin.getTokens();
      const googleCredential = GoogleAuthProvider.credential(idToken, tokens.accessToken);
      
      // 4. Sign-in the user with the credential
      const auth = getAuth();
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      // 5. Sync to our database (non-blocking)
      AuthService.syncUser(
        userCredential.user.uid, 
        userCredential.user.email || '', 
        userCredential.user.displayName || ''
      ).catch(console.error);

      // 6. Navigate
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in with Google');
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your journey</Text>
            </View>

            <View style={[styles.logoContainer, { marginBottom: 32 }]}>
              <Text style={{ fontFamily: 'Samarkan', fontSize: 48, color: '#1C1C1E', textAlign: 'center' }}>Atmik AI</Text>
            </View>

          <View style={styles.formContainer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Input
              label="Email Address"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon={<Mail color={Colors.textSecondary} size={20} />}
            />

            <View style={styles.passwordContainer}>
              <Input
                label="Password"
                placeholder="Enter your password"
                isPassword
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock color={Colors.textSecondary} size={20} />}
              />
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <Button
              title={isLoading ? "Signing In..." : "Sign In"}
              style={styles.signInButton}
              disabled={isLoading}
              onPress={handleSignIn}
            />

          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn} disabled={isLoading}>
              <Image 
                source={require('@/assets/images/google.png')}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/auth/sign-up')}>
              <Text style={styles.signUpText}>Create Account</Text>
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
  passwordContainer: {
    marginBottom: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#D4AF37', // Gold color from design
    fontWeight: '500',
  },
  signInButton: {
    marginTop: 16,
    height: 56,
  },
  demoButton: {
    marginTop: 12,
    height: 56,
    borderColor: Colors.accent,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  signUpText: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '600',
  },
});
