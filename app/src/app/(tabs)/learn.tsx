import { FlashList } from '@shopify/flash-list';
import { Skeleton } from 'moti/skeleton';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { 
  Search, LayoutGrid, Book, FileText, Quote as QuoteIcon, Bookmark, ChevronLeft, ChevronRight, 
  Users, ArrowRight, Folder, Sparkles, Aperture, Atom, Wind, Droplet, Feather, Flame, Waves, 
  Infinity as InfinityIcon, Network, Layers, Boxes, Orbit, Asterisk, Focus, Zap, Hexagon, 
  Triangle, Circle, Sun, Moon, Heart, Compass, Lightbulb, BookOpen, Smile, Shield, Star, 
  Flower, Leaf, Globe, Target, Sunrise 
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { apiService } from '../../services/api';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'book', label: 'Books', icon: Book },
  { id: 'article', label: 'Articles', icon: FileText },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Folder, Aperture, Atom, Wind, Droplet, Feather, Flame, Waves, 
  Infinity: InfinityIcon, InfinityIcon, Network, Layers, Boxes, Sparkles, Orbit, 
  Asterisk, Focus, Zap, Hexagon, Triangle, Circle, Sun, Moon, Heart, Compass, 
  Lightbulb, Book, BookOpen, Smile, Shield, Star, Flower, Leaf, Globe, Target, Sunrise
};

const LOWER_ICON_MAP: Record<string, React.ElementType> = {};
Object.keys(ICON_MAP).forEach((key) => {
  LOWER_ICON_MAP[key.toLowerCase()] = ICON_MAP[key];
});

function getCategoryIcon(iconName?: string, categoryName?: string): React.ElementType {
  if (iconName) {
    if (ICON_MAP[iconName]) return ICON_MAP[iconName];
    const lowerKey = iconName.toLowerCase();
    if (LOWER_ICON_MAP[lowerKey]) return LOWER_ICON_MAP[lowerKey];
  }
  
  if (categoryName) {
    const nameLower = categoryName.toLowerCase();
    if (nameLower.includes('spirit') || nameLower.includes('soul') || nameLower.includes('awakening')) return Aperture;
    if (nameLower.includes('mindful') || nameLower.includes('aware') || nameLower.includes('focus')) return Focus;
    if (nameLower.includes('peace') || nameLower.includes('calm') || nameLower.includes('wind')) return Wind;
    if (nameLower.includes('disciplin') || nameLower.includes('courage') || nameLower.includes('zap')) return Zap;
    if (nameLower.includes('love') || nameLower.includes('heart') || nameLower.includes('heal')) return Heart;
    if (nameLower.includes('growth') || nameLower.includes('nature') || nameLower.includes('leaf')) return Leaf;
    if (nameLower.includes('wisdom') || nameLower.includes('purpose') || nameLower.includes('light')) return Lightbulb;
    if (nameLower.includes('hope') || nameLower.includes('gratitude') || nameLower.includes('sun')) return Sun;
    if (nameLower.includes('karma') || nameLower.includes('surrender')) return InfinityIcon;
  }

  return Folder;
}

