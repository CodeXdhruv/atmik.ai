import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import auth from '@react-native-firebase/auth';
import { useVoiceChat } from "../hooks/useVoiceChat";
import {
  ArrowLeft,
  Settings2,
  Volume2,
  Mic,
  Activity,
  Info,
} from "lucide-react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Colors } from "@/constants/theme";

const { width, height } = Dimensions.get("window");
const GOLD = "#D9A05B";
const NAVY = "#1C2A3A";
const BG = "#FCFAF8";

const LotusIcon = ({ size = 120, color = GOLD }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Center line */}
      <Path d="M50 25 L50 95" />
      {/* Left curve */}
      <Path d="M15 90 C 35 85, 48 60, 48 25" />
      {/* Right curve */}
      <Path d="M85 90 C 65 85, 52 60, 52 25" />
      {/* Top dot */}
      <Circle cx="50" cy="12" r="3.5" fill={color} stroke="none" />
    </Svg>
  );
};

export default function VoiceScreen({ isBackground = false }: { isBackground?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [selectedLang, setSelectedLang] = React.useState<'hi' | 'en'>('hi');
  const userId = auth().currentUser?.uid || 'anonymous';
  const { isConnected, isRecording, transcription, aiText, error, startRecording, stopRecording } = useVoiceChat(userId, selectedLang);

  // Animation values
  const pulse = useSharedValue(0);
  const ringRotate = useSharedValue(0);
  const micPulse = useSharedValue(0);

  // Slide animation
  const translateX = useSharedValue(params.fromSwipe ? -width : 0);

  useEffect(() => {
    if (!isBackground) {
      // Breathing pulse for the glowing circles
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );

      // Slow rotation for the dotted ring
      ringRotate.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false,
      );
    }

    // Slide in on mount if from swipe
    if (params.fromSwipe && !isBackground) {
      translateX.value = withSpring(0, { damping: 22, stiffness: 250, mass: 0.5, overshootClamping: true });
    }
  }, [isBackground]);

  useEffect(() => {
    if (!isBackground && isRecording) {
      // Quick pulse for the microphone
      micPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      micPulse.value = withTiming(0);
    }
  }, [isBackground, isRecording]);

  const animatedGlow = useAnimatedStyle(() => {
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.4, 0.8]),
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
    };
  });

  const animatedRing = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${ringRotate.value}deg` }],
    };
  });

  const animatedMic = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(micPulse.value, [0, 1], [1, 1.1]) }],
      opacity: interpolate(micPulse.value, [0, 1], [0.5, 0.2]),
    };
  });

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      if (event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -width / 4 || event.velocityX < -500) {
        translateX.value = withSpring(-width, { damping: 22, stiffness: 250, mass: 0.5, overshootClamping: true }, () => {
          runOnJS(router.replace)({
            pathname: "/chat",
            params: { fromSwipe: "true" },
          });
        });
      } else {
        translateX.value = withSpring(0, { damping: 22, stiffness: 250, mass: 0.5 });
      }
    });

  const animatedScreenStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const screenContent = (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 10 },
        !isBackground && animatedScreenStyle,
        isBackground && { position: 'absolute', width, height, zIndex: -1 }
      ]}
    >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <ArrowLeft color={NAVY} size={24} strokeWidth={1.5} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>AI Voice</Text>
            </View>

            <TouchableOpacity 
              style={styles.langToggle}
              onPress={() => setSelectedLang(prev => prev === 'hi' ? 'en' : 'hi')}
              activeOpacity={0.7}
            >
              <Text style={styles.langToggleText}>
                {selectedLang === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Orbital UI */}
          <View style={styles.orbContainer}>
            {/* Faint Outer Circles */}
            <Animated.View
              style={[styles.outerCircle, { width: 380, height: 380 }]}
            />
            <Animated.View
              style={[styles.outerCircle, { width: 320, height: 320 }]}
            />

            {/* Dotted Ring */}
            <Animated.View style={[styles.dottedRingContainer, animatedRing]}>
              <Svg width={260} height={260}>
                <Circle
                  cx="130"
                  cy="130"
                  r="129"
                  stroke={GOLD}
                  strokeWidth="1"
                  strokeDasharray="2, 6"
                  fill="none"
                  opacity="0.5"
                />
                {/* Glowing nodes on the ring */}
                <Circle cx="130" cy="1" r="3" fill="#FFF" />
                <Circle cx="130" cy="1" r="5" fill={GOLD} opacity="0.5" />

                <Circle cx="1" cy="130" r="3" fill="#FFF" />
                <Circle cx="1" cy="130" r="5" fill={GOLD} opacity="0.5" />

                <Circle cx="259" cy="130" r="3" fill="#FFF" />
                <Circle cx="259" cy="130" r="5" fill={GOLD} opacity="0.5" />

                <Circle cx="130" cy="259" r="3" fill="#FFF" />
                <Circle cx="130" cy="259" r="5" fill={GOLD} opacity="0.5" />
              </Svg>
            </Animated.View>

            {/* Inner Glow Center */}
            <Animated.View style={[styles.centerGlow, animatedGlow]}>
              <Svg width="200" height="200">
                <Defs>
                  <RadialGradient
                    id="grad"
                    cx="50%"
                    cy="50%"
                    r="50%"
                    fx="50%"
                    fy="50%"
                  >
                    <Stop offset="0%" stopColor="#FFF" stopOpacity="1" />
                    <Stop offset="50%" stopColor={GOLD} stopOpacity="0.4" />
                    <Stop offset="100%" stopColor={BG} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="100" cy="100" r="100" fill="url(#grad)" />
              </Svg>
            </Animated.View>

            {/* SVG Lotus */}
            <View style={styles.lotusWrapper}>
              <LotusIcon size={110} color={GOLD} />
            </View>
          </View>

          {/* Status Text */}
          <View style={styles.statusContainer}>
            {error ? (
              <Text style={[styles.listeningText, { color: 'red' }]}>{error}</Text>
            ) : (
              <>
                <Text style={styles.listeningText} numberOfLines={3} ellipsizeMode="tail">
                  {isRecording ? (transcription || "Listening...") : (aiText || transcription || "Tap mic to speak")}
                </Text>
                {isRecording && <Text style={styles.tapToStopText}>Tap to stop</Text>}
              </>
            )}

            <View style={styles.swipeHint}>
              <Info size={12} color={GOLD} />
              <Text style={styles.swipeHintText}>Swipe left for Chat</Text>
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Volume2 color={NAVY} size={22} strokeWidth={1.5} />
            </TouchableOpacity>

            <View style={styles.micCenterContainer}>
              {/* Mic Waveform decoration */}
              <Animated.View style={[styles.micPulseRing, animatedMic]} />

              <TouchableOpacity 
                style={[styles.micButton, isRecording && { backgroundColor: '#E04F5F' }]} 
                onPress={() => isRecording ? stopRecording() : startRecording()}
              >
                <Mic color="#FFF" size={32} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.secondaryButton}>
              <Activity color={NAVY} size={22} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
    </Animated.View>
  );

  if (isBackground) {
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]} pointerEvents="none">
        {screenContent}
      </View>
    );
  }

  const ChatScreen = require('./(tabs)/chat').default;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
          <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
            <ChatScreen isBackground />
          </View>
          {screenContent}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: NAVY,
    fontFamily: "Georgia", // using serif-like standard for premium feel if custom font not loaded
  },
  headerSubtitle: {
    fontSize: 12,
    color: GOLD,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  orbContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  outerCircle: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GOLD,
    opacity: 0.15,
  },
  dottedRingContainer: {
    position: "absolute",
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  centerGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  lotusWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  listeningText: {
    fontSize: 18,
    fontWeight: "600",
    color: NAVY,
    marginBottom: 8,
  },
  tapToStopText: {
    fontSize: 14,
    color: "#8C8C8C",
    marginBottom: 20,
  },
  timerText: {
    fontSize: 16,
    color: NAVY,
    fontWeight: "500",
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    opacity: 0.6,
  },
  swipeHintText: {
    fontSize: 12,
    color: GOLD,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
    gap: 32,
  },
  secondaryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  micCenterContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  micPulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: GOLD,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  langToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: GOLD,
    elevation: 2,
  },
  langToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: NAVY,
  },
});
