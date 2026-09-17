import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import innerJourneyData from '../../../assets/inner_journey.json';

import { 
  LookWithinCard, 
  TalkToAtmikCard, 
  ThoughtToCarryCard, 
  ReflectionsPreview, 
  TodaysReflectionCard,
} from '@/components/journey/JourneyComponents';

import { apiService } from '@/services/api';

export default function JourneyScreen() {
  const [todaysReflectionData, setTodaysReflectionData] = useState<any>(innerJourneyData.todaysReflection[0]);
  const [lookWithinData, setLookWithinData] = useState<any>(innerJourneyData.lookWithin[0]);
  const [thoughtData, setThoughtData] = useState<any>(innerJourneyData.thoughtsToCarry[0]);

  // Load cached journey instantly on mount (0 ms latency)
  React.useEffect(() => {
    async function loadCached() {
      const cached = await apiService.getCachedTodaysJourney();
      if (cached) {
        setTodaysReflectionData({ ...cached.todaysReflection, id: cached.id });
        setLookWithinData({ ...cached.lookWithin, id: cached.id });
        setThoughtData({ ...cached.thoughtToCarry, id: cached.id });
      }
    }
    loadCached();
  }, []);

  // Load daily content from backend API (revalidating in background)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadJourney() {
        const dynamicJourney = await apiService.fetchTodaysJourney();

        if (isMounted && dynamicJourney) {
          setTodaysReflectionData({ ...dynamicJourney.todaysReflection, id: dynamicJourney.id });
          setLookWithinData({ ...dynamicJourney.lookWithin, id: dynamicJourney.id });
          setThoughtData({ ...dynamicJourney.thoughtToCarry, id: dynamicJourney.id });
        }
      }

      loadJourney();
      return () => { isMounted = false; };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ───────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Inner Journey</Text>
          <Text style={styles.headerSubtitle}>Pause. Reflect. Understand.</Text>
        </View>

        {/* ── Today's Reflection (Hero) ─────────────────── */}
        <View style={styles.heroSection}>
          <TodaysReflectionCard data={todaysReflectionData} />
        </View>

        {/* ── A Little Deeper ────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>A LITTLE DEEPER</Text>
          <Text style={styles.sectionSubtitle}>Take a moment. Explore what feels meaningful.</Text>
        </View>

        <LookWithinCard data={lookWithinData} />
        <ThoughtToCarryCard data={thoughtData} />
        <TalkToAtmikCard />

        {/* ── Your Reflections Preview ──────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>YOUR REFLECTIONS</Text>
          <Text style={styles.sectionSubtitle}>A record of moments you've chosen to keep.</Text>
        </View>
        
        <ReflectionsPreview />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FCFAF8', // Very light neutral palette
  },
  scrollContent: {
    paddingTop: Spacing.xl,
    paddingBottom: 140, // Space for Bottom Tab
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: '500',
    color: '#1B2D4F', // deep navy typography
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8A7E6E', // soft muted
  },
  heroSection: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B8954A',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8A7E6E',
  }
});