export default function LearnScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories] = useState<any[]>(DEFAULT_CATEGORIES);
  const [themes, setThemes] = useState<any[]>([]);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [libraryContent, setLibraryContent] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const featuredScrollRef = React.useRef<ScrollView>(null);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);

  // Load cached items instantly on component mount (0 ms latency)
  React.useEffect(() => {
    async function loadCachedData() {
      const [cachedContent, cachedCategories] = await Promise.all([
        apiService.getCachedLibraryContent(),
        apiService.getCachedCategories()
      ]);

      if (cachedContent && cachedContent.length > 0) {
        setLibraryContent(cachedContent);
        setIsLoading(false);
      }

      if (cachedCategories && cachedCategories.length > 0) {
        const dynamicThemes = cachedCategories.map((cat: any) => ({
          id: cat.id || cat.name.toLowerCase(),
          label: cat.name,
          icon: getCategoryIcon(cat.icon, cat.name)
        }));
        setThemes(dynamicThemes);
      }
    }
    loadCachedData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [contentData, categoryData] = await Promise.all([
        apiService.fetchLibraryContent(),
        apiService.fetchCategories()
      ]);
      
      setLibraryContent(contentData);

      // Map backend categories to our UI format for themes
      const dynamicThemes = categoryData.map((cat: any) => ({
        id: cat.id || cat.name.toLowerCase(),
        label: cat.name,
        icon: getCategoryIcon(cat.icon, cat.name)
      }));

      setThemes(dynamicThemes);
    } catch (err) {
      console.error('Error fetching library data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredContent = libraryContent.filter((item) => {
    if (activeCategory === 'all') return true;
    
    // Filter purely by content type at the top level
    return item.type?.toLowerCase() === activeCategory;
  });

  const featuredItems = activeCategory === 'all' ? filteredContent.slice(0, Math.min(3, filteredContent.length)) : [];
  const curatedItems = activeCategory === 'all' ? filteredContent.slice(featuredItems.length) : filteredContent;

  const activeThemeItems = libraryContent.filter((item) => {
    const matchesTheme = item.category === activeTheme;
    if (!matchesTheme) return false;
    if (activeCategory === 'all') return true;
    return item.type?.toLowerCase() === activeCategory.toLowerCase();
  });

  React.useEffect(() => {
    if (featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFeaturedIndex((prev) => {
        const nextIndex = (prev + 1) % featuredItems.length;
        featuredScrollRef.current?.scrollTo({ x: nextIndex * (width - Spacing.lg * 2), y: 0, animated: true });
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredItems.length]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header matching Your Inner Journey page */}
        <View style={styles.headerBackground}>
          <Text style={styles.headerTitle}>Library</Text>
          <Text style={styles.headerSubtitle}>Knowledge for a calmer, wiser you.</Text>
        </View>

        {/* Categories Horizontal Scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon || Folder;
            
            return (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <Icon 
                  size={16} 
                  color={isActive ? '#FFFFFF' : Colors.primaryNavy} 
                  style={styles.categoryIcon}
                />
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        
        {isLoading && (
          <View style={{ padding: 20 }}>
            <Skeleton colorMode="light" height={240} width="100%" radius={20} />
            <View style={{ marginTop: 30, flexDirection: 'row', gap: 16 }}>
              <Skeleton colorMode="light" height={160} width={140} radius={16} />
              <Skeleton colorMode="light" height={160} width={140} radius={16} />
              <Skeleton colorMode="light" height={160} width={140} radius={16} />
            </View>
          </View>
        )}


        {/* Featured Section */}
        {!isLoading && featuredItems.length > 0 && (
          <View style={styles.featuredContainer}>
            <ScrollView
              ref={featuredScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / (width - Spacing.lg * 2));
                setActiveFeaturedIndex(newIndex);
              }}
            >
              {featuredItems.map((item, idx) => (
                <View key={item.id || idx} style={{ width: width - Spacing.lg * 2 }}>
                  <TouchableOpacity 
                    activeOpacity={0.9}
                    onPress={() => {
                       if (item.fileUrl) {
                        const contentType = item.type?.toUpperCase();
                        if (contentType === 'BOOK') {
                          router.push({ pathname: '/reader', params: { url: item.fileUrl, title: item.title } });
                        } else if (contentType === 'ARTICLE') {
                          router.push({ 
                            pathname: '/article', 
                            params: { 
                              title: item.title, 
                              description: item.description, 
                              coverUrl: item.coverUrl || (item as any).thumbnailUrl || (item as any).imageUrl || '', 
                              author: item.author, 
                              readTime: item.readTime 
                            } 
                          });
                        } else {
                          Linking.openURL(item.fileUrl);
                        }
                      }
                    }}
                  >
                    <ImageBackground
                      source={item.coverUrl ? { uri: item.coverUrl } : { uri: 'https://images.unsplash.com/photo-1499244571948-7cc80560242b?auto=format&fit=crop&w=800&q=80' }}
                      style={styles.featuredCard}
                      imageStyle={{ borderRadius: 20 }}
                    >
                      <View style={styles.featuredOverlay}>
                        <View style={styles.featuredTopRow}>
                          <Text style={styles.featuredTag}>FEATURED</Text>
                        </View>
                        
                        <View style={styles.featuredMainContent}>
                          <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
                          <Text style={styles.featuredDesc} numberOfLines={2}>{item.description || `Explore this ${item.type?.toLowerCase() || 'content'} in our library.`}</Text>
                          
                          <View style={styles.featuredBottomRow}>
                            <View style={styles.exploreButton}>
                              <Text style={styles.exploreButtonText}>Explore {item.type === 'BOOK' ? 'Book' : item.type === 'ARTICLE' ? 'Article' : 'Content'}</Text>
                              <ArrowRight color="#fff" size={16} style={{ marginLeft: 4 }} />
                            </View>
                            
                            {featuredItems.length > 1 && (
                              <View style={styles.paginationControls}>
                                <Text style={styles.paginationText}>{idx + 1} / {featuredItems.length}</Text>
                                <TouchableOpacity 
                                  style={styles.pageButton}
                                  onPress={() => {
                                    const nextIdx = (idx - 1 + featuredItems.length) % featuredItems.length;
                                    featuredScrollRef.current?.scrollTo({ x: nextIdx * (width - Spacing.lg * 2), y: 0, animated: true });
                                    setActiveFeaturedIndex(nextIdx);
                                  }}
                                >
                                  <ChevronLeft color="#0A2540" size={16} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={styles.pageButton}
                                  onPress={() => {
                                    const nextIdx = (idx + 1) % featuredItems.length;
                                    featuredScrollRef.current?.scrollTo({ x: nextIdx * (width - Spacing.lg * 2), y: 0, animated: true });
                                    setActiveFeaturedIndex(nextIdx);
                                  }}
                                >
                                  <ChevronRight color="#0A2540" size={16} />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Curated for You Section */}
        {!isLoading && curatedItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {activeCategory === 'all' ? 'Curated for You' : activeCategory === 'book' ? 'Books' : 'Articles'}
              </Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.viewAllText}>See all</Text>
                <ArrowRight color="#DEAB5B" size={14} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>

            
            <View style={{ height: 280, width: '100%' }}>
              <FlashList
                data={curatedItems}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.curatedScroll}
                // @ts-ignore - TS definitions for FlashList sometimes miss estimatedItemSize depending on node_modules state
                estimatedItemSize={176}
                keyExtractor={(item: any, index: number) => item.id || index.toString()}
                renderItem={({ item }: any) => (
                  <TouchableOpacity
                    style={styles.curatedCard}
                    activeOpacity={0.8}
                    onPress={() => {
                       if (item.fileUrl) {
                        const contentType = item.type?.toUpperCase();
                        if (contentType === 'BOOK') {
                          router.push({ pathname: '/reader', params: { url: item.fileUrl, title: item.title } });
                        } else if (contentType === 'ARTICLE') {
                          router.push({
                            pathname: '/article',
                            params: {
                              title: item.title,
                              description: item.description,
                              coverUrl: item.coverUrl || (item as any).thumbnailUrl || (item as any).imageUrl || '',
                              author: item.author,
                              readTime: item.readTime
                            }
                          });
                        } else {
                          Linking.openURL(item.fileUrl);
                        }
                      }
                    }}
                  >
                    <ImageBackground
                      source={item.coverUrl ? { uri: item.coverUrl } : { uri: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80' }}
                      style={styles.curatedImageContainer}
                      imageStyle={{ borderRadius: 12 }}
                    >
                      <View style={styles.curatedImage}>
                        <View style={styles.curatedCardTop}>
                          <Text style={styles.curatedTag}>{item.type?.toUpperCase() || 'CONTENT'}</Text>
                        </View>
                        {(!item.coverUrl && item.type !== 'QUOTE') && (
                          <View style={styles.curatedImageTextContainer}>
                            <Text style={styles.curatedImageTitle} numberOfLines={3}>{item.title}</Text>
                          </View>
                        )}
                      </View>
                    </ImageBackground>
                    <View style={styles.curatedContent}>
                      <Text style={styles.curatedItemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.curatedItemSubtitle} numberOfLines={2}>{item.description || `Explore this ${item.type?.toLowerCase() || 'item'}.`}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          </>
        )}

        {/* Explore by Theme */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore by Theme</Text>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.viewAllText}>See all</Text>
            <ArrowRight color="#DEAB5B" size={14} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.themeScroll}
        >
          {themes.map((theme) => {
            const Icon = theme.icon || Folder;
            const isActiveTheme = activeTheme === theme.label;
            return (
              <TouchableOpacity
                key={theme.id}
                style={[styles.themeChip, isActiveTheme && styles.themeChipActive]}
                onPress={() => setActiveTheme(isActiveTheme ? null : theme.label)}
              >
                <Icon color={isActiveTheme ? "#FFF" : "#0A2540"} size={18} strokeWidth={1.5} style={{ marginRight: 8 }} />
                <Text style={[styles.themeChipText, isActiveTheme && styles.themeChipTextActive]}>{theme.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dynamic Theme Content Display */}
        {activeTheme && (
          <Animated.View 
            entering={FadeInDown.duration(400).springify()} 
            exiting={FadeOutUp.duration(300)}
            layout={Layout.springify()}
            style={styles.themeContentContainer}
          >
            <View style={styles.themeContentHeader}>
              <Text style={styles.themeContentTitle}>Explore {activeTheme}</Text>
              <TouchableOpacity onPress={() => setActiveTheme(null)} style={styles.closeThemeButton}>
                <Text style={styles.closeThemeText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            {activeThemeItems.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.curatedScroll}
              >
                {activeThemeItems.map(item => (
                  <TouchableOpacity 
                    key={`theme-${item.id || Math.random().toString()}`}
                    style={styles.curatedCard}
                    activeOpacity={0.8}
                    onPress={() => {
                       if (item.fileUrl) {
                        const contentType = item.type?.toUpperCase();
                        if (contentType === 'BOOK') {
                          router.push({ pathname: '/reader', params: { url: item.fileUrl, title: item.title } });
                        } else if (contentType === 'ARTICLE') {
                          router.push({ 
                            pathname: '/article', 
                            params: { 
                              title: item.title, 
                              description: item.description, 
                              coverUrl: item.coverUrl || (item as any).thumbnailUrl || (item as any).imageUrl || '', 
                              author: item.author, 
                              readTime: item.readTime 
                            } 
                          });
                        } else {
                          Linking.openURL(item.fileUrl);
                        }
                      }
                    }}
                  >
                    {item.type === 'QUOTE' ? (
                       <View style={[styles.curatedImageContainer, { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16 }]}>
                         <View style={styles.curatedCardTop}>
                           <Text style={styles.curatedTag}>QUOTE</Text>
                         </View>
                         <View style={styles.quoteCardContent}>
                           <QuoteIcon color="#DEAB5B" size={24} fill="#DEAB5B" style={{ alignSelf: 'center', marginBottom: 12 }} />
                           <Text style={styles.quoteCardText} numberOfLines={3}>{item.title}</Text>
                           <Text style={styles.quoteCardAuthor}>{item.author || '— ATMIK'}</Text>
                         </View>
                       </View>
                    ) : (
                      <View style={styles.curatedImageContainer}>
                        <ImageBackground
                          source={item.coverUrl ? { uri: item.coverUrl } : { uri: 'https://images.unsplash.com/photo-1506869640319-ce1c24e1520e?auto=format&fit=crop&w=400&q=80' }}
                          style={styles.curatedImage}
                          imageStyle={{ borderRadius: 12 }}
                        >
                          <View style={styles.curatedCardTop}>
                            <Text style={styles.curatedTag}>{item.type || 'CONTENT'}</Text>
                          </View>
                          {item.type === 'BOOK' && (
                            <View style={styles.curatedImageTextContainer}>
                              <Text style={styles.curatedImageTitle}>{item.title}</Text>
                            </View>
                          )}
                        </ImageBackground>
                      </View>
                    )}
                    <View style={styles.curatedContent}>
                      <Text style={styles.curatedItemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.curatedItemSubtitle} numberOfLines={2}>{item.description || `Explore this ${item.type?.toLowerCase() || 'item'}.`}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyThemeContainer}>
                <Text style={styles.emptyThemeText}>
                  No {activeCategory !== 'all' ? (activeCategory === 'book' ? 'books' : 'articles') : 'content'} available for {activeTheme} yet.
                </Text>
              </View>
            )}
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBFC', 
  },
  scrollContent: {
    paddingBottom: 160,
  },
  headerBackground: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: '#FCFAF8',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: '500',
    color: '#1B2D4F',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8A7E6E',
    textAlign: 'center',
  },
  quoteContainer: {
    marginTop: 10,
    paddingRight: 60,
  },
  quoteText: {
    fontSize: 18,
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#0A2540',
    lineHeight: 26,
    marginBottom: 8,
  },
  authorContainer: {
    alignItems: 'flex-start',
  },
  quoteAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    letterSpacing: 1,
    marginBottom: 4,
  },
  authorUnderline: {
    width: 30,
    height: 2,
    backgroundColor: '#DEAB5B',
  },
  categoryScroll: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: Spacing.sm,
    ...Shadows.light,
  },
  categoryChipActive: {
    backgroundColor: '#0A2540',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  categoryIcon: {
    marginRight: 8,
  },
  featuredContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  featuredCard: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    ...Shadows.medium,
  },
  featuredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DEAB5B',
    letterSpacing: 1,
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light,
  },
  featuredMainContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredTitle: {
    fontSize: 28,
    fontFamily: 'serif',
    fontWeight: '700',
    color: '#0A2540',
    marginBottom: 8,
  },
  featuredDesc: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuredBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEAB5B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginRight: 12,
  },
  pageButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    ...Shadows.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: '600',
    color: '#0A2540',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DEAB5B',
  },
  curatedScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  curatedCard: {
    width: 160,
    marginRight: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    ...Shadows.light,
  },
  curatedImageContainer: {
    height: 180,
    width: '100%',
    marginBottom: 12,
  },
  curatedImage: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  curatedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  curatedTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DEAB5B',
    letterSpacing: 1,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  curatedImageTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  curatedImageTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: '600',
    color: '#0A2540',
    textAlign: 'center',
  },
  quoteCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quoteCardText: {
    fontSize: 14,
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: '#0A2540',
    textAlign: 'center',
    marginBottom: 8,
  },
  quoteCardAuthor: {
    fontSize: 10,
    fontWeight: '600',
    color: '#718096',
    letterSpacing: 0.5,
  },
  curatedContent: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  curatedItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A2540',
    marginBottom: 4,
  },
  curatedItemSubtitle: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
  },
  themeScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: Spacing.sm,
    ...Shadows.light,
  },
  themeChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
  },
  themeChipActive: {
    backgroundColor: '#0A2540',
    borderColor: '#0A2540',
  },
  themeChipTextActive: {
    color: '#FFF',
  },
  themeContentContainer: {
    marginTop: Spacing.sm,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: Spacing.md,
  },
  themeContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  themeContentTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: '600',
    color: '#0A2540',
  },
  closeThemeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  closeThemeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  emptyThemeContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyThemeText: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
  },
});

