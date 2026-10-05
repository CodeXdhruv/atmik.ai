import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/api';
import { Colors } from '../constants/theme';
import { completeContinue, rememberContinue } from '../services/continueReading';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system/legacy';

const { width, height } = Dimensions.get('window');

export default function BookReaderScreen() {
  const router = useRouter();
  const { url, title, id, page } = useLocalSearchParams();
  const contentId = Array.isArray(id) ? id[0] : id;
  const startPage = Number(Array.isArray(page) ? page[0] : page) || 1;
  const isBookmarked = useAppStore(state => contentId ? state.bookmarks.includes(String(contentId)) : false);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const finishedRef = React.useRef(false);
  const atEnd = totalPages > 0 && currentPage >= totalPages;

  React.useEffect(() => {
    if (!url || typeof url !== 'string') return;
    
    // On Android, react-native-blob-util (used by react-native-pdf) has bugs with newer RN versions
    // related to trust managers and certificates. Downloading via expo-file-system bypasses this reliably.
    if (Platform.OS === 'android') {
      const secureDownload = async () => {
        try {
          const filename = url.split('/').pop() || 'book.pdf';
          const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_') + '.pdf';
          const fileUri = `${FileSystem.documentDirectory}${safeFilename}`;
          
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
            setLocalUri(fileUri);
            return;
          }
          
          const { uri } = await FileSystem.downloadAsync(url, fileUri);
          setLocalUri(uri);
        } catch (e: any) {
          console.error("Secure download failed:", e);
          setError(e.message || "Failed to securely download PDF.");
        }
      };
      secureDownload();
    } else {
      setLocalUri(url);
    }
  }, [url]);

  React.useEffect(() => {
    if (!contentId || totalPages < 1 || finishedRef.current) return;
    rememberContinue({
      id: String(contentId),
      type: 'BOOK',
      title: String(title || 'Untitled'),
      fileUrl: typeof url === 'string' ? url : undefined,
      page: currentPage,
      totalPages,
    });
  }, [contentId, title, url, currentPage, totalPages]);

  if (!url || typeof url !== 'string') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#0A2540" size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No valid PDF URL provided.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#0A2540" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Reading'}</Text>
          {totalPages > 0 && (
            <Text style={styles.headerSubtitle}>Page {currentPage} of {totalPages}</Text>
          )}
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
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* PDF View */}
      <View style={styles.pdfContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading PDF: {error}</Text>
          </View>
        ) : !localUri ? (
          <View style={[styles.loadingContainer, { flex: 1 }]}>
            <ActivityIndicator size="large" color="#0A2540" />
            <Text style={styles.loadingText}>Fetching secure document...</Text>
          </View>
        ) : (
          <Pdf
            source={{ uri: localUri, cache: false }}
            {...(startPage > 1 ? { page: startPage } : {})}
            onLoadComplete={(numberOfPages, filePath) => {
              setTotalPages(numberOfPages);
              console.log(`Number of pages: ${numberOfPages}`);
            }}
            onPageChanged={(page, numberOfPages) => {
              setCurrentPage(page);
            }}
            onError={(error) => {
              console.log('PDF Render Error:', error);
              setError(error.toString());
            }}
            onPressLink={(uri) => {
              console.log(`Link pressed: ${uri}`);
            }}
            style={styles.pdf}
            renderActivityIndicator={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0A2540" />
                <Text style={styles.loadingText}>Loading book...</Text>
              </View>
            )}
          />
        )}
      </View>
      {contentId && atEnd ? (
        <View style={styles.completeBar}>
          <TouchableOpacity
            style={styles.completeButton}
            activeOpacity={0.85}
            onPress={async () => {
              finishedRef.current = true;
              await completeContinue(String(contentId));
              router.back();
            }}
          >
            <Text style={styles.completeButtonText}>Mark as completed</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: '700',
    color: '#0A2540',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#E2E8F0', // Slightly darker background behind PDF pages
  },
  pdf: {
    flex: 1,
    width: width,
    height: height,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4A5568',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#E53E3E',
    textAlign: 'center',
  },
  completeBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  completeButton: {
    backgroundColor: '#0A2540',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
