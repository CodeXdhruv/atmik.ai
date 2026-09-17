import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Dimensions, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, User } from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ArticleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { title, description, author, readTime } = params;

  // Extract cover/thumbnail URL from all possible param fields sent by caller
  const rawCover = (params.coverUrl || params.thumbnailUrl || params.imageUrl || params.thumbnail || params.cover) as string | undefined;

  const hasValidCover = typeof rawCover === 'string' && rawCover.trim().length > 0 && rawCover !== 'null' && rawCover !== 'undefined';
  const validCoverUrl = hasValidCover
    ? rawCover!.trim()
    : 'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=2000';

  // Dismiss any active keyboard when opening article
  useEffect(() => {
    Keyboard.dismiss();
  }, []);

  const htmlContent = typeof description === 'string' && description.trim() !== '' 
    ? description 
    : `<p>No article content available. This article might have been uploaded as a PDF only.</p>`;

  const tagsStyles = {
    body: {
      color: '#4A5568',
      fontSize: 18,
      lineHeight: 30,
      fontFamily: 'serif',
    },
    p: {
      marginBottom: 20,
    },
    h1: {
      color: '#0A2540',
      fontSize: 28,
      marginTop: 24,
      marginBottom: 16,
    },
    h2: {
      color: '#0A2540',
      fontSize: 24,
      marginTop: 20,
      marginBottom: 12,
    },
    strong: {
      color: '#0A2540',
      fontWeight: 'bold',
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: '#DEAB5B',
      paddingLeft: 16,
      marginLeft: 0,
      fontStyle: 'italic',
      color: '#718096',
    },
    img: {
      borderRadius: 12,
      marginVertical: 16,
      maxWidth: '100%',
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
        {/* Header Image Container with High-Performance expo-image */}
        <View style={styles.headerContainer}>
          <Image 
            source={{ uri: validCoverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          >
            <SafeAreaView edges={['top']} style={styles.safeAreaTop}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft color="#FFF" size={24} />
              </TouchableOpacity>
            </SafeAreaView>

            <View style={styles.headerContent}>
              <Text style={styles.title}>{title || 'Untitled Article'}</Text>
              
              <View style={styles.metaContainer}>
                {author && (
                  <View style={styles.metaBadge}>
                    <User color="#FFF" size={14} />
                    <Text style={styles.metaText}>{author}</Text>
                  </View>
                )}
                <View style={styles.metaBadge}>
                  <Clock color="#FFF" size={14} />
                  <Text style={styles.metaText}>{readTime || 5} min read</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Article Body */}
        <View style={styles.articleBody}>
          {hasValidCover && (
            <View style={styles.bodyImageContainer}>
              <Image
                source={{ uri: validCoverUrl }}
                style={styles.bodyImage}
                contentFit="cover"
                transition={300}
              />
            </View>
          )}

          <RenderHTML
            contentWidth={width - 48} // 24px padding on each side
            source={{ html: htmlContent }}
            tagsStyles={tagsStyles as any}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  headerContainer: {
    width: width,
    height: width * 1.1, // Tall engaging header
    position: 'relative',
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  safeAreaTop: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontFamily: 'serif',
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 42,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 6,
  },
  metaText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  articleBody: {
    backgroundColor: '#FAFBFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 80,
  },
  bodyImageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  bodyImage: {
    width: '100%',
    height: '100%',
  },
});
