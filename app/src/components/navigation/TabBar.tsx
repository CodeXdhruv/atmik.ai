import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TouchableWithoutFeedback, 
  Pressable, 
  StyleSheet, 
  Dimensions, 
  Platform, 
  Image 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, MessageSquare, BookOpen, Heart, User, Mic } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// ==========================================
// 1. LOTUS FLOATING ACTION BUTTON
// ==========================================
const triggerHaptic = async (style = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    await Haptics.impactAsync(style);
  } catch (error) {
    // Fallback if native module isn't linked
  }
};

const CHAT_X = -55;
const CHAT_Y = -85;
const VOICE_X = 55;
const VOICE_Y = -85;

const Particle = ({ progress, delayMs, targetX, targetY }: any) => {
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (progress.value * 320 - delayMs) / 100));
    const opacity = p > 0 && p < 1 ? interpolate(p, [0, 0.5, 1], [0, 0.25, 0]) : 0;
    
    const bowX = targetX > 0 ? 20 : -20; 
    const bowY = -30;
    
    const currentX = interpolate(p, [0, 1], [0, targetX]);
    const currentY = interpolate(p, [0, 1], [0, targetY]);
    
    const curveX = currentX + Math.sin(p * Math.PI) * bowX;
    const curveY = currentY + Math.sin(p * Math.PI) * bowY;

    return {
      opacity,
      transform: [
        { translateX: curveX },
        { translateY: curveY },
      ]
    };
  });

  return <Animated.View style={[styles.particle, style]} pointerEvents="none" />;
};

export const LotusButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const bloomProgress = useSharedValue(0);
  const lotusScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const lotusRotation = useSharedValue(0);

  useEffect(() => {
    if (!isOpen) {
      lotusScale.value = withRepeat(
        withSequence(
          withTiming(1.01, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [isOpen, lotusScale]);

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
      return;
    }
    
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
    
    lotusScale.value = withSequence(
      withTiming(0.96, { duration: 70 }),
      withTiming(1, { duration: 100 })
    );

    glowOpacity.value = withDelay(120, withTiming(0.25, { duration: 100 }));
    glowScale.value = withDelay(120, withTiming(1.4, { duration: 150 }));
    
    lotusRotation.value = withDelay(120, withSequence(
      withTiming(3, { duration: 100 }),
      withTiming(0, { duration: 100 })
    ));

    bloomProgress.value = withTiming(1, { duration: 320 });
  };

  const closeMenu = () => {
    bloomProgress.value = withTiming(0, { duration: 250 }, (isFinished) => {
      if (isFinished) {
        runOnJS(setIsOpen)(false);
      }
    });
    glowOpacity.value = withTiming(0, { duration: 200 });
    glowScale.value = withTiming(1, { duration: 200 });
  };

  const blurStyle = useAnimatedStyle(() => ({
    opacity: bloomProgress.value,
  }));

  const lotusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: lotusScale.value },
      { rotate: `${lotusRotation.value}deg` }
    ]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }]
  }));

  const chatStyle = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (bloomProgress.value * 320 - 170) / 80));
    const bowX = -20;
    const bowY = -30;
    const curveX = interpolate(p, [0, 1], [0, CHAT_X]) + Math.sin(p * Math.PI) * bowX;
    const curveY = interpolate(p, [0, 1], [0, CHAT_Y]) + Math.sin(p * Math.PI) * bowY;

    return {
      opacity: p,
      transform: [
        { translateX: curveX },
        { translateY: curveY },
        { scale: interpolate(p, [0, 1], [0.5, 1], Extrapolation.CLAMP) }
      ]
    };
  });

  const voiceStyle = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (bloomProgress.value * 320 - 210) / 80));
    const bowX = 20;
    const bowY = -30;
    const curveX = interpolate(p, [0, 1], [0, VOICE_X]) + Math.sin(p * Math.PI) * bowX;
    const curveY = interpolate(p, [0, 1], [0, VOICE_Y]) + Math.sin(p * Math.PI) * bowY;

    return {
      opacity: p,
      transform: [
        { translateX: curveX },
        { translateY: curveY },
        { scale: interpolate(p, [0, 1], [0.5, 1], Extrapolation.CLAMP) }
      ]
    };
  });

  const onSelectChat = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    closeMenu();
    setTimeout(() => {
      router.push('/chat');
    }, 300);
  };

  const onSelectVoice = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    closeMenu();
    setTimeout(() => {
      router.push('/voice' as any);
    }, 300);
  };

  const chatParticles = Array.from({ length: 6 }).map((_, i) => (
    <Particle key={`chat-p-${i}`} progress={bloomProgress} delayMs={170 + i * 12} targetX={CHAT_X} targetY={CHAT_Y} />
  ));

  const voiceParticles = Array.from({ length: 6 }).map((_, i) => (
    <Particle key={`voice-p-${i}`} progress={bloomProgress} delayMs={210 + i * 12} targetX={VOICE_X} targetY={VOICE_Y} />
  ));

  return (
    <View style={styles.lotusWrapper} pointerEvents="box-none">
      {isOpen && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <Animated.View style={[styles.overlay, blurStyle]}>
            <BlurView intensity={8} tint="light" style={StyleSheet.absoluteFill}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
            </BlurView>
          </Animated.View>
        </TouchableWithoutFeedback>
      )}

      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />

      {chatParticles}
      {voiceParticles}

      <Animated.View style={[styles.floatingButtonContainer, chatStyle]} pointerEvents={isOpen ? "auto" : "none"}>
        <Pressable onPress={onSelectChat} style={({ pressed }) => [styles.floatingButton, pressed && { transform: [{ scale: 0.95 }] }]}>
          <MessageSquare color="#DEAB5B" size={22} strokeWidth={1.25} />
          <Text style={styles.floatingButtonLabel}>Chat</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.floatingButtonContainer, voiceStyle]} pointerEvents={isOpen ? "auto" : "none"}>
        <Pressable onPress={onSelectVoice} style={({ pressed }) => [styles.floatingButton, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Mic color="#DEAB5B" size={22} strokeWidth={1.25} />
          <Text style={styles.floatingButtonLabel}>Voice</Text>
        </Pressable>
      </Animated.View>

      <Pressable onPress={toggleMenu}>
        <Animated.View style={[styles.centerButton, lotusAnimatedStyle]}>
          <Image source={require('@/assets/images/nav_bar_icon.png')} style={styles.lotusImage} resizeMode="contain" />
        </Animated.View>
      </Pressable>
    </View>
  );
};

