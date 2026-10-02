import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { dbService, ReflectionRecord } from '../../services/db';
import { ArrowLeft, MessageCircle, CircleDot, Star } from 'lucide-react-native';

const FilterChip = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.filterChip, active && styles.filterChipActive]} 
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export default function ReflectionsTimeline() {
  const router = useRouter();
  const [history, setHistory] = useState<ReflectionRecord[]>([]);
  const [filter, setFilter] = useState<'All' | 'Reflections' | 'Conversations' | 'Wisdom'>('All');

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        // In a real app with pagination, we'd load page 1 and append on end reached.
        const records = await dbService.getReflectionsHistory(1, 50);
        setHistory(records);
      };
      loadData();
    }, [])
  );

  const getFilteredData = () => {
    if (filter === 'All') return history;
    if (filter === 'Reflections') return history.filter(r => r.type === 'todays_reflection' || r.type === 'look_within');
    if (filter === 'Conversations') return history.filter(r => r.type === 'conversation');
    if (filter === 'Wisdom') return history.filter(r => r.type === 'wisdom');
    return history;
  };

  // Helper to format date groups
  const groupDataByDate = (data: ReflectionRecord[]) => {
    const groups: { title: string, data: ReflectionRecord[] }[] = [];
    
    data.forEach(record => {
      const date = new Date(record.createdAt);
      let title = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      
      // Simple today/yesterday check
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) title = 'TODAY';
      else if (date.toDateString() === yesterday.toDateString()) title = 'YESTERDAY';

      const existingGroup = groups.find(g => g.title === title);
      if (existingGroup) {
        existingGroup.data.push(record);
      } else {
        groups.push({ title, data: [record] });
      }
    });
    
    return groups;
  };

  const groupedData = groupDataByDate(getFilteredData());

  const getIcon = (type: string) => {
    switch (type) {
      case 'look_within': return <CircleDot color="#B8954A" size={16} />;
      case 'wisdom': return <Star color="#B8954A" size={16} />;
      case 'conversation': return <MessageCircle color="#1B2D4F" size={16} />;
      default: return null;
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

  const renderItem = ({ item }: { item: ReflectionRecord }) => (
    <TouchableOpacity 
      style={styles.timelineItem} 
      activeOpacity={0.7}
      onPress={() => router.push(`/reflections/${item.id}`)}
    >
      <View style={styles.itemHeader}>
        {getIcon(item.type)}
        <Text style={styles.itemLabel}>{getLabel(item.type)}</Text>
      </View>
      
      {item.question && <Text style={styles.questionText}>{item.question}</Text>}
      
      {item.userResponse && (
        <Text style={styles.responseText} numberOfLines={3}>
          "{item.userResponse}"
        </Text>
      )}
      
      {item.type === 'wisdom' && item.userResponse && (
        <Text style={styles.wisdomText} numberOfLines={4}>
          "{item.userResponse}"
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#1B2D4F" size={24} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Your Reflections</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <FilterChip label="All" active={filter === 'All'} onPress={() => setFilter('All')} />
          <FilterChip label="Reflections" active={filter === 'Reflections'} onPress={() => setFilter('Reflections')} />
          <FilterChip label="Conversations" active={filter === 'Conversations'} onPress={() => setFilter('Conversations')} />
          <FilterChip label="Wisdom" active={filter === 'Wisdom'} onPress={() => setFilter('Wisdom')} />
        </ScrollView>
      </View>

      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: group }) => (
          <View style={styles.groupContainer}>
            <Text style={styles.dateHeader}>{group.title}</Text>
            {group.data.map(record => (
              <React.Fragment key={record.id}>
                {renderItem({ item: record })}
              </React.Fragment>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No memories found.</Text>
          </View>
        }
      />
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
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: '500',
    color: '#1B2D4F',
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(27, 45, 79, 0.05)',
    paddingVertical: 12,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(27, 45, 79, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#1B2D4F',
    borderColor: '#1B2D4F',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A7E6E',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    paddingTop: Spacing.md,
  },
  groupContainer: {
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A7E6E',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  timelineItem: {
    marginBottom: 24,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(184,149,74,0.3)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A7E6E',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1B2D4F',
    marginBottom: 6,
  },
  responseText: {
    fontSize: 14,
    color: '#8A7E6E',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  wisdomText: {
    fontSize: 16,
    fontFamily: 'serif',
    color: '#1B2D4F',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#8A7E6E',
  }
});
