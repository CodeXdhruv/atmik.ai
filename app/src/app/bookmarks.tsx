import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Bookmark as BookmarkIcon } from 'lucide-react-native';
import { Colors, Shadows, Spacing } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/api';

function kindOf(item: { type?: string }) {
  return String(item.type || '').trim().toUpperCase();
}

function SavedCard({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) {
  const kind = kindOf(item);
  const isBook = kind === 'BOOK';
  const cover = item.coverUrl || item.thumbnailUrl || item.imageUrl;
  const isBookmarked = useAppStore(state => state.bookmarks.includes(item.id));
  const meta = isBook
    ? (item.author || 'Dr. Swatantra Jain')
    : (item.readTime ? `${item.readTime} min read` : 'Article');

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <Image
        source={cover ? { uri: cover } : require('@/assets/images/mountain_bg.png')}
        style={isBook ? styles.bookCover : styles.articleCover}
        contentFit="cover"
      />
      <View style={styles.cardBody}>
        <View style={[styles.badge, isBook ? styles.bookBadge : styles.articleBadge]}>
          <Text style={[styles.badgeText, isBook ? styles.bookBadgeText : styles.articleBadgeText]}>
            {kind || 'CONTENT'}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title || 'Untitled'}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          useAppStore.getState().toggleBookmarkLocal(item.id);
          apiService.toggleBookmark(item.id);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.saveBtn}
      >
        <BookmarkIcon
          color={isBookmarked ? Colors.primary : Colors.textSecondary}
          fill={isBookmarked ? Colors.primary : 'transparent'}
          size={18}
          strokeWidth={1.5}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function BookmarksScreen() {
  const router = useRouter();
  const bookmarkedIds = useAppStore(state => state.bookmarks);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      const allContent = await apiService.fetchLibraryContent();
      const savedItems = allContent.filter((item: any) => bookmarkedIds.includes(item.id));
      setContent(savedItems);
      setLoading(false);
    };
    loadContent();
  }, [bookmarkedIds]);

  const openItem = (item: any) => {
    const kind = kindOf(item);
    if (kind === 'BOOK' && item.fileUrl) {
      router.push({ pathname: '/reader', params: { id: item.id, url: item.fileUrl, title: item.title } });
      return;
    }
    if (kind === 'ARTICLE' || item.description) {
      router.push({
        pathname: '/article',
        params: {
          id: item.id, title: item.title,
          description: item.description,
          coverUrl: item.coverUrl || item.thumbnailUrl || item.imageUrl || '',
          author: item.author,
          readTime: item.readTime,
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            <BookmarkIcon color={Colors.textSecondary} size={48} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No saved content yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on articles and books to save them here for easy access later.
            </Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.back()}>
              <Text style={styles.exploreBtnText}>Explore Library</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {content.map(item => (
              <SavedCard key={item.id} item={item} onPress={() => openItem(item)} />
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
  list: {
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 12,
    ...Shadows.soft,
  },
  bookCover: {
    width: 72,
    height: 104,
    borderRadius: 8,
    backgroundColor: '#E8EEF5',
  },
  articleCover: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#E8EEF5',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bookBadge: {
    backgroundColor: Colors.primary,
  },
  articleBadge: {
    backgroundColor: '#EEF2FF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  bookBadgeText: {
    color: '#FFFFFF',
  },
  articleBadgeText: {
    color: '#4F6DC5',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'serif',
    lineHeight: 21,
  },
  cardMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  saveBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
