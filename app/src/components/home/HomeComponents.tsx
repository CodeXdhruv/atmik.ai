import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, withDelay, Easing, runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Wind, Check, Bookmark, ChevronRight, Library, BookOpen } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import forYouData from '../../../assets/for_you_today.json';
import { apiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

// ── Design tokens ──────────────────────────────────────────────
const CARD_BG    = '#F9F3EA';   
const CARD_TEXT  = '#1B2D4F';   
const CARD_MUTED = '#8A7E6E';   
const GOLD       = '#B8954A';   
const WORD_TEXT  = '#2C4068';   
const HISTORY_KEY = forYouData.selection.storageKey; // '@atmik/for_you_today/history_v1'

// ── Types ──────────────────────────────────────────────────────
type MicroExperience = {
  id: string;
  label: string;
  question: string;
  helper: string;
  releaseOptions: string[];
  transitionLabel: string;
  secondQuestion: string;
  spaceOptions: string[];
  completion: {
    title: string;
    message_templates: string[];
  };
};

// ── Background SVG ────────────────────────────────────────────
const RippleDecoration = () => (
  <Svg width={130} height={130} viewBox="0 0 130 130" style={stylesLetItGoCard.svgDecor}>
    <Defs>
      <RadialGradient id="rg" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor={GOLD} stopOpacity="0.18" />
        <Stop offset="100%" stopColor={GOLD} stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="65" cy="65" r="65" fill="url(#rg)" />
    <Circle cx="65" cy="65" r="20" fill="none" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0.35" />
    <Circle cx="65" cy="65" r="35" fill="none" stroke={GOLD} strokeWidth="0.7" strokeOpacity="0.28" />
    <Circle cx="65" cy="65" r="50" fill="none" stroke={GOLD} strokeWidth="0.6" strokeOpacity="0.20" />
    <Circle cx="65" cy="65" r="65" fill="none" stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.12" />
    <Circle cx="65" cy="65" r="3" fill={GOLD} fillOpacity="0.5" />
    <Circle cx="65" cy="65" r="1.5" fill={GOLD} fillOpacity="0.8" />
  </Svg>
);

// ── Particle ──────────────────────────────────────────────────
const Particle = ({ isActive }: { isActive: boolean }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * 18 + 8;

  useEffect(() => {
    if (isActive) {
      opacity.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withTiming(0, { duration: 800 + Math.random() * 300 })
      );
      translateX.value = withTiming(Math.cos(angle) * distance, { duration: 900, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(Math.sin(angle) * distance - 10, { duration: 900, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(0, { duration: 900 });
    }
  }, [isActive]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return <Animated.View style={[stylesLetItGoCard.particle, style]} />;
};

// ── Floating word chip ─────────────────────────────────────────
const FloatingWord = ({
  word, index, isLast, onPress, selectedWord, status,
}: {
  word: string; index: number; isLast: boolean;
  onPress: (w: string, i: number) => void; selectedWord: string | null;
  status: 'idle' | 'animating';
}) => {
  const floatY    = useSharedValue(0);
  const scale     = useSharedValue(1);
  const translateY = useSharedValue(0);
  const opacity   = useSharedValue(1);
  const particlesActive = status === 'animating' && selectedWord === word;

  useEffect(() => {
    if (status === 'idle') {
      floatY.value = 0;
      scale.value = 1;
      translateY.value = 0;
      opacity.value = withTiming(1, { duration: 400 });
    }
  }, [status]);

  useEffect(() => {
    if (status === 'animating') {
      // Smoothly return the floating word to baseline instead of snapping to 0
      floatY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      
      if (selectedWord === word) {
        scale.value = withTiming(1.05, { duration: 300, easing: Easing.out(Easing.quad) });
        translateY.value = withDelay(150, withTiming(-16, { duration: 800, easing: Easing.out(Easing.cubic) }));
        opacity.value = withDelay(250, withTiming(0, { duration: 700 }));
      } else {
        opacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) });
      }
    }
  }, [status, selectedWord]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: floatY.value + translateY.value }, { scale: scale.value }],
  }));

  const particles = Array.from({ length: 8 }).map((_, i) => <Particle key={i} isActive={particlesActive} />);

  return (
    <Animated.View style={[stylesLetItGoCard.wordWrapper, animStyle]}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => { if (status === 'idle') onPress(word, index); }}
        accessibilityRole="button"
        accessibilityLabel={`Select ${word}`}
        style={stylesLetItGoCard.wordTouch}
      >
        <View style={stylesLetItGoCard.wordChip}>
          <Text 
            style={stylesLetItGoCard.wordText}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {word}
          </Text>
          {particles}
        </View>
      </TouchableOpacity>
      {!isLast && <View style={stylesLetItGoCard.wordDivider} />}
    </Animated.View>
  );
};