// ==========================================
// 2. GLASS TAB BAR COMPONENT
// ==========================================
export const GlassTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const focusedRoute = state.routes[state.index];
  if (focusedRoute.name === 'chat') {
    return null;
  }

  return (
    <>
      <LinearGradient
        colors={['transparent', 'rgba(252, 250, 248, 0.8)', '#FCFAF8']}
        locations={[0, 0.4, 1]}
        style={styles.gradientBg}
        pointerEvents="none"
      />
      <View style={styles.container}>
        <BlurView intensity={80} tint="light" style={[StyleSheet.absoluteFill, styles.blurContainer]} />
        <View style={styles.tabBar}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const isCenter = index === 2; // Central Lotus button

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const getIcon = () => {
              const color = isFocused ? Colors.primary : Colors.textSecondary;
              const size = 24;
              const strokeWidth = 1.75;

              switch (route.name) {
                case 'index': return <Home color={color} size={size} strokeWidth={strokeWidth} />;
                case 'learn': return <BookOpen color={color} size={size} strokeWidth={strokeWidth} />;
                case 'chat': return <MessageSquare color={Colors.surface} size={28} strokeWidth={strokeWidth} />;
                case 'health': return <Heart color={color} size={size} strokeWidth={strokeWidth} />;
                case 'profile': return <User color={color} size={size} strokeWidth={strokeWidth} />;
                default: return <Home color={color} size={size} strokeWidth={strokeWidth} />;
              }
            };

            if (isCenter) {
              return (
                <View key={route.key} style={styles.tabItem}>
                  <LotusButton />
                  {isFocused && <View style={[styles.indicator, { backgroundColor: '#DEAB5B' }]} />}
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.6}
              >
                {getIcon()}
                {isFocused && <View style={styles.indicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
};

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  // TabBar Styles
  gradientBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  container: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    borderRadius: 36,
  },
  blurContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(222, 171, 91, 0.3)',
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 72 : 64,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  indicator: {
    position: 'absolute',
    bottom: 12,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },

  // LotusButton Styles
  lotusWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    zIndex: 100,
  },
  overlay: {
    position: 'absolute',
    bottom: -50,
    left: -width,
    width: width * 3,
    height: height * 3,
    zIndex: -1,
  },
  glow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DEAB5B',
    zIndex: 0,
  },
  particle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DEAB5B',
    position: 'absolute',
    zIndex: 1,
  },
  centerButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lotusImage: {
    width: 100,
    height: 100,
    tintColor: '#DEAB5B',
    marginTop: 6
  },
  floatingButtonContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  floatingButtonLabel: {
    fontSize: 10,
    color: '#8C8C8C',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.5,
  }
});
