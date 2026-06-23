import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Build last-N-month attendance % trend from all course records.
function buildMonthlyTrend(courseSummaries, monthsBack = 6) {
  const buckets = {}; // 'YYYY-M' -> { present, total }
  for (const c of courseSummaries) {
    for (const r of (c.records || [])) {
      const d = new Date(r.date);
      if (isNaN(d)) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets[key]) buckets[key] = { present: 0, total: 0 };
      buckets[key].total++;
      if (r.status === 'present' || r.status === 'late' || r.status === 'excused') buckets[key].present++;
    }
  }
  // Walk the last `monthsBack` calendar months ending this month.
  const now = new Date();
  const labels = [];
  const values = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets[key];
    labels.push(MONTHS[d.getMonth()]);
    values.push(b && b.total > 0 ? Math.round((b.present / b.total) * 100) : 0);
  }
  return { labels, values, hasData: Object.keys(buckets).length > 0 };
}

// ── GPA helpers ────────────────────────────────────────────────────────────────
const GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'B+': 3.5, 'B': 3.0,
  'C': 2.0, 'D': 1.0, 'F': 0.0,
};

function calcGpa(marks) {
  if (!marks || marks.length === 0) return null;
  const sum = marks.reduce((acc, m) => acc + (GRADE_POINTS[m.grade] ?? 0), 0);
  return sum / marks.length;
}

function gpaSubtext(gpa) {
  if (gpa === null) return 'GPA not available — marks not published';
  if (gpa >= 3.5) return 'Excellent academic standing';
  if (gpa >= 3.0) return 'Good academic standing';
  if (gpa >= 2.0) return 'Satisfactory';
  return 'Academic probation risk';
}

function gpaColor(gpa) {
  if (gpa === null) return '#94A3B8';
  if (gpa >= 3.5) return '#10B981';
  if (gpa >= 3.0) return '#059669';
  if (gpa >= 2.0) return '#F59E0B';
  return '#EF4444';
}

