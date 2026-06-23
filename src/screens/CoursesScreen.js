import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CoursesScreen({ navigation }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student/courses');
      setCourses(res.data || []);
    } catch (e) {
      console.error(e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#047857', '#047857']} style={styles.header}>
        <Text style={styles.headerTitle}>My Courses</Text>
        <Text style={styles.headerSub}>{courses.length} enrolled</Text>
      </LinearGradient>

      <FlatList
        data={courses}
        keyExtractor={c => c._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTxt}>No courses enrolled yet</Text>
            <Text style={styles.emptySub}>Ask your admin to enroll you in courses</Text>
          </View>
        }
        renderItem={({ item: c }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CourseDetails', { course: c })}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <View style={styles.icon}>
                <Ionicons name="book" size={20} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseName}>{c.name}</Text>
                <Text style={styles.courseCode}>{c.code}</Text>
              </View>
              <View style={styles.creditBadge}>
                <Text style={styles.creditTxt}>{c.credits ?? 3} cr</Text>
              </View>
            </View>
            {c.teacher ? (
              <View style={styles.teacherRow}>
                <Ionicons name="person-outline" size={13} color="#64748B" />
                <Text style={styles.teacherName}>{c.teacher}</Text>
              </View>
            ) : null}
            {c.schedule ? (
              <View style={styles.teacherRow}>
                <Ionicons name="time-outline" size={13} color="#64748B" />
                <Text style={styles.teacherName}>{c.schedule}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:    { padding: 20, paddingTop: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  icon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  courseName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  courseCode: { fontSize: 12, color: '#10b981', fontWeight: '600', marginTop: 2 },
  creditBadge: {
    backgroundColor: '#ecfdf5', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  creditTxt: { fontSize: 12, fontWeight: '700', color: '#047857' },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  teacherName: { fontSize: 12, color: '#64748B' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  emptySub:  { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});
