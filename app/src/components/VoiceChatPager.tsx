import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import auth from '@react-native-firebase/auth';
import EventSource from "react-native-sse";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { API_BASE_URL } from "../api/client";
import {
  ArrowLeft,
  Settings2,
  Mic,
  Send,
  Info,
  RotateCcw,
  Sparkles,
  User,
  MessageSquare,
  Activity,
  ChevronRight,
  ChevronLeft,
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
  useAnimatedKeyboard,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
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
      <Path d="M50 25 L50 95" />
      <Path d="M15 90 C 35 85, 48 60, 48 25" />
      <Path d="M85 90 C 65 85, 52 60, 52 25" />
      <Circle cx="50" cy="12" r="3.5" fill={color} stroke="none" />
    </Svg>
  );
};

const ChatBubbleIcon = () => (
  <Svg
    width="80"
    height="80"
    viewBox="0 0 100 100"
    fill="none"
    stroke={GOLD}
    strokeWidth="1.5"
    style={{ marginBottom: -5 }}
  >
    <Path d="M 15 40 C 15 15, 85 15, 85 40 C 85 60, 65 70, 55 70 L 50 85 L 45 70 C 35 70, 15 60, 15 40 Z" />
    <Circle cx="35" cy="40" r="3" fill={GOLD} stroke="none" />
    <Circle cx="50" cy="40" r="3" fill={GOLD} stroke="none" />
    <Circle cx="65" cy="40" r="3" fill={GOLD} stroke="none" />
  </Svg>
);

interface VoiceChatPagerProps {
  initialPage?: 'voice' | 'chat';
}