export default function StatisticsScreen() {
  const { user } = useAuth();
  const [data, setData]         = useState([]);
  const [marks, setMarks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [attendanceRes, marksRes] = await Promise.all([
        api.get(`/attendance/student/${user?.id}`),
        api.get('/marks/my'),
      ]);
      setData(attendanceRes.data || []);
      setMarks(marksRes.data || []);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

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

  // Sorted by percentage for ranking
  const sorted = [...data].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  // GPA
  const gpa = calcGpa(marks);
  const gpaClr = gpaColor(gpa);

  // Monthly attendance trend
  const trend = buildMonthlyTrend(data);
  // Declining if the latest non-zero month is below the prior non-zero month.
  const nz = trend.values.filter(v => v > 0);
  const declining = nz.length >= 2 && nz[nz.length - 1] < nz[nz.length - 2];
  const screenW = Dimensions.get('window').width;

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={['#047857', '#047857']} style={styles.header}>
          <Text style={styles.headerTitle}>Statistics</Text>
          <Text style={styles.headerSub}>Your academic performance overview</Text>
        </LinearGradient>

        {/* Summary cards */}
        <View style={styles.statsRow}>
          {[
            { label: 'Present', val: overall.present, color: '#10B981', bg: '#F0FDF4' },
            { label: 'Absent',  val: overall.absent,  color: '#EF4444', bg: '#FEF2F2' },
            { label: 'Late',    val: overall.late,    color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Total',   val: overall.total,   color: '#059669', bg: '#ecfdf5' },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Overall attendance % ring */}
        <View style={styles.section}>
          <View style={styles.overallCard}>
            <View style={[styles.bigCircle, {
              borderColor: overallPct >= 75 ? '#10B981' : overallPct >= 50 ? '#F59E0B' : '#EF4444',
            }]}>
              <Text style={[styles.bigPct, {
                color: overallPct >= 75 ? '#10B981' : overallPct >= 50 ? '#F59E0B' : '#EF4444',
              }]}>{overallPct}%</Text>
              <Text style={styles.bigLbl}>Overall</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.overallTitle}>Attendance Rate</Text>
              <Text style={styles.overallSub}>
                {overallPct >= 75
                  ? 'Good standing. Keep it up!'
                  : overallPct >= 50
                    ? 'Below average. Improve attendance.'
                    : 'Critical. Attend more classes.'}
              </Text>
              <Text style={styles.overallCourses}>{data.length} courses tracked</Text>
            </View>
          </View>
        </View>

        {/* Attendance trend chart */}
        {trend.hasData && (
          <View style={styles.section}>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.sectionTitle}>Attendance Trend</Text>
                {declining && (
                  <View style={styles.warnPill}>
                    <Ionicons name="trending-down" size={12} color="#EF4444" />
                    <Text style={styles.warnTxt}>Declining</Text>
                  </View>
                )}
              </View>
              <LineChart
                data={{ labels: trend.labels, datasets: [{ data: trend.values }] }}
                width={screenW - 64}
                height={200}
                yAxisSuffix="%"
                fromZero
                segments={4}
                chartConfig={{
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (o = 1) => `rgba(29, 78, 216, ${o})`,
                  labelColor: (o = 1) => `rgba(100, 116, 139, ${o})`,
                  propsForDots: { r: '4', strokeWidth: '2', stroke: '#047857' },
                }}
                bezier
                style={{ borderRadius: 12, marginLeft: -8 }}
              />
              <Text style={styles.chartSub}>Monthly attendance % (last 6 months)</Text>
            </View>
          </View>
        )}

        {/* GPA card */}
        <View style={styles.section}>
          <View style={styles.overallCard}>
            <View style={[styles.bigCircle, { borderColor: gpaClr }]}>
              {gpa !== null ? (
                <>
                  <Text style={[styles.bigPct, { color: gpaClr }]}>{gpa.toFixed(1)}</Text>
                  <Text style={styles.bigLbl}>GPA</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.bigPct, { color: '#94A3B8', fontSize: 14 }]}>N/A</Text>
                  <Text style={styles.bigLbl}>GPA</Text>
                </>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.overallTitle}>Academic GPA</Text>
              <Text style={styles.overallSub}>{gpaSubtext(gpa)}</Text>
              <Text style={styles.overallCourses}>{marks.length} course{marks.length !== 1 ? 's' : ''} with marks</Text>
            </View>
          </View>
        </View>

        {/* Per-course marks summary */}
        {marks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marks by Course</Text>
            {marks.map(m => {
              const courseName = m.course?.name || 'Unknown Course';
              const total = (m.midterm || 0) + (m.assignments || 0) + (m.quizzes || 0) + (m.final || 0);
              const grade = m.grade || '—';
              const color = gpaColor(GRADE_POINTS[grade] != null ? GRADE_POINTS[grade] + 0.01 : null);
              return (
                <View key={m._id} style={styles.markCard}>
                  <View style={styles.markCardRow}>
                    <View style={styles.markCourseIcon}>
                      <Ionicons name="book" size={14} color="#10b981" />
                    </View>
                    <Text style={styles.markCourseName} numberOfLines={1}>{courseName}</Text>
                    <View style={[styles.gradePill, { backgroundColor: color + '18' }]}>
                      <Text style={[styles.gradePillTxt, { color }]}>{grade}</Text>
                    </View>
                  </View>
                  <View style={styles.markMini}>
                    {[
                      { l: 'Mid', v: m.midterm,     max: 30 },
                      { l: 'Asgn', v: m.assignments, max: 20 },
                      { l: 'Quiz', v: m.quizzes,     max: 10 },
                      { l: 'Final', v: m.final,      max: 40 },
                    ].map(item => (
                      <Text key={item.l} style={styles.markMiniTxt}>
                        {item.l}: <Text style={{ color: '#334155', fontWeight: '600' }}>{item.v ?? '—'}</Text>
                        <Text style={{ color: '#CBD5E1' }}>/{item.max}</Text>
                      </Text>
                    ))}
                    <Text style={[styles.markMiniTxt, { color }]}>
                      Total: <Text style={{ fontWeight: '800' }}>{total}</Text>
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Per-course attendance breakdown */}
        {data.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Course Breakdown</Text>
            {sorted.map(c => {
              const pct = c.percentage || 0;
              const color = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
              return (
                <View key={c.course?._id} style={styles.courseCard}>
                  <View style={styles.courseRow}>
                    <Text style={styles.courseName}>{c.course?.name || 'Unknown'}</Text>
                    <Text style={[styles.coursePct, { color }]}>{pct}%</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <View style={styles.miniRow}>
                    <Text style={styles.miniTxt}>P: <Text style={{ color: '#10B981' }}>{c.present}</Text></Text>
                    <Text style={styles.miniTxt}>A: <Text style={{ color: '#EF4444' }}>{c.absent}</Text></Text>
                    <Text style={styles.miniTxt}>L: <Text style={{ color: '#F59E0B' }}>{c.late || 0}</Text></Text>
                    <Text style={styles.miniTxt}>Total: {c.total}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {data.length === 0 && marks.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTxt}>No statistics available yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:    { padding: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },

  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal:  { fontSize: 22, fontWeight: '800' },
  statLbl:  { fontSize: 11, color: '#64748B', marginTop: 2 },

  section:      { paddingHorizontal: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 10 },

  overallCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  bigCircle: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  bigPct: { fontSize: 20, fontWeight: '800' },
  bigLbl: { fontSize: 10, color: '#64748B' },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  warnPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    marginBottom: 10,
  },
  warnTxt: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  chartSub: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 4 },

  overallTitle:   { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  overallSub:     { fontSize: 12, color: '#64748B', lineHeight: 18, marginBottom: 4 },
  overallCourses: { fontSize: 11, color: '#94A3B8' },

  // Marks by course
  markCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  markCardRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  markCourseIcon: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  markCourseName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0F172A' },
  gradePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  gradePillTxt: { fontSize: 12, fontWeight: '800' },
  markMini: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  markMiniTxt: { fontSize: 11, color: '#94A3B8' },

  // Attendance per course
  courseCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  courseRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  courseName: { fontSize: 13, fontWeight: '600', color: '#0F172A', flex: 1 },
  coursePct:  { fontSize: 14, fontWeight: '800' },
  barBg:  { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, marginBottom: 8 },
  barFill:{ height: 6, borderRadius: 3 },
  miniRow:{ flexDirection: 'row', gap: 12 },
  miniTxt:{ fontSize: 12, color: '#64748B' },

  empty:    { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTxt: { fontSize: 15, color: '#94A3B8' },
});
