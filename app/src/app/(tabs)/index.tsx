import { Skeleton } from 'moti/skeleton';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { Bell, Lightbulb, CheckCircle2, Check, Edit3, Edit2, Heart, ChevronRight, Bookmark, Sprout } from 'lucide-react-native';
import { usePracticeStore } from '../../store/usePracticeStore';
import { apiService } from '../../services/api';
import * as Linking from 'expo-linking';
import { RecommendedSection, LetItGoCard } from '@/components/home/HomeComponents';


const { width } = Dimensions.get('window');

const HeroCarousel = ({ quotes }: { quotes: any[] }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Quotes passed via props

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % quotes.length;
        scrollRef.current?.scrollTo({ x: nextIndex * (width - Spacing.lg * 2), y: 0, animated: true });
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [width, quotes.length]);

  return (
    <View style={styles.heroContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / (width - Spacing.lg * 2));
          setActiveIndex(newIndex);
        }}
      >
        {quotes.map((item, index) => (
          <View key={item.id} style={[styles.heroCard, { width: width - Spacing.lg * 2 }]}>
            <ImageBackground
              source={require('@/assets/images/quotes_background.png')}
              style={styles.heroBackground}
              imageStyle={{ borderRadius: Radius.lg - 0.5, resizeMode: 'cover' }}
            >
              <View style={styles.heroContent}>
                <View style={{ width: '65%' }}>
                  <View style={styles.heroLabelContainer}>
                    <Text style={styles.heroLabel}>Daily Inspiration</Text>
                    <Lightbulb color={Colors.textPrimary} size={14} style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.heroQuote}>{item.text || item.quote}</Text>
                  <Text style={styles.heroAuthor}>{item.author}</Text>
                </View>
              </View>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>
      <View style={styles.paginationDots}>
        {quotes.map((_, idx) => (
          <View key={idx} style={[styles.dot, activeIndex === idx && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { habits, journalSaved, gratitudes, seenQuoteIds, currentDailyQuotes, lastQuoteRefreshDate, setSeenQuoteIds, setCurrentDailyQuotes, setLastQuoteRefreshDate } = usePracticeStore();
  
  const completedHabits = habits.filter(h => h.completed).length;
  const isGratitudeComplete = gratitudes.every(g => g.trim().length > 0);

  const [recommendedContent, setRecommendedContent] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await apiService.fetchLibraryContent();
      setRecommendedContent(data);
        setIsLoading(false);

      // Quotes logic
      const today = new Date().toDateString();
      if (lastQuoteRefreshDate !== today || currentDailyQuotes.length === 0) {
        try {
          const allQuotes = await apiService.fetchQuotesPool();
          let unseen = allQuotes.filter((q: any) => !seenQuoteIds.includes(q.id));
          
          let selectedQuotes = [];
          if (unseen.length >= 3) {
            selectedQuotes = unseen.sort(() => 0.5 - Math.random()).slice(0, 3);
            setSeenQuoteIds([...seenQuoteIds, ...selectedQuotes.map((q: any) => q.id)]);
          } else if (allQuotes.length >= 3) {
            // Loop back to beginning
            selectedQuotes = allQuotes.sort(() => 0.5 - Math.random()).slice(0, 3);
            setSeenQuoteIds(selectedQuotes.map((q: any) => q.id));
          } else {
            // Less than 3 quotes in DB
            selectedQuotes = allQuotes;
            setSeenQuoteIds(selectedQuotes.map((q: any) => q.id));
          }

          if (selectedQuotes.length > 0) {
            setCurrentDailyQuotes(selectedQuotes);
            setLastQuoteRefreshDate(today);
          }
        } catch (e) {
          console.error("Failed to load quotes", e);
        }
      }

    }
    loadData();
  }, [lastQuoteRefreshDate, currentDailyQuotes.length]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={styles.greeting}>Welcome back, Dhruv!</Text>
              <Text style={styles.subGreeting}>How are you feeling today?</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <View style={styles.notificationDot} />
              <Bell color={Colors.textPrimary} size={20} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Inspiration Hero */}
        <HeroCarousel quotes={currentDailyQuotes.length > 0 ? currentDailyQuotes : [{id:"1", text:"Take a breath", author:"Atmik"}]} />

        {/* For You Today */}
        <View style={styles.section}>
          <View style={styles.forYouHeader}>
            <Sprout color={Colors.accent} size={24} strokeWidth={2} />
            <View>
              <Text style={styles.forYouTitle}>For You Today</Text>
              <Text style={styles.forYouSubtitle}>A small moment for yourself.</Text>
            </View>
          </View>
          
          <LetItGoCard />
        </View>

        {/* Recommended for You */}
        
        {isLoading && (
          <View style={{ paddingHorizontal: 22, marginTop: 20 }}>
             <Skeleton colorMode="light" height={24} width={180} radius={4} />
             <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
               <Skeleton colorMode="light" height={240} width={(Dimensions.get('window').width - 44) * 0.42} radius={16} />
               <View style={{ flex: 1, gap: 7, justifyContent: 'space-between' }}>
                 <Skeleton colorMode="light" height={75} width="100%" radius={13} />
                 <Skeleton colorMode="light" height={75} width="100%" radius={13} />
                 <Skeleton colorMode="light" height={75} width="100%" radius={13} />
               </View>
             </View>
          </View>
        )}


        {!isLoading && <RecommendedSection
          content={recommendedContent}
          onViewAll={() => router.push('/(tabs)/learn')}
          onPressBook={(item) => {
            if (item.fileUrl) {
              router.push({ pathname: '/reader', params: { url: item.fileUrl, title: item.title } });
            }
          }}
          onPressArticle={(item) => {
            if (item.fileUrl && item.fileUrl !== 'text-only') {
              Linking.openURL(item.fileUrl);
            } else {
              router.push({
                pathname: '/article',
                params: { title: item.title, description: item.description, coverUrl: item.coverUrl, author: item.author, readTime: item.readTime },
              });
            }
          }}
        />
        }

      </ScrollView>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 140, // Space for Bottom Tab
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    marginRight: 12,
  },
  greeting: {
    // Matches Practice tab: 24px, serif, 500
    fontSize: 24,
    fontWeight: '500',
    color: Colors.primary,
    fontFamily: 'serif',
  },
  subGreeting: {
    // Matches Practice tab: 14px, muted
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    zIndex: 1,
  },
  heroContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroCard: {
    height: 220,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  heroBackground: { flex: 1 },
  heroContent: {
    padding: Spacing.lg,
    flex: 1,
  },
  heroLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  heroQuote: {
    fontSize: 24,
    color: Colors.primary,
    fontFamily: 'serif',
    fontStyle: 'italic',
    lineHeight: 32,
    marginBottom: 12,
  },
  heroAuthor: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 16,
    backgroundColor: Colors.primary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  forYouHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 12,
  },
  forYouTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'serif',
  },
  forYouSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTextContainer: {
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  horizontalScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 16,
  },
  journeyCard: {
    width: 160,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  journeyImagePlaceholder: {
    height: 80,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.sm,
    marginBottom: -16, // To overlap progress
  },
  journeyProgress: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 8,
    marginLeft: 8,
  },
  journeyProgressText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
  journeyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  journeySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  journeyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  journeyAction: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  practiceContainer: {
    marginHorizontal: Spacing.lg,
    backgroundColor: '#FAFAFA',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  practiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  practiceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 12,
    flex: 1,
  },
  practiceStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  practiceDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 48,
  },
  viewAllAction: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  recommendedCard: {
    width: 240,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.soft,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recommendedImagePlaceholder: {
    height: 100,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  recommendedContent: {
    padding: Spacing.sm,
  },
  recommendedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  recommendedSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  practiceGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  practiceCardBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    ...Shadows.soft,
    alignItems: 'center',
    height: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  practiceCardTitle: {
    // Matches Practice tab discoveryTitle: 14px, 600
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  practiceCardFooter: {
    width: '100%',
    alignItems: 'center',
  },
  practiceCardSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent, // Gold instead of bright blue
    borderRadius: 2,
  },
  practiceCardFooterRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

});