export default function VoiceChatPager({ initialPage = 'chat' }: VoiceChatPagerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 0 = Voice, 1 = Chat
  const initialIndex = initialPage === 'voice' ? 0 : 1;
  const activeIndex = useSharedValue(initialIndex);
  const translateX = useSharedValue(initialIndex === 0 ? 0 : -width);
  const startX = useSharedValue(0);

  // Shared state & logic for Voice screen
  const [selectedLang, setSelectedLang] = useState<'hi' | 'en'>('hi');
  const userId = auth().currentUser?.uid || 'anonymous';
  const voiceChat = useVoiceChat(userId, selectedLang);

  // Shared state & logic for Chat screen
  const [chatMessages, setChatMessages] = useState<{ id: string; text: string; role: "user" | "ai" }[]>([]);
  const [inputText, setInputText] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatFlatListRef = useRef<FlatList>(null);
  const voiceScrollViewRef = useRef<ScrollView>(null);

  // Reanimated animations for Orbs
  const pulse = useSharedValue(0);
  const ringRotate = useSharedValue(0);
  const micPulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    ringRotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  useEffect(() => {
    if (voiceChat.isRecording) {
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
  }, [voiceChat.isRecording]);

  const prevVoiceMsgLen = useRef(voiceChat.messages.length);
  useEffect(() => {
    if (voiceChat.messages.length > prevVoiceMsgLen.current || voiceChat.isRecording) {
      voiceScrollViewRef.current?.scrollToEnd({ animated: true });
    }
    prevVoiceMsgLen.current = voiceChat.messages.length;
  }, [voiceChat.messages.length, voiceChat.isRecording]);

  const keyboard = useAnimatedKeyboard();

  const animatedChatContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }]
  }));

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0.8]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
  }));

  const animatedRing = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotate.value}deg` }],
  }));

  const animatedMic = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(micPulse.value, [0, 1], [1, 1.1]) }],
    opacity: interpolate(micPulse.value, [0, 1], [0.5, 0.2]),
  }));

  // Page Switch Navigation Helpers
  const goToVoice = () => {
    translateX.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.6 });
    activeIndex.value = 0;
  };

  const goToChat = () => {
    translateX.value = withSpring(-width, { damping: 22, stiffness: 220, mass: 0.6 });
    activeIndex.value = 1;
  };

  // Smooth Gesture Handler
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const nextX = startX.value + event.translationX;
      translateX.value = Math.max(-width, Math.min(0, nextX));
    })
    .onEnd((event) => {
      const dragThreshold = width / 3.5;
      const velocityThreshold = 400;

      if (activeIndex.value === 0) {
        // Currently on Voice (translateX near 0). Dragging left (< 0) goes to Chat
        if (event.translationX < -dragThreshold || event.velocityX < -velocityThreshold) {
          translateX.value = withSpring(-width, { damping: 22, stiffness: 220, mass: 0.6 }, () => {
            activeIndex.value = 1;
          });
        } else {
          translateX.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.6 });
        }
      } else {
        // Currently on Chat (translateX near -width). Dragging right (> 0) goes to Voice
        if (event.translationX > dragThreshold || event.velocityX > velocityThreshold) {
          translateX.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.6 }, () => {
            activeIndex.value = 0;
          });
        } else {
          translateX.value = withSpring(-width, { damping: 22, stiffness: 220, mass: 0.6 });
        }
      }
    });

  const animatedPagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Chat send handler
  const handleChatSend = async () => {
    if (!inputText.trim() || isChatLoading) return;
    
    const userMessage = { id: Date.now().toString(), text: inputText.trim(), role: "user" as const };
    setChatMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsChatLoading(true);
    Keyboard.dismiss();

    try {
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage = { id: aiMessageId, text: "", role: "ai" as const };
      setChatMessages((prev) => [...prev, aiMessage]);

      const currentUser = auth().currentUser;
      const token = currentUser ? await currentUser.getIdToken() : '';

      const es = new EventSource(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: userMessage.text, userId: currentUser?.uid || "test-user-123" }),
      });

      es.addEventListener("message", (event) => {
        if (event.data) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'text') {
              setChatMessages((prev) => prev.map(msg => 
                msg.id === aiMessageId ? { ...msg, text: msg.text + data.content } : msg
              ));
            } else if (data.type === 'done') {
              setChatMessages((prev) => prev.map(msg => 
                msg.id === aiMessageId ? { ...msg, text: data.final_text } : msg
              ));
              es.close();
              setIsChatLoading(false);
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      });

      es.addEventListener("error", (event) => {
        console.error("SSE error", event);
        es.close();
        setChatMessages((prev) => prev.map(msg => 
          msg.id === aiMessageId && !msg.text ? { ...msg, text: "Oops, something went wrong." } : msg
        ));
        setIsChatLoading(false);
      });

    } catch (error) {
      console.error("Error sending message:", error);
      setIsChatLoading(false);
    }
  };

  const renderChatMessage = ({ item }: { item: { id: string; text: string; role: "user" | "ai" } }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.chatBubble, isUser ? styles.userChatBubble : styles.aiChatBubble]}>
        <Text style={[styles.chatMsgText, isUser ? styles.userChatMsgText : styles.aiChatMsgText]}>
          {item.text}
        </Text>
      </View>
    );
  };

  const hasVoiceMessages = voiceChat.messages.length > 0 || voiceChat.isRecording;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BG }}>
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Animated.View style={[styles.pagerContainer, animatedPagerStyle]}>

            {/* PAGE 0: VOICE SCREEN */}
            <View style={[styles.pageWrapper, { paddingTop: insets.top + 10 }]}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
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

              {/* Central Section */}
              {!hasVoiceMessages ? (
                <View style={styles.orbContainer}>
                  <Animated.View style={[styles.outerCircle, { width: 380, height: 380 }]} />
                  <Animated.View style={[styles.outerCircle, { width: 320, height: 320 }]} />

                  <Animated.View style={[styles.dottedRingContainer, animatedRing]}>
                    <Svg width={260} height={260}>
                      <Circle cx="130" cy="130" r="129" stroke={GOLD} strokeWidth="1" strokeDasharray="2, 6" fill="none" opacity="0.5" />
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

                  <Animated.View style={[styles.centerGlow, animatedGlow]}>
                    <Svg width="200" height="200">
                      <Defs>
                        <RadialGradient id="gradVoice" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                          <Stop offset="0%" stopColor="#FFF" stopOpacity="1" />
                          <Stop offset="50%" stopColor={GOLD} stopOpacity="0.4" />
                          <Stop offset="100%" stopColor={BG} stopOpacity="0" />
                        </RadialGradient>
                      </Defs>
                      <Circle cx="100" cy="100" r="100" fill="url(#gradVoice)" />
                    </Svg>
                  </Animated.View>

                  <View style={styles.lotusWrapper}>
                    <LotusIcon size={110} color={GOLD} />
                  </View>
                </View>
              ) : (
                <View style={styles.conversationContainer}>
                  <View style={styles.conversationHeader}>
                    <View style={styles.convoBadge}>
                      <MessageSquare size={14} color={GOLD} />
                      <Text style={styles.convoBadgeText}>Live Conversation</Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.resetButton}
                      onPress={voiceChat.clearMessages}
                      activeOpacity={0.7}
                    >
                      <RotateCcw size={14} color={NAVY} />
                      <Text style={styles.resetButtonText}>New Chat</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    ref={voiceScrollViewRef}
                    style={styles.chatScrollView}
                    contentContainerStyle={styles.chatContentContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    {voiceChat.messages.map((item) => (
                      <View 
                        key={item.id} 
                        style={[styles.msgRow, item.sender === 'user' ? styles.userRow : styles.aiRow]}
                      >
                        <View style={[styles.voiceMsgBubble, item.sender === 'user' ? styles.voiceUserBubble : styles.voiceAiBubble]}>
                          <View style={styles.msgMetaHeader}>
                            {item.sender === 'user' ? (
                              <>
                                <User size={12} color="#FFF" />
                                <Text style={styles.userSenderName}>You</Text>
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} color={GOLD} />
                                <Text style={styles.aiSenderName}>Atmik AI</Text>
                              </>
                            )}
                          </View>
                          
                          {item.sender === 'ai' && item.isStreaming && !item.text ? (
                            <Text style={styles.thinkingText}>Thinking...</Text>
                          ) : (
                            <Text style={[styles.voiceMsgText, item.sender === 'user' ? styles.userVoiceMsgText : styles.aiVoiceMsgText]}>
                              {item.text}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}

                    {voiceChat.isRecording && (
                      <View style={[styles.msgRow, styles.userRow]}>
                        <View style={[styles.voiceMsgBubble, styles.voiceUserBubble, { opacity: 0.8 }]}>
                          <View style={styles.msgMetaHeader}>
                            <User size={12} color="#FFF" />
                            <Text style={styles.userSenderName}>Listening...</Text>
                          </View>
                          <Text style={styles.userVoiceMsgText}>{voiceChat.transcription || "Listening to your voice..."}</Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Voice Status & Swipe Hint */}
              <View style={styles.statusContainer}>
                {voiceChat.error ? (
                  <Text style={[styles.listeningText, { color: 'red' }]}>{voiceChat.error}</Text>
                ) : (
                  <>
                    <Text style={styles.listeningText} numberOfLines={2} ellipsizeMode="tail">
                      {voiceChat.isRecording ? "Listening..." : (hasVoiceMessages ? "Tap mic to reply" : "Tap mic to speak")}
                    </Text>
                    {voiceChat.isRecording && <Text style={styles.tapToStopText}>Tap mic to stop & send</Text>}
                  </>
                )}

                <TouchableOpacity style={styles.swipeHint} onPress={goToChat} activeOpacity={0.7}>
                  <Info size={12} color={GOLD} />
                  <Text style={styles.swipeHintText}>Swipe left for Chat</Text>
                  <ChevronRight size={14} color={GOLD} />
                </TouchableOpacity>
              </View>

              {/* Controls */}
              <View style={styles.controlsContainer}>
                <TouchableOpacity style={styles.secondaryButton} onPress={voiceChat.clearMessages}>
                  <RotateCcw color={NAVY} size={22} strokeWidth={1.5} />
                </TouchableOpacity>

                <View style={styles.micCenterContainer}>
                  <Animated.View style={[styles.micPulseRing, animatedMic]} />
                  <TouchableOpacity 
                    style={[styles.micButton, voiceChat.isRecording && { backgroundColor: '#E04F5F' }]} 
                    onPress={() => voiceChat.isRecording ? voiceChat.stopRecording() : voiceChat.startRecording()}
                  >
                    <Mic color="#FFF" size={32} strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.secondaryButton}>
                  <Activity color={NAVY} size={22} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* PAGE 1: CHAT SCREEN */}
            <View style={[styles.pageWrapper, { paddingTop: insets.top + 10 }]}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                  <ArrowLeft color={NAVY} size={24} strokeWidth={1.5} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>AI Chat</Text>
                </View>

                <TouchableOpacity style={styles.iconButton}>
                  <Settings2 color={NAVY} size={24} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>

              <Animated.View style={[{ flex: 1, justifyContent: "space-between" }, animatedChatContentStyle]}>
                {chatMessages.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <View style={styles.orbContainer}>
                      <Animated.View style={[styles.outerCircle, { width: 380, height: 380 }]} />
                      <Animated.View style={[styles.outerCircle, { width: 320, height: 320 }]} />

                      <Animated.View style={[styles.dottedRingContainer, animatedRing]}>
                        <Svg width={260} height={260}>
                          <Circle cx="130" cy="130" r="129" stroke={GOLD} strokeWidth="1" strokeDasharray="2, 6" fill="none" opacity="0.5" />
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

                      <Animated.View style={[styles.centerGlow, animatedGlow]}>
                        <Svg width="200" height="200">
                          <Defs>
                            <RadialGradient id="gradChat" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                              <Stop offset="0%" stopColor="#FFF" stopOpacity="1" />
                              <Stop offset="50%" stopColor={GOLD} stopOpacity="0.4" />
                              <Stop offset="100%" stopColor={BG} stopOpacity="0" />
                            </RadialGradient>
                          </Defs>
                          <Circle cx="100" cy="100" r="100" fill="url(#gradChat)" />
                        </Svg>
                      </Animated.View>

                      <View style={styles.artWrapper}>
                        <ChatBubbleIcon />
                        <LotusIcon size={120} color={GOLD} />
                        <View style={styles.reflection}>
                          <LotusIcon size={120} color={GOLD} />
                        </View>
                      </View>
                    </View>

                    <View style={styles.textSection}>
                      <Text style={styles.assistTitle}>How can I assist you today?</Text>
                      <Text style={styles.assistSubtitle}>Ask anything • Learn anything • Grow together</Text>

                      <TouchableOpacity style={styles.swipeHint} onPress={goToVoice} activeOpacity={0.7}>
                        <ChevronLeft size={14} color={GOLD} />
                        <Info size={12} color={GOLD} />
                        <Text style={styles.swipeHintText}>Swipe right for Voice</Text>
                      </TouchableOpacity>

                      <View style={styles.separator}>
                        <View style={styles.line} />
                        <LotusIcon size={20} color={GOLD} />
                        <View style={styles.line} />
                      </View>
                    </View>
                  </View>
                ) : (
                  <FlatList
                    ref={chatFlatListRef}
                    data={chatMessages}
                    keyExtractor={item => item.id}
                    renderItem={renderChatMessage}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, flexGrow: 1 }}
                    onContentSizeChange={() => chatFlatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => chatFlatListRef.current?.scrollToEnd({ animated: true })}
                    keyboardShouldPersistTaps="handled"
                  />
                )}

                {/* Text Input Box */}
                <View style={[styles.inputWrapper, { paddingBottom: Math.max(24, insets.bottom + 20) }]}>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Type your message..."
                      placeholderTextColor="#A0A0A0"
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={handleChatSend}
                    />
                    <TouchableOpacity style={styles.inputMicButton} onPress={goToVoice}>
                      <Mic color={GOLD} size={22} strokeWidth={1.5} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.sendButton} onPress={handleChatSend} disabled={isChatLoading}>
                      {isChatLoading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Send color="#FFF" size={16} strokeWidth={2} style={{ marginLeft: 2 }} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </View>

          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  pagerContainer: {
    flexDirection: "row",
    width: width * 2,
    flex: 1,
  },
  pageWrapper: {
    width: width,
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
    fontFamily: "Georgia",
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
  orbContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    minHeight: 320,
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
  artWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  reflection: {
    opacity: 0.2,
    transform: [{ scaleY: -0.4 }, { translateY: -60 }],
    marginTop: -40,
  },
  conversationContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 160, 91, 0.2)',
    marginBottom: 12,
  },
  convoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(217, 160, 91, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  convoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: GOLD,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: NAVY,
  },
  chatScrollView: {
    flex: 1,
  },
  chatContentContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  voiceMsgBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  voiceUserBubble: {
    backgroundColor: NAVY,
    borderBottomRightRadius: 4,
  },
  voiceAiBubble: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(217, 160, 91, 0.3)',
    borderBottomLeftRadius: 4,
  },
  msgMetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userSenderName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiSenderName: {
    fontSize: 11,
    fontWeight: '600',
    color: GOLD,
  },
  voiceMsgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userVoiceMsgText: {
    color: '#FFF',
  },
  aiVoiceMsgText: {
    color: NAVY,
  },
  thinkingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: GOLD,
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 30,
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
    marginBottom: 16,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    opacity: 0.8,
    gap: 4,
  },
  swipeHintText: {
    fontSize: 12,
    color: GOLD,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
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
  textSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  assistTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: NAVY,
    fontFamily: "Georgia",
    marginBottom: 8,
  },
  assistSubtitle: {
    fontSize: 13,
    color: "#8C8C8C",
    letterSpacing: 0.2,
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 12,
  },
  line: {
    height: 1,
    width: 40,
    backgroundColor: GOLD,
    opacity: 0.3,
  },
  inputWrapper: {
    paddingHorizontal: 24,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F2E8D9",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: NAVY,
    minHeight: 40,
  },
  inputMicButton: {
    padding: 10,
    marginRight: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
  },
  chatBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  userChatBubble: {
    alignSelf: "flex-end",
    backgroundColor: GOLD,
    borderBottomRightRadius: 4,
  },
  aiChatBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F2E8D9",
    borderBottomLeftRadius: 4,
  },
  chatMsgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userChatMsgText: {
    color: "#FFF",
  },
  aiChatMsgText: {
    color: NAVY,
  },
});
