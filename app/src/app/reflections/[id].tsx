import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { dbService, ReflectionRecord } from '../../services/db';
import { ArrowLeft, Trash2 } from 'lucide-react-native';

export default function ReflectionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<ReflectionRecord | null>(null);

  useEffect(() => {
    const loadRecord = async () => {
      // In a real app we'd fetch directly by ID. Since our mock just returns history:
      const records = await dbService.getReflectionsHistory(1, 1000);
      const found = records.find(r => r.id === id);
      if (found) {
        setRecord(found);
      }
    };
    loadRecord();
  }, [id]);

  const handleDelete = async () => {
    if (record) {
      await dbService.deleteReflection(record.id);
      router.back();
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'todays_reflection': return "TODAY'S REFLECTION";
      case 'look_within': return "LOOK WITHIN";
      case 'wisdom': return "A THOUGHT TO CARRY";
      case 'conversation': return "CONVERSATION";
      default: return "REFLECTION";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!record) return null; // loading state

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1B2D4F" size={24} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Memory</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleDelete}>
          <Trash2 color="#8A7E6E" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>{getLabel(record.type)}</Text>
        <Text style={styles.date}>{formatDate(record.createdAt)}</Text>

        {record.type === 'wisdom' ? (
          <View style={styles.wisdomContainer}>
            <Text style={styles.wisdomText}>"{record.userResponse}"</Text>
          </View>
        ) : (
          <View style={styles.qaContainer}>
            {record.question && (
              <View style={styles.block}>
                <Text style={styles.blockLabel}>QUESTION</Text>
                <Text style={styles.questionText}>{record.question}</Text>
              </View>
            )}

            {record.userResponse !== undefined && (
              <View style={styles.block}>
                <Text style={styles.blockLabel}>YOUR REFLECTION</Text>
                <Text style={styles.responseText}>"{record.userResponse}"</Text>
              </View>
            )}

            {record.atmikResponse && (
              <View style={styles.block}>
                <Text style={styles.blockLabel}>ATMIK</Text>
                <Text style={styles.atmikText}>"{record.atmikResponse}"</Text>
              </View>
            )}
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
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: '500',
    color: '#1B2D4F',
  },
  content: {
    padding: Spacing.xl,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B8954A',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#8A7E6E',
    marginBottom: 40,
  },
  wisdomContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  wisdomText: {
    fontSize: 22,
    fontFamily: 'serif',
    color: '#1B2D4F',
    lineHeight: 34,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  qaContainer: {
    gap: 32,
  },
  block: {},
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A7E6E',
    letterSpacing: 1,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 20,
    fontFamily: 'serif',
    color: '#1B2D4F',
    lineHeight: 28,
  },
  responseText: {
    fontSize: 16,
    color: '#1B2D4F',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  atmikText: {
    fontSize: 16,
    color: '#8A7E6E',
    lineHeight: 24,
  }
});
