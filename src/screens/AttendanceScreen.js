import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { getSocket, joinBatch } from '../socket';

const STATUS_COLORS = {
  present: '#10B981', absent: '#EF4444', late: '#F59E0B', excused: '#059669'
};
const STATUS_ICONS = {
  present: 'checkmark-circle', absent: 'close-circle', late: 'time', excused: 'shield-checkmark'
};

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/attendance/student/${user?.id}`);
      setData(res.data || []);
    } catch (e) {
      console.error(e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Real-time: join this student's batch room and refresh when their
  // attendance is marked (e.g. by the biometric device) or a session closes.
  useEffect(() => {
    if (!user?.batch) return;
    const socket = getSocket();
    const onConnect = () => { setLive(true); joinBatch(user.batch); };
    const onDisconnect = () => setLive(false);
    const onMarked = (p) => { if (String(p?.studentId) === String(user.id)) load(); };
    const onCompleted = () => load();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('attendance_marked', onMarked);
    socket.on('session_completed', onCompleted);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('attendance_marked', onMarked);
      socket.off('session_completed', onCompleted);
    };
  }, [user?.batch, user?.id, load]);

  // Overall stats across all courses
  const overall = data.reduce(
    (acc, c) => ({
      total:   acc.total   + (c.total   || 0),
      present: acc.present + (c.present || 0),
      absent:  acc.absent  + (c.absent  || 0),
      late:    acc.late    + (c.late    || 0),
      excused: acc.excused + (c.excused || 0),
    }), { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
  );
  const overallPct = overall.total > 0
    ? Math.round(((overall.present + overall.late + overall.excused) / overall.total) * 100) : 0;

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#047857', '#047857']} style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Attendance</Text>
            {live && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTxt}>Live</Text>
              </View>
            )}
          </View>
          <View style={styles.overallCard}>
            <View style={styles.bigPct}>
              <Text style={[styles.bigPctNum, { color: overallPct >= 75 ? '#10B981' : overallPct >= 50 ? '#F59E0B' : '#EF4444' }]}>
                {overallPct}%
              </Text>
              <Text style={styles.bigPctLbl}>Overall</Text>
            </View>
            <View style={styles.statsGrid}>
              {[
                { label: 'Present', val: overall.present, color: '#10B981' },
                { label: 'Absent',  val: overall.absent,  color: '#EF4444' },
                { label: 'Late',    val: overall.late,    color: '#F59E0B' },
                { label: 'Total',   val: overall.total,   color: '#64748B' },
              ].map(s => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={styles.statLbl}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Per-course breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Course</Text>
          {data.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTxt}>No attendance records yet</Text>
            </View>
          ) : data.map(c => {
            const pct = c.percentage || 0;
            const barColor = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
            return (
              <View key={c.course?._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.courseIcon}>
                    <Ionicons name="book" size={16} color="#10b981" />
                  </View>
                  <Text style={styles.courseName}>{c.course?.name}</Text>
                  <Text style={[styles.coursePct, { color: barColor }]}>{pct}%</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
                <View style={styles.miniStats}>
                  <Text style={styles.miniStat}><Text style={{ color: '#10B981' }}>P: {c.present}</Text></Text>
                  <Text style={styles.miniStat}><Text style={{ color: '#EF4444' }}>A: {c.absent}</Text></Text>
                  <Text style={styles.miniStat}><Text style={{ color: '#F59E0B' }}>L: {c.late || 0}</Text></Text>
                  <Text style={styles.miniStat}>Total: {c.total}</Text>
                </View>

                {/* Attendance records */}
                {(expanded[c.course?._id] ? c.records : c.records?.slice(0, 5) || []).map((r, i) => (
                  <View key={i} style={styles.record}>
                    <Ionicons
                      name={STATUS_ICONS[r.status] || 'ellipse'}
                      size={14} color={STATUS_COLORS[r.status] || '#94A3B8'}
                    />
                    <Text style={styles.recordDate}>
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text style={[styles.recordStatus, { color: STATUS_COLORS[r.status] }]}>
                      {r.status}
                    </Text>
                  </View>
                ))}
                {(c.records?.length || 0) > 5 && (
                  <TouchableOpacity
                    style={styles.viewAllBtn}
                    onPress={() => setExpanded(prev => ({ ...prev, [c.course?._id]: !prev[c.course?._id] }))}
                  >
                    <Text style={styles.viewAllTxt}>
                      {expanded[c.course?._id] ? 'Show less' : `View all ${c.records.length} records`}
                    </Text>
                    <Ionicons
                      name={expanded[c.course?._id] ? 'chevron-up' : 'chevron-down'}
                      size={14} color="#047857"
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { padding: 20, paddingTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  liveTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  overallCard: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  bigPct: { alignItems: 'center' },
  bigPctNum: { fontSize: 36, fontWeight: '800', color: '#fff' },
  bigPctLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  statsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statItem:  { width: '44%', alignItems: 'center' },
  statVal:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLbl:   { fontSize: 11, color: 'rgba(255,255,255,0.75)' },

  section:      { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  courseIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  courseName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  coursePct:  { fontSize: 16, fontWeight: '800' },
  barBg:  { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, marginBottom: 8 },
  barFill:{ height: 6, borderRadius: 3 },
  miniStats: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  miniStat:  { fontSize: 12, color: '#64748B' },

  record: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  recordDate:   { flex: 1, fontSize: 12, color: '#64748B' },
  recordStatus: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTxt: { fontSize: 15, color: '#94A3B8' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 8 },
  viewAllTxt: { fontSize: 12, color: '#047857', fontWeight: '600' },
});
