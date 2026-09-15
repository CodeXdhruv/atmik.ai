import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Share, Keyboard } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring, withDelay, Easing, interpolate, runOnJS, Extrapolation } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { dbService, ReflectionRecord } from '../../services/db';
import { MessageCircle, CircleDot, Star, ArrowRight, Heart } from 'lucide-react-native';

type ExperienceData = {
  id: string;
  theme: string;
  questionType: string;
  responseType: string;
  question: string;
  helperText: string;
  backHelperText: string;
  options?: string[];
  responseConfiguration: {
    atmik_response_template: string;
  };
};

// Sub-component: Typewriter
const TypewriterText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    setIsTyping(true);
    
    const interval = setInterval(() => {
      index++;
      setDisplayedText(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
        if (onComplete) onComplete();
      }
    }, 25); // 25ms per char
    
    return () => clearInterval(interval);
  }, [text]);

  const handleTap = () => {
    if (isTyping) {
      setDisplayedText(text);
      setIsTyping(false);
      if (onComplete) onComplete();
    }
  };

  return (
    <TouchableOpacity activeOpacity={1} onPress={handleTap}>
      <Text style={stylesTodaysReflectionCard.atmikResponse}>{displayedText}</Text>
    </TouchableOpacity>
  );
};

const TodaysReflectionCardComponent = ({ data }: { data: ExperienceData }) => {
  const [stage, setStage] = useState<'front' | 'input' | 'atmik_reply' | 'done'>('front');
  const [userText, setUserText] = useState('');
  const [atmikResponse, setAtmikResponse] = useState('');
  
  // Animation values
  const flipValue = useSharedValue(0); // 0 = front, 1 = back
  const pressScale = useSharedValue(1);

  const flipToBack = () => {
    pressScale.value = withSequence(
      withTiming(0.96, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 150 })
    );
    flipValue.value = withDelay(
      50, 
      withSpring(1, { 
        damping: 18, 
        stiffness: 120, 
        mass: 0.8
      }, (finished) => {
        if (finished) {
          runOnJS(setStage)('input');
        }
      })
    );
  };

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipValue.value, [0, 1], [0, 180], Extrapolation.CLAMP);
    const opacity = interpolate(flipValue.value, [0, 0.5, 0.51, 1], [1, 1, 0, 0]);
    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { scale: pressScale.value },
        { rotateY: `${rotateY}deg` }
      ],
      zIndex: flipValue.value < 0.5 ? 2 : 1,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipValue.value, [0, 1], [-180, 0], Extrapolation.CLAMP);
    const opacity = interpolate(flipValue.value, [0, 0.5, 0.51, 1], [0, 0, 1, 1]);
    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { scale: pressScale.value },
        { rotateY: `${rotateY}deg` }
      ],
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: flipValue.value >= 0.5 ? 2 : 1,
    };
  });

  const handleSubmit = () => {
    Keyboard.dismiss();
    let response = data.responseConfiguration.atmik_response_template;
    if (data.responseType === 'choice') {
      response = response.replace('{choice}', userText.toLowerCase());
    }
    setAtmikResponse(response);
    setStage('atmik_reply');
  };

  const handleSave = async (save: boolean) => {
    if (save) {
      await dbService.saveReflection({
        type: 'todays_reflection',
        contentId: data.id,
        theme: data.theme,
        question: data.question,
        userResponse: userText,
        atmikResponse: atmikResponse,
      });
    }
    setStage('done');
  };

  return (
    <View style={stylesTodaysReflectionCard.container}>
      <Animated.View style={[stylesTodaysReflectionCard.card, frontStyle]}>
        <Text style={stylesTodaysReflectionCard.label}>TODAY'S REFLECTION</Text>
        <View style={stylesTodaysReflectionCard.contentContainer}>
          <Text style={stylesTodaysReflectionCard.question}>{data.question}</Text>
          <Text style={stylesTodaysReflectionCard.helper}>{data.helperText}</Text>
        </View>
        <TouchableOpacity style={stylesTodaysReflectionCard.tapToBeginBtn} onPress={flipToBack} activeOpacity={0.9}>
          <Text style={stylesTodaysReflectionCard.tapToBeginText}>Flip ↺</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[stylesTodaysReflectionCard.card, backStyle]}>
        {stage !== 'done' ? (
          <>
            <Text style={stylesTodaysReflectionCard.label}>TAKE A MOMENT</Text>
            <View style={stylesTodaysReflectionCard.backContentContainer}>
              <Text style={stylesTodaysReflectionCard.backQuestion}>{data.question}</Text>
              <Text style={stylesTodaysReflectionCard.helper}>{data.backHelperText}</Text>
              
              {stage === 'input' && (
                <View style={stylesTodaysReflectionCard.inputArea}>
                  {data.responseType === 'text' ? (
                    <TextInput
                      style={stylesTodaysReflectionCard.textInput}
                      placeholder="Write whatever comes to mind..."
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      value={userText}
                      onChangeText={setUserText}
                      autoFocus
                    />
                  ) : (
                    <View style={stylesTodaysReflectionCard.optionsGrid}>
                      {data.options?.map((opt) => (
                        <TouchableOpacity 
                          key={opt}
                          style={[stylesTodaysReflectionCard.choiceBtn, userText === opt && stylesTodaysReflectionCard.choiceBtnActive]}
                          onPress={() => setUserText(opt)}
                        >
                          <Text style={[stylesTodaysReflectionCard.choiceText, userText === opt && stylesTodaysReflectionCard.choiceTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity 
                    style={[stylesTodaysReflectionCard.submitBtn, !userText.trim() && { opacity: 0.5 }]} 
                    onPress={handleSubmit}
                    disabled={!userText.trim()}
                  >
                    <Text style={stylesTodaysReflectionCard.submitText}>Done →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {stage === 'atmik_reply' && (
                <View style={stylesTodaysReflectionCard.replyArea}>
                  <Text style={stylesTodaysReflectionCard.atmikLabel}>Atmik</Text>
                  <TypewriterText text={atmikResponse} />
                  
                  <View style={stylesTodaysReflectionCard.actionButtons}>
                    <TouchableOpacity style={stylesTodaysReflectionCard.saveBtn} onPress={() => handleSave(true)}>
                      <Text style={stylesTodaysReflectionCard.saveBtnText}>Keep this reflection</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={stylesTodaysReflectionCard.discardBtn} onPress={() => handleSave(false)}>
                      <Text style={stylesTodaysReflectionCard.discardBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={stylesTodaysReflectionCard.completedState}>
            <Text style={stylesTodaysReflectionCard.label}>TODAY'S REFLECTION</Text>
            <Text style={stylesTodaysReflectionCard.completedIcon}>✓</Text>
            <Text style={stylesTodaysReflectionCard.completedTitle}>Reflected today</Text>
            <Text style={stylesTodaysReflectionCard.helper}>You can revisit this moment in Your Reflections.</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const stylesTodaysReflectionCard = StyleSheet.create({
  container: {
    height: 380,
    marginHorizontal: Spacing.lg,
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    backgroundColor: '#F9F3EA',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    justifyContent: 'space-between',
    backfaceVisibility: 'hidden', // Native optimization
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B8954A',
    letterSpacing: 1.5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  question: {
    fontSize: 28,
    fontFamily: 'serif',
    color: '#1B2D4F',
    lineHeight: 38,
    marginBottom: 16,
    textAlign: 'center',
  },
  helper: {
    fontSize: 14,
    color: '#8A7E6E',
    lineHeight: 20,
    textAlign: 'center',
  },
  tapToBeginBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tapToBeginText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A7E6E',
    letterSpacing: 0.5,
  },
  backContentContainer: {
    flex: 1,
    marginTop: 20,
  },
  backQuestion: {
    fontSize: 18,
    fontFamily: 'serif',
    color: '#1B2D4F',
    marginBottom: 8,
  },
  inputArea: {
    flex: 1,
    marginTop: 24,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1B2D4F',
    textAlignVertical: 'top',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(184,149,74,0.2)',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  choiceBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(184,149,74,0.3)',
    backgroundColor: 'transparent',
  },
  choiceBtnActive: {
    backgroundColor: '#1B2D4F',
    borderColor: '#1B2D4F',
  },
  choiceText: {
    fontSize: 15,
    color: '#1B2D4F',
  },
  choiceTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    alignSelf: 'flex-end',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B2D4F',
  },
  replyArea: {
    flex: 1,
    marginTop: 24,
    justifyContent: 'space-between',
  },
  atmikLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B8954A',
    marginBottom: 8,
  },
  atmikResponse: {
    fontSize: 18,
    fontFamily: 'serif',
    color: '#1B2D4F',
    lineHeight: 28,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(184,149,74,0.15)',
    paddingTop: 16,
    marginBottom: 8,
  },
  saveBtn: {
    backgroundColor: '#1B2D4F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  discardBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  discardBtnText: {
    color: '#8A7E6E',
    fontSize: 14,
    fontWeight: '500',
  },
  completedState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedIcon: {
    fontSize: 32,
    color: '#B8954A',
    marginVertical: 16,
  },
  completedTitle: {
    fontSize: 22,
    fontFamily: 'serif',
    color: '#1B2D4F',
    marginBottom: 8,
  }
});

type LookWithinData = {
  id: string;
  prompt: string;
  options: string[];
  responses: Record<string, string>;
};

const LookWithinCardComponent = ({ data }: { data: LookWithinData }) => {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const expandProgress = useSharedValue(0);

  const handleExpand = () => {
    if (!expanded) {
      setExpanded(true);
      expandProgress.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    }
  };

  const handleSelect = (opt: string) => {
    setSelected(opt);
  };

  const handleSave = async () => {
    if (selected && !saved) {
      await dbService.saveReflection({
        type: 'look_within',
        contentId: data.id,
        question: data.prompt,
        userResponse: selected,
        atmikResponse: data.responses[selected],
      });
      setSaved(true);
      
      // Optionally collapse after a moment
      setTimeout(() => {
        expandProgress.value = withTiming(0, { duration: 400, easing: Easing.inOut(Easing.quad) });
        setTimeout(() => {
          setExpanded(false);
          setSelected(null);
          setSaved(false);
        }, 400);
      }, 1500);
    }
  };

  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(expandProgress.value, [0, 1], [100, 320]); // Approximate expanded height
    return { height };
  });
  
  const expandedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: expandProgress.value,
      transform: [{ translateY: interpolate(expandProgress.value, [0, 1], [20, 0]) }],
    };
  });

  return (
    <Animated.View style={[stylesLookWithinCard.card, containerStyle]}>
      <TouchableOpacity 
        style={stylesLookWithinCard.header} 
        activeOpacity={expanded ? 1 : 0.7} 
        onPress={handleExpand}
      >
        <View style={stylesLookWithinCard.headerLeft}>
          <CircleDot color="#B8954A" size={20} />
          <View style={stylesLookWithinCard.headerText}>
            <Text style={stylesLookWithinCard.title}>Look Within</Text>
            <Text style={stylesLookWithinCard.subtitle}>Notice what's happening inside</Text>
          </View>
        </View>
        {!expanded && <ArrowRight color={Colors.textSecondary} size={20} />}
      </TouchableOpacity>

      {expanded && (
        <Animated.View style={[stylesLookWithinCard.expandedContent, expandedContentStyle]}>
          <Text style={stylesLookWithinCard.prompt}>{data.prompt}</Text>
          
          <View style={stylesLookWithinCard.optionsGrid}>
            {data.options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  stylesLookWithinCard.optionBtn,
                  selected === opt && stylesLookWithinCard.optionBtnActive,
                  selected && selected !== opt && { opacity: 0.5 }
                ]}
                onPress={() => handleSelect(opt)}
                disabled={selected !== null}
              >
                <Text style={[stylesLookWithinCard.optionText, selected === opt && stylesLookWithinCard.optionTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selected && (
            <Animated.View style={stylesLookWithinCard.responseArea}>
              <Text style={stylesLookWithinCard.response}>{data.responses[selected]}</Text>
              {!saved ? (
                <TouchableOpacity style={stylesLookWithinCard.saveBtn} onPress={handleSave}>
                  <Text style={stylesLookWithinCard.saveBtnText}>Keep this reflection</Text>
                </TouchableOpacity>
              ) : (
                <Text style={stylesLookWithinCard.savedText}>✓ Saved to your reflections</Text>
              )}
            </Animated.View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};

const stylesLookWithinCard = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(27, 45, 79, 0.05)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B2D4F',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A7E6E',
  },
  expandedContent: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(27, 45, 79, 0.05)',
    flex: 1,
  },
  prompt: {
    fontSize: 18,
    fontFamily: 'serif',
    color: '#1B2D4F',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: '#F9F3EA',
  },
  optionBtnActive: {
    backgroundColor: '#1B2D4F',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1B2D4F',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  responseArea: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(27, 45, 79, 0.05)',
  },
  response: {
    fontSize: 15,
    color: '#1B2D4F',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  saveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#F9F3EA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
  },
  saveBtnText: {
    color: '#B8954A',
    fontWeight: '600',
    fontSize: 13,
  },
  savedText: {
    fontSize: 13,
    color: '#B8954A',
    fontWeight: '500',
  }
});

export const TalkToAtmikCard = () => {
  const router = useRouter();

  const handlePress = () => {
    // Navigates to the chat screen. 
    // The chat screen will use standard setup or contextual opening.
    router.push('/chat');
  };

  return (
    <TouchableOpacity 
      style={stylesTalkToAtmikCard.card} 
      activeOpacity={0.7} 
      onPress={handlePress}
    >
      <View style={stylesTalkToAtmikCard.headerLeft}>
        <View style={stylesTalkToAtmikCard.iconBadge}>
          <MessageCircle color="#1B2D4F" size={20} />
        </View>
        <View style={stylesTalkToAtmikCard.headerText}>
          <Text style={stylesTalkToAtmikCard.title}>Talk to Atmik</Text>
          <Text style={stylesTalkToAtmikCard.subtitle}>Bring whatever is on your mind</Text>
        </View>
      </View>
      <ArrowRight color={Colors.textSecondary} size={20} />
    </TouchableOpacity>
  );
};

const stylesTalkToAtmikCard = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(27, 45, 79, 0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 76,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DDE4F0', // subtle blue tint
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B2D4F',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A7E6E',
  }
});

type WisdomData = {
  id: string;
  text: string;
};

export const ThoughtToCarryCard = ({ data }: { data: WisdomData }) => {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const expandProgress = useSharedValue(0);

  const handleExpand = () => {
    if (!expanded) {
      setExpanded(true);
      expandProgress.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    }
  };

  const handleSave = async () => {
    if (!saved) {
      await dbService.saveReflection({
        type: 'wisdom',
        contentId: data.id,
        userResponse: data.text, // store the wisdom text for easy display later
      });
      setSaved(true);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${data.text}" — Atmik AI`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(expandProgress.value, [0, 1], [76, 220]);
    return { height };
  });
  
  const expandedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: expandProgress.value,
      transform: [{ translateY: interpolate(expandProgress.value, [0, 1], [20, 0]) }],
    };
  });

  return (
    <Animated.View style={[stylesThoughtToCarryCard.card, containerStyle]}>
      <TouchableOpacity 
        style={stylesThoughtToCarryCard.header} 
        activeOpacity={expanded ? 1 : 0.7} 
        onPress={handleExpand}
      >
        <View style={stylesThoughtToCarryCard.headerLeft}>
          <View style={stylesThoughtToCarryCard.iconBadge}>
            <Star color="#B8954A" size={18} />
          </View>
          <View style={stylesThoughtToCarryCard.headerText}>
            <Text style={stylesThoughtToCarryCard.title}>A Thought to Carry</Text>
            <Text style={stylesThoughtToCarryCard.subtitle}>One thought for your day</Text>
          </View>
        </View>
        {!expanded && <ArrowRight color={Colors.textSecondary} size={20} />}
      </TouchableOpacity>

      {expanded && (
        <Animated.View style={[stylesThoughtToCarryCard.expandedContent, expandedContentStyle]}>
          <View style={stylesThoughtToCarryCard.wisdomContainer}>
            <Text style={stylesThoughtToCarryCard.wisdomText}>"{data.text}"</Text>
          </View>
          
          <View style={stylesThoughtToCarryCard.actionRow}>
            <TouchableOpacity style={stylesThoughtToCarryCard.actionBtn} onPress={handleSave}>
              <Heart color={saved ? "#B8954A" : Colors.textSecondary} size={18} fill={saved ? "#B8954A" : "transparent"} />
              <Text style={[stylesThoughtToCarryCard.actionText, saved && { color: "#B8954A" }]}>
                {saved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={stylesThoughtToCarryCard.actionBtn} onPress={handleShare}>
              <Text style={stylesThoughtToCarryCard.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const stylesThoughtToCarryCard = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(27, 45, 79, 0.05)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 76,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9F3EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B2D4F',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A7E6E',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(27, 45, 79, 0.05)',
    flex: 1,
  },
  wisdomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  wisdomText: {
    fontSize: 20,
    fontFamily: 'serif',
    color: '#1B2D4F',
    lineHeight: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 24,
    paddingBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  }
});

export const ReflectionsPreview = () => {
  const router = useRouter();
  const [recent, setRecent] = useState<ReflectionRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadRecent = async () => {
        const records = await dbService.getRecentReflections(3);
        setRecent(records);
      };
      loadRecent();
    }, [])
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'look_within': return <CircleDot color="#B8954A" size={14} />;
      case 'wisdom': return <Star color="#B8954A" size={14} />;
      case 'conversation': return <MessageCircle color="#1B2D4F" size={14} />;
      default: return null;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'todays_reflection': return "TODAY'S REFLECTION";
      case 'look_within': return "LOOK WITHIN";
      case 'wisdom': return "A THOUGHT TO CARRY";
      case 'conversation': return "CONVERSATION";
      default: return "REFLECTION";
    }
  };

  if (recent.length === 0) {
    return (
      <View style={stylesReflectionsPreview.emptyContainer}>
        <Text style={stylesReflectionsPreview.emptyTitle}>Your meaningful moments will appear here.</Text>
        <Text style={stylesReflectionsPreview.emptySub}>Take a moment whenever something feels worth keeping.</Text>
      </View>
    );
  }

  return (
    <View style={stylesReflectionsPreview.container}>
      {recent.map((record) => (
        <View key={record.id} style={stylesReflectionsPreview.itemCard}>
          <View style={stylesReflectionsPreview.itemHeader}>
            {getIcon(record.type)}
            <Text style={stylesReflectionsPreview.itemLabel}>{getLabel(record.type)}</Text>
          </View>
          
          {record.question && <Text style={stylesReflectionsPreview.questionText}>{record.question}</Text>}
          
          {record.userResponse && (
            <Text style={stylesReflectionsPreview.responseText} numberOfLines={3}>
              "{record.userResponse}"
            </Text>
          )}

          <TouchableOpacity 
            style={stylesReflectionsPreview.viewBtn}
            onPress={() => router.push(`/reflections/${record.id}`)}
          >
            <Text style={stylesReflectionsPreview.viewBtnText}>View →</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity 
        style={stylesReflectionsPreview.viewAllBtn}
        onPress={() => router.push('/reflections')}
      >
        <Text style={stylesReflectionsPreview.viewAllText}>View all →</Text>
      </TouchableOpacity>
    </View>
  );
};

const stylesReflectionsPreview = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 45, 79, 0.02)',
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    color: '#1B2D4F',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#8A7E6E',
    textAlign: 'center',
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(27, 45, 79, 0.05)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A7E6E',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1B2D4F',
    marginBottom: 8,
    lineHeight: 22,
  },
  responseText: {
    fontSize: 14,
    color: '#8A7E6E',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  viewBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B8954A',
  },
  viewAllBtn: {
    alignSelf: 'center',
    paddingVertical: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B2D4F',
  }
});



export const TodaysReflectionCard = React.memo(TodaysReflectionCardComponent);
export const LookWithinCard = React.memo(LookWithinCardComponent);
