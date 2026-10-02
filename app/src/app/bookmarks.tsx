import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { ArrowLeft, Bookmark as BookmarkIcon } from 'lucide-react-native';
import { Colors, Spacing } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/api';
import { ArticleRecommendationCard, FeaturedBookCard } from '../components/home/HomeComponents';

export default function BookmarksScreen() {
  const router = useRouter();
  const bookmarkedIds = useAppStore(state => state.bookmarks);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      // Get all content (could be cached) to display bookmarks
      const allContent = await apiService.fetchLibraryContent();
      const savedItems = allContent.filter((item: any) => bookmarkedIds.includes(item.id));
      setContent(savedItems);
      setLoading(false);
    };
    loadContent();
  }, [bookmarkedIds]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft color="#1B2D4F" size={24} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Saved Content</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : content.length === 0 ? (
          <View style={styles.centerContainer}>
            <BookmarkIcon color={Colors.textTertiary} size={48} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No saved content yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on articles and books to save them here for easy access later.
            </Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.back()}>
              <Text style={styles.exploreBtnText}>Explore Library</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {content.map(item => (
              item.type === 'book' ? (
                <View key={item.id} style={{ width: '48%', marginBottom: Spacing.md }}>
                  <FeaturedBookCard
                    item={item}
                    onPress={() => {
                      if (item.fileUrl) {
                        router.push({ pathname: '/reader', params: { url: item.fileUrl, title: item.title } });
                      }
                    }}
                  />
                </View>
              ) : (
                <View key={item.id} style={{ width: '48%', marginBottom: Spacing.md }}>
                  <ArticleRecommendationCard
                    item={item}
                    onPress={() => {
                      if (item.fileUrl) {
                        router.push({ 
                          pathname: '/article', 
                          params: { 
                            title: item.title, 
                            description: item.description, 
                            coverUrl: item.coverUrl || item.thumbnailUrl || item.imageUrl || '', 
                            author: item.author, 
                            readTime: item.readTime 
                          } 
                        });
                      }
                    }}
                  />
                </View>
              )
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAF8',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(27, 45, 79, 0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 40,
  },
  navTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: '500',
    color: '#1B2D4F',
  },
  content: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: '600',
    color: '#1B2D4F',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8A7E6E',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  }
});
