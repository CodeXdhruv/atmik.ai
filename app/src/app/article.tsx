import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Dimensions } from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, User } from 'lucide-react-native';
import RenderHTML from 'react-native-render-html';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ArticleScreen() {
  const router = useRouter();
  const { title, description, coverUrl, author, readTime } = useLocalSearchParams();

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
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Parallax Header Image */}
        <ImageBackground 
          source={{ uri: (typeof coverUrl === 'string' && coverUrl) ? coverUrl : 'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=2000' }}
          style={styles.headerImage}
        >
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
        </ImageBackground>

        {/* Article Body */}
        <View style={styles.articleBody}>
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
  headerImage: {
    width: width,
    height: width * 1.1, // Tall engaging header
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
  }
});