// ── Main Component ─────────────────────────────────────────────
type Stage = 'loading' | 'let_go' | 'make_space' | 'completed';

function LetItGoCardComponent({ experienceData }: { experienceData?: any }) {
  const [stage, setStage] = useState<Stage>('loading');
  const [experience, setExperience] = useState<MicroExperience | null>(null);
  const [experienceIndex, setExperienceIndex] = useState(0);
  
  // Selection state
  const [firstChoice, setFirstChoice] = useState<{word: string, index: number} | null>(null);
  const [secondChoice, setSecondChoice] = useState<{word: string, index: number} | null>(null);
  const [finalMessage, setFinalMessage] = useState('');

  // UI state
  const [interactionStatus, setInteractionStatus] = useState<'idle' | 'animating'>('idle');
  const contentOpacity = useSharedValue(0);
  const completionScale = useSharedValue(0.95);

  // Load experience on mount & reset
  const loadExperience = useCallback(async () => {
    try {
      // 1. Try fetching today's dynamic item from server API
      const serverForYou = await apiService.fetchTodaysForYou();
      if (serverForYou && serverForYou.question && Array.isArray(serverForYou.releaseOptions) && serverForYou.releaseOptions.length > 0) {
        setExperience(serverForYou as MicroExperience);
        setExperienceIndex(0);
        setStage('let_go');
        contentOpacity.value = withTiming(1, { duration: 600 });
        return;
      }

      // 2. Fallback to local history / JSON assets if server unavailable or empty
      const historyStr = await AsyncStorage.getItem(HISTORY_KEY);
      const completedIds: string[] = historyStr ? JSON.parse(historyStr) : [];
      
      const experiences = forYouData.experiences as MicroExperience[];
      const available = experiences.filter(exp => !completedIds.includes(exp.id));
      
      let selected: MicroExperience;
      let selectedIndex: number;
      
      if (available.length > 0) {
        selected = available[0];
        selectedIndex = experiences.findIndex(e => e.id === selected.id);
      } else {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([]));
        selected = experiences[0];
        selectedIndex = 0;
      }

      setExperience(selected);
      setExperienceIndex(selectedIndex);
      setStage('let_go');
      contentOpacity.value = withTiming(1, { duration: 600 });
    } catch (error) {
      const exps = forYouData.experiences as MicroExperience[];
      setExperience(exps[0]);
      setExperienceIndex(0);
      setStage('let_go');
      contentOpacity.value = withTiming(1, { duration: 600 });
    }
  }, []);

  useEffect(() => {
    if (experienceData && experienceData.question && Array.isArray(experienceData.releaseOptions) && experienceData.releaseOptions.length > 0) {
      setExperience(experienceData as MicroExperience);
      setExperienceIndex(0);
      setStage('let_go');
      contentOpacity.value = withTiming(1, { duration: 600 });
    } else {
      loadExperience();
    }
  }, [experienceData, loadExperience]);

  const saveCompletion = async (id: string) => {
    try {
      const historyStr = await AsyncStorage.getItem(HISTORY_KEY);
      const completedIds: string[] = historyStr ? JSON.parse(historyStr) : [];
      
      // Limit history to what's defined in the schema
      const limit = forYouData.selection.historyLimit || 30;
      if (!completedIds.includes(id)) {
        const newHistory = [id, ...completedIds].slice(0, limit);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      }
    } catch (e) {
      console.error('Failed to save completion history', e);
    }
  };

  const advanceStage = (nextStage: Stage) => {
    setStage(nextStage);
    setInteractionStatus('idle');
    
    if (nextStage === 'completed' && experience) {
      saveCompletion(experience.id);
    }

    // Delay the Reanimated fade-in slightly so React has time to completely
    // unmount the old stage and mount the new stage, preventing ghost flashes.
    setTimeout(() => {
      contentOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
      if (nextStage === 'completed') {
        completionScale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) });
      }
    }, 100);
  };

  const handleSelection = (word: string, index: number) => {
    if (interactionStatus !== 'idle') return;
    
    if (stage === 'let_go') {
      setFirstChoice({ word, index });
    } else if (stage === 'make_space') {
      setSecondChoice({ word, index });
      
      // Compute final message before transitioning to completed
      if (experience && firstChoice) {
        const tplArray = experience.completion.message_templates;
        // Formula: (firstChoiceIndex + secondChoiceIndex + experienceIndex) % message_templates.length
        const messageIndex = (index + firstChoice.index + experienceIndex) % tplArray.length;
        let msg = tplArray[messageIndex];
        
        msg = msg.replace('{first_choice}', firstChoice.word);
        msg = msg.replace('{second_choice}', word);
        setFinalMessage(msg);
      }
    }

    setInteractionStatus('animating');

    setTimeout(() => {
      contentOpacity.value = withTiming(0, { duration: 600 }, (finished) => {
        if (finished) {
          if (stage === 'let_go') runOnJS(advanceStage)('make_space');
          else if (stage === 'make_space') runOnJS(advanceStage)('completed');
        }
      });
    }, 1400);
  };

  const resetCard = () => {
    setStage('loading');
    setFirstChoice(null);
    setSecondChoice(null);
    setInteractionStatus('idle');
    loadExperience();
  };

  const contentAnimStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const completionAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: completionScale.value }] }));

  const renderQuestion = (label: string, question: string, helper: string | null, words: string[], activeChoice: string | null) => (
    <>
      <View style={stylesLetItGoCard.cardHeader}>
        <Wind color={GOLD} size={13} strokeWidth={2} />
        <Text style={stylesLetItGoCard.cardLabel}>{label}</Text>
        <View style={stylesLetItGoCard.headerLine} />
      </View>
      
      <View style={stylesLetItGoCard.contentArea}>
        <View style={stylesLetItGoCard.questionContainer}>
          <Text style={stylesLetItGoCard.question}>{question}</Text>
          {helper && <Text style={stylesLetItGoCard.instruction}>{helper}</Text>}
        </View>
      </View>

      <View style={stylesLetItGoCard.wordsRow}>
        {words.map((word, index) => (
          <FloatingWord
            key={word} word={word} index={index}
            isLast={index === words.length - 1}
            onPress={handleSelection} selectedWord={activeChoice} status={interactionStatus}
          />
        ))}
      </View>
    </>
  );

  if (!experience) {
    return <View style={stylesLetItGoCard.container}><View style={stylesLetItGoCard.card} /></View>; // Loading shell
  }

  return (
    <View style={stylesLetItGoCard.container}>
      <View style={stylesLetItGoCard.card}>
        <RippleDecoration />
        
        {stage !== 'completed' && (
          <Animated.View style={[stylesLetItGoCard.innerFlow, contentAnimStyle]}>
            {stage === 'let_go' && renderQuestion(
              experience.label,
              experience.question,
              experience.helper,
              experience.releaseOptions,
              firstChoice?.word || null
            )}
            {stage === 'make_space' && renderQuestion(
              experience.transitionLabel,
              experience.secondQuestion,
              null,
              experience.spaceOptions,
              secondChoice?.word || null
            )}
          </Animated.View>
        )}

        {stage === 'completed' && (
          <Animated.View style={[stylesLetItGoCard.innerFlow, stylesLetItGoCard.completedContainer, completionAnimStyle]}>
            <View style={stylesLetItGoCard.checkIconWrapper}>
              <Check color={GOLD} size={18} strokeWidth={2.5} />
            </View>
            <Text style={stylesLetItGoCard.completedTitle}>{experience.completion.title}</Text>
            <Text style={stylesLetItGoCard.completedText}>{finalMessage}</Text>
            
            <TouchableOpacity onPress={resetCard} style={stylesLetItGoCard.doneBtn} activeOpacity={0.6}>
              <Text style={stylesLetItGoCard.doneText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const stylesLetItGoCard = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.lg,
    padding: 10,
    shadowColor: '#8A7E6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    height: 220,
    overflow: 'hidden',
  },
  innerFlow: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ── SVG decoration ──────────────────────────────────────────
  svgDecor: {
    position: 'absolute',
    top: -22,
    right: -22,
    opacity: 1,
  },

  // ── Header ──────────────────────────────────────────────────
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.8,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(184,149,74,0.25)',
    marginLeft: 4,
  },

  // ── Content ──────────────────────────────────────────────────
  contentArea: {
    flex: 1,
    justifyContent: 'center',
  },
  questionContainer: {
    justifyContent: 'center',
  },
  question: {
    fontSize: 22,
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: CARD_TEXT,
    lineHeight: 30,
    marginBottom: 6,
  },
  instruction: {
    fontSize: 13,
    color: CARD_MUTED,
  },

  // ── Words ────────────────────────────────────────────────────
  wordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(184,149,74,0.2)',
  },
  wordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  wordTouch: { flex: 1, alignItems: 'center' },
  wordChip: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    position: 'relative',
  },
  wordText: {
    fontSize: 15,
    fontWeight: '500',
    color: WORD_TEXT,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  wordDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(184,149,74,0.3)',
  },

  // ── Particles ────────────────────────────────────────────────
  particle: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: 3, height: 3,
    borderRadius: 1.5,
    backgroundColor: GOLD,
  },

  // ── Completed ────────────────────────────────────────────────
  completedContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: Spacing.xl,
  },
  checkIconWrapper: {
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: CARD_TEXT,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 14,
    color: CARD_MUTED,
    lineHeight: 22,
    paddingRight: 20,
  },
  doneBtn: {
    marginTop: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
  },
  doneText: {
    fontSize: 12,
    fontWeight: '600',
    color: GOLD,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 22;
const COLUMN_GAP = 12;
const CONTENT_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const BOOK_COL_WIDTH = CONTENT_WIDTH * 0.42;
const ARTICLE_COL_WIDTH = CONTENT_WIDTH * 0.58 - COLUMN_GAP;

// ─── Types ───────────────────────────────────────────────
interface LibraryItem {
  id: string;
  title: string;
  type: 'BOOK' | 'ARTICLE' | string;
  coverUrl?: string | null;
  fileUrl?: string | null;
  author?: string | null;
  description?: string | null;
  readTime?: number | null;
  createdAt?: string;
}

interface RecommendedSectionProps {
  content: LibraryItem[];
  onViewAll: () => void;
  onPressBook: (item: LibraryItem) => void;
  onPressArticle: (item: LibraryItem) => void;
}

function SaveMark({ id, onCover = false }: { id: string; onCover?: boolean }) {
  const isBookmarked = useAppStore(state => state.bookmarks.includes(id));
  return (
    <TouchableOpacity
      style={[stylesRecommendedSection.saveBtn, onCover && stylesRecommendedSection.saveBtnOnCover]}
      onPress={() => {
        useAppStore.getState().toggleBookmarkLocal(id);
        apiService.toggleBookmark(id);
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Bookmark
        color={isBookmarked ? Colors.primary : Colors.textSecondary}
        fill={isBookmarked ? Colors.primary : 'transparent'}
        size={14}
        strokeWidth={1.75}
      />
    </TouchableOpacity>
  );
}

// ─── Featured Book Card ──────────────────────────────────
export const FeaturedBookCard = ({
  item,
  onPress,
}: {
  item: LibraryItem;
  onPress: () => void;
}) => {
  const coverSource = item.coverUrl
    ? { uri: item.coverUrl }
    : require('@/assets/images/mountain_bg.png');

  return (
    <TouchableOpacity
      style={stylesRecommendedSection.bookCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <ImageBackground
        source={coverSource}
        style={stylesRecommendedSection.bookCover}
        imageStyle={stylesRecommendedSection.bookCoverImage}
        contentFit="cover"
      >
        <View style={stylesRecommendedSection.bookTopRow}>
          <View style={stylesRecommendedSection.bookBadge}>
            <Text style={stylesRecommendedSection.bookBadgeText}>BOOK</Text>
          </View>
          <SaveMark id={item.id} onCover />
        </View>
      </ImageBackground>

      <View style={stylesRecommendedSection.bookInfo}>
        <Text style={stylesRecommendedSection.bookTitle} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={stylesRecommendedSection.bookAuthor} numberOfLines={1}>
          {item.author || 'Dr. Swatantra Jain'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Article Recommendation Card ─────────────────────────
export const ArticleRecommendationCard = ({
  item,
  onPress,
}: {
  item: LibraryItem;
  onPress: () => void;
}) => {
  const thumbSource = item.coverUrl
    ? { uri: item.coverUrl }
    : require('@/assets/images/quotes_background.webp');

  return (
    <TouchableOpacity
      style={stylesRecommendedSection.articleCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Image
        source={thumbSource}
        style={stylesRecommendedSection.articleThumb}
        contentFit="cover"
      />
      <View style={stylesRecommendedSection.articleTextCol}>
        <Text style={stylesRecommendedSection.articleTitle} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={stylesRecommendedSection.articleMeta}>
          {item.readTime ? `${item.readTime} min` : '5 min'}
        </Text>
      </View>
      <SaveMark id={item.id} />
    </TouchableOpacity>
  );
};

// ─── Main Section ────────────────────────────────────────
export const RecommendedSection = ({
  content,
  onViewAll,
  onPressBook,
  onPressArticle,
}: RecommendedSectionProps) => {
  // Pick the first BOOK for the featured card
  const featuredBook = content.find((i) => i.type === 'BOOK') || content[0];

  // Pick up to 3 articles (or non-featured items) for the right column
  const articles = content
    .filter((i) => i.id !== featuredBook?.id)
    .slice(0, 3);

  if (!featuredBook && articles.length === 0) {
    return null; // nothing to show
  }

  return (
    <View style={stylesRecommendedSection.section}>
      {/* Header row */}
      <View style={stylesRecommendedSection.headerRow}>
        <View style={stylesRecommendedSection.headingGroup}>
          <Library color={Colors.accent} size={24} strokeWidth={2} />
          <View style={stylesRecommendedSection.headingText}>
            <Text style={stylesRecommendedSection.sectionHeading}>Recommended for You</Text>
            <Text style={stylesRecommendedSection.sectionSubtitle}>A book and a few articles to read.</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onViewAll}
          style={stylesRecommendedSection.viewAllBtn}
          activeOpacity={0.7}
        >
          <Text style={stylesRecommendedSection.viewAllText}>View all</Text>
          <ChevronRight
            color={Colors.accent}
            size={14}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      {/* Two-column grid */}
      <View style={stylesRecommendedSection.grid}>
        {/* Left — Featured Book */}
        <View style={{ width: BOOK_COL_WIDTH }}>
          {featuredBook && (
            <FeaturedBookCard
              item={featuredBook}
              onPress={() => onPressBook(featuredBook)}
            />
          )}
        </View>

        {/* Right — Articles stack */}
        <View style={stylesRecommendedSection.articleColumn}>
          {articles.map((item) => (
            <ArticleRecommendationCard
              key={item.id}
              item={item}
              onPress={() => onPressArticle(item)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────
const BOOK_CARD_HEIGHT = 240;
const ARTICLE_GAP = 7;
// Each article card height = (bookCardHeight - 2 * gap) / 3
const ARTICLE_CARD_HEIGHT = (BOOK_CARD_HEIGHT - ARTICLE_GAP * 2) / 3;

const stylesRecommendedSection = StyleSheet.create({
  // Section wrapper
  section: {
    marginTop: -8,
    marginBottom: Spacing.lg,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  headingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  headingText: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'serif',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.accent,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: COLUMN_GAP,
  },

  // ─── Book Card ──────────────────────────────────────
  bookCard: {
    height: BOOK_CARD_HEIGHT,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(184, 149, 74, 0.22)',
    overflow: 'hidden',
    ...Shadows.soft,
  },
  bookCover: {
    flex: 0.68,
    padding: 8,
  },
  bookTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bookCoverImage: {
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
  },
  bookBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  bookBadgeText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  bookInfo: {
    flex: 0.32,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFcf7',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'serif',
    lineHeight: 18,
  },
  bookAuthor: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  saveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F4EE',
  },
  saveBtnOnCover: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },

  // ─── Article Column ─────────────────────────────────
  articleColumn: {
    flex: 1,
    height: BOOK_CARD_HEIGHT,
    justifyContent: 'space-between',
    gap: ARTICLE_GAP,
  },

  // ─── Article Card ───────────────────────────────────
  articleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(184, 149, 74, 0.22)',
    paddingLeft: 6,
    paddingRight: 8,
    gap: 8,
    ...Shadows.soft,
  },
  articleTextCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  articleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    lineHeight: 16,
  },
  articleMeta: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  articleThumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#E8EEF5',
  },
});

export const LetItGoCard = React.memo(LetItGoCardComponent);

type ContinueItem = {
  id: string;
  type?: string;
  title?: string;
  author?: string | null;
  coverUrl?: string | null;
  fileUrl?: string | null;
  description?: string | null;
  readTime?: string | number | null;
  page?: number;
  totalPages?: number;
};

function JourneyCard({ item, onPress }: { item: ContinueItem; onPress: () => void }) {
  const progress = item.page && item.totalPages ? Math.min(1, item.page / item.totalPages) : 0;
  const percent = Math.round(progress * 100);
  const cover = item.coverUrl
    ? { uri: item.coverUrl }
    : require('@/assets/images/mountain_bg.png');
  return (
    <TouchableOpacity
      style={stylesContinue.card}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <ImageBackground
        source={cover}
        style={stylesContinue.cover}
        imageStyle={stylesContinue.coverImage}
        contentFit="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(10, 24, 48, 0.88)']}
          style={stylesContinue.overlay}
        >
          <Text style={stylesContinue.itemTitle} numberOfLines={2}>{item.title || 'Untitled'}</Text>
          <View style={stylesContinue.progressRow}>
            <View style={stylesContinue.track}>
              <View style={[stylesContinue.fill, { width: `${percent}%` }]} />
            </View>
            <Text style={stylesContinue.percent}>{percent}%</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

export function ContinueFromHere({
  items,
  onPress,
  onViewAll,
}: {
  items: ContinueItem[];
  onPress: (item: ContinueItem) => void;
  onViewAll: () => void;
}) {
  return (
    <View style={stylesContinue.section}>
      <View style={stylesContinue.header}>
        <View style={stylesContinue.headingGroup}>
          <BookOpen color={Colors.accent} size={24} strokeWidth={2} />
          <View style={stylesContinue.headingText}>
            <Text style={stylesContinue.title} numberOfLines={1}>Continue Your Journey</Text>
            <Text style={stylesContinue.subtitle}>Pick up where you left off.</Text>
          </View>
        </View>
        <TouchableOpacity style={stylesContinue.viewAll} onPress={onViewAll} activeOpacity={0.7}>
          <Text style={stylesContinue.viewAllText}>View all</Text>
          <ChevronRight color={Colors.accent} size={14} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={stylesContinue.cardRow}
      >
        {items.map((item) => (
          <JourneyCard key={item.id} item={item} onPress={() => onPress(item)} />
        ))}
      </ScrollView>
    </View>
  );
}

const stylesContinue = StyleSheet.create({
  section: {
    marginTop: -12,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 12,
  },
  headingGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  headingText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#B8954A',
  },
  cardRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    width: 160,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8EEF5',
    ...Shadows.light,
  },
  cover: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  coverImage: {
    borderRadius: 16,
  },
  overlay: {
    paddingHorizontal: 12,
    paddingTop: 36,
    paddingBottom: 12,
    gap: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#E4C27A',
  },
  percent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
