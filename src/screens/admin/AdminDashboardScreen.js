import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function AdminDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (e) {
      console.error(e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
  );

  const { stats, department, batches = [] } = data || {};

  // Admin hasn't set up their department yet - shouldn't happen (web forces setup), but handle gracefully
  if (!department) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Ionicons name="business-outline" size={56} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>Department Not Set Up</Text>
        <Text style={styles.emptySub}>Please complete setup on the web dashboard first</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#047857', '#047857', '#047857']} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.adminName}>{user?.name}</Text>
            </View>
            <TouchableOpacity style={styles.logoutIconBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* Department card */}
          <View style={styles.deptCard}>
            <View style={styles.deptCardTop}>
              <View style={styles.deptIcon}>
                <Ionicons name="business" size={20} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deptName}>{department.name}</Text>
                <Text style={styles.deptCode}>{department.code}</Text>
              </View>
            </View>
            {department.hod?.name ? (
              <Text style={styles.hodText}>
                <Ionicons name="person" size={11} /> HOD: {department.hod.name}
              </Text>
            ) : null}
          </View>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total Students', value: stats?.totalStudents ?? 0, icon: 'people', color: '#059669' },
            { label: 'Pending',        value: stats?.pendingStudents ?? 0, icon: 'time',   color: '#F59E0B' },
            { label: 'Courses',        value: stats?.totalCourses ?? 0,   icon: 'book',   color: '#10b981' },
            { label: 'Batches',        value: stats?.totalBatches ?? 0,   icon: 'layers', color: '#10B981' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon} size={16} color={s.color} />
              </View>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'Courses',    icon: 'book-outline',          color: '#10b981', bg: '#ecfdf5', screen: 'AdminCourses' },
              { label: 'Leave',      icon: 'calendar-outline',      color: '#F59E0B', bg: '#FFFBEB', screen: 'AdminLeave'   },
              { label: 'Marks',      icon: 'star-outline',          color: '#10B981', bg: '#ECFDF5', screen: 'AdminMarks'   },
            ].map(a => (
              <TouchableOpacity
                key={a.label}
                style={[styles.actionCard, { backgroundColor: a.bg }]}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: a.color + '20' }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Batches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batches / Classes</Text>
          {batches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="layers-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyCardText}>No batches yet</Text>
              <Text style={styles.emptyCardSub}>Create batches from the web dashboard</Text>
            </View>
          ) : batches.map(batch => (
            <TouchableOpacity
              key={batch._id}
              style={styles.batchCard}
              onPress={() => navigation.navigate('AdminBatch', { batch })}
              activeOpacity={0.85}
            >
              <View style={styles.batchLeft}>
                <View style={styles.batchAvatar}>
                  <Text style={styles.batchAvatarText}>
                    {batch.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.batchName}>{batch.name}</Text>
                  <Text style={styles.batchMeta}>
                    {batch.currentSemester} Semester
                    {batch.section ? ` · Section ${batch.section}` : ''}
                    {batch.year ? ` · ${batch.year}` : ''}
                  </Text>
                  {batch.classTeacher ? (
                    <Text style={styles.batchTeacher}>
                      <Ionicons name="person-outline" size={11} /> {batch.classTeacher}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.batchRight}>
                <View style={styles.batchBadge}>
                  <Text style={styles.batchBadgeTxt}>
                    {batch.secretCode}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: { padding: 20, paddingTop: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  adminName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  logoutIconBtn: { padding: 6 },

  deptCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
  },
  deptCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  deptIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  deptName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  deptCode: { fontSize: 12, color: '#059669', fontWeight: '600' },
  hodText: { fontSize: 12, color: '#64748B' },

  statsRow: {
    flexDirection: 'row', padding: 16, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal:  { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLbl:  { fontSize: 10, color: '#64748B', textAlign: 'center' },

  section: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 },

  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 8,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 8,
  },
  emptyCardText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  emptyCardSub:  { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

  batchCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  batchLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  batchAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  batchAvatarText: { fontSize: 14, fontWeight: '800', color: '#047857' },
  batchName:    { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  batchMeta:    { fontSize: 12, color: '#64748B', marginTop: 2 },
  batchTeacher: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  batchRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  batchBadge: {
    backgroundColor: '#ecfdf5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
  },
  batchBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#047857', letterSpacing: 0.5 },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptySub:   { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
  logoutBtn: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 20 },
  logoutTxt: { color: '#fff', fontWeight: '700' },
});
