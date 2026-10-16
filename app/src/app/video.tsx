import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, Play, Video as VideoIcon } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Colors } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/api';

export default function VideoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const url = Array.isArray(params.url) ? params.url[0] : params.url;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const subtitle = Array.isArray(params.subtitle) ? params.subtitle[0] : params.subtitle;
  const coverUrl = Array.isArray(params.coverUrl) ? params.coverUrl[0] : params.coverUrl;
  const author = Array.isArray(params.author) ? params.author[0] : params.author;
  const isYoutubeValue = Array.isArray(params.isYoutube) ? params.isYoutube[0] : params.isYoutube;
  const isYoutube = typeof isYoutubeValue === 'string'
    ? isYoutubeValue === 'true'
    : Boolean(isYoutubeValue);

  const isBookmarked = useAppStore(state => contentId ? state.bookmarks.includes(String(contentId)) : false);
  const [isOpeningYoutube, setIsOpeningYoutube] = useState(false);

  const resolvedUrl = useMemo(() => {
    if (!url || typeof url !== 'string') return '';
    if (isYoutube) return url;
    return url.trim();
  }, [isYoutube, url]);

  const player = useVideoPlayer(resolvedUrl ? { uri: resolvedUrl } : null, (player) => {
    player.loop = false;
    player.muted = false;
    player.play();
  });

  React.useEffect(() => {
    if (!isYoutube || !resolvedUrl) return;
    setIsOpeningYoutube(true);
    Linking.openURL(resolvedUrl);
  }, [isYoutube, resolvedUrl]);

  if (!resolvedUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#0A2540" size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <VideoIcon size={28} color={Colors.primaryNavy} />
          <Text style={styles.emptyTitle}>No video available</Text>
          <Text style={styles.emptyText}>This item does not have a valid video source yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#0A2540" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Video'}</Text>
          {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {contentId ? (
          <TouchableOpacity
            onPress={() => {
              useAppStore.getState().toggleBookmarkLocal(String(contentId));
              apiService.toggleBookmark(String(contentId));
            }}
            style={styles.bookmarkButton}
          >
            <Bookmark
              color={isBookmarked ? Colors.primary : '#0A2540'}
              fill={isBookmarked ? Colors.primary : 'transparent'}
              size={20}
              strokeWidth={1.75}
            />
          </TouchableOpacity>
        ) : <View style={{ width: 44 }} />}
      </View>

      {isYoutube ? (
        <View style={styles.youtubeState}>
          <View style={styles.youtubeBadge}>
            <Play size={18} color="#FFF" fill="#FFF" />
            <Text style={styles.youtubeBadgeText}>Opening YouTube</Text>
          </View>
          {isOpeningYoutube ? (
            <ActivityIndicator size="large" color={Colors.primaryNavy} style={styles.loader} />
          ) : null}
          <Text style={styles.youtubeText}>The video is being opened in YouTube.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => Linking.openURL(resolvedUrl)}
          >
            <Text style={styles.primaryButtonText}>Open video</Text>
          </TouchableOpacity>
          {coverUrl ? (
            <View style={styles.coverCard}>
              <Text style={styles.coverLabel}>Source</Text>
              <Text style={styles.coverText}>{author || 'Atmik AI'}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.playerWrap}>
          <VideoView
            style={styles.player}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            contentFit="contain"
          />
          <View style={styles.metaCard}>
            {author ? <Text style={styles.metaText}>By {author}</Text> : null}
            <Text style={styles.metaText}>{subtitle || 'Video lesson'}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F3F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, marginHorizontal: 12 },
  headerTitle: { color: '#0A2540', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#5B6A7A', fontSize: 12, marginTop: 2 },
  bookmarkButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F3F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: { marginTop: 14, color: '#0A2540', fontSize: 20, fontWeight: '700' },
  emptyText: { marginTop: 6, color: '#5B6A7A', textAlign: 'center', lineHeight: 20 },
  youtubeState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  youtubeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF0000',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  youtubeBadgeText: { color: '#FFF', fontWeight: '700' },
  youtubeText: { marginTop: 18, color: '#455466', fontSize: 15, textAlign: 'center' },
  primaryButton: {
    marginTop: 16,
    backgroundColor: Colors.primaryNavy,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '700' },
  coverCard: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  coverLabel: { color: '#7C8895', fontSize: 11, textTransform: 'uppercase' },
  coverText: { marginTop: 6, color: '#0A2540', fontSize: 16, fontWeight: '600' },
  playerWrap: { flex: 1, padding: 16 },
  player: { width: '100%', height: 280, borderRadius: 18, overflow: 'hidden' },
  metaCard: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  metaText: { color: '#0A2540', fontSize: 15, lineHeight: 22 },
  loader: { marginTop: 16 },
});
