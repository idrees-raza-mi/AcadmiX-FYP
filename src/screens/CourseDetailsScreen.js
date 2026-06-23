import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import api from '../api/client';

// ── Grade colour helper ────────────────────────────────────────────────────────
const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981',
  'B+': '#059669', 'B': '#059669',
  'C':  '#F59E0B',
  'D':  '#EF4444', 'F': '#EF4444',
};

function getGradeColor(grade) {
  if (!grade) return colors.textSecondary;
  return GRADE_COLORS[grade] || GRADE_COLORS[grade.charAt(0)] || colors.textSecondary;
}

// ── Marks tab ─────────────────────────────────────────────────────────────────
function MarksTab({ courseId }) {
  const [marks, setMarks]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [loaded, setLoaded]       = useState(false);

  const load = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await api.get('/marks/my');
      const all = res.data || [];
      const match = all.find(m => {
        const cid = m.course?._id || m.course;
        return cid === courseId;
      });
      setMarks(match || null);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [courseId, loaded]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#047857" />
    </View>
  );

  if (!marks) return (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
      <Text style={styles.emptyTxt}>Marks not published yet</Text>
      <Text style={styles.emptySub}>Check back later when your instructor posts marks.</Text>
    </View>
  );

  const { midterm = 0, assignments = 0, quizzes = 0, final: finalMark = 0 } = marks;
  const total = midterm + assignments + quizzes + finalMark;
  const grade = marks.grade || (() => {
    if (total >= 90) return 'A+';
    if (total >= 80) return 'A';
    if (total >= 70) return 'B+';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 40) return 'D';
    return 'F';
  })();
  const gradeColor = getGradeColor(grade);
  const pct = Math.round(total);

  return (
    <View style={styles.marksContainer}>
      {/* Breakdown rows */}
      {[
        { label: 'Midterm',     val: midterm,     max: 30, color: '#10b981' },
        { label: 'Assignments', val: assignments, max: 20, color: '#059669' },
        { label: 'Quizzes',     val: quizzes,     max: 10, color: '#F59E0B' },
        { label: 'Final',       val: finalMark,   max: 40, color: '#047857' },
      ].map(r => {
        const rowPct = Math.min((r.val / r.max) * 100, 100);
        return (
          <View key={r.label} style={styles.markRow}>
            <View style={styles.markRowTop}>
              <Text style={styles.markLabel}>{r.label}</Text>
              <Text style={styles.markVal}>
                <Text style={{ color: r.color, fontWeight: '700' }}>{r.val}</Text>
                <Text style={styles.markMax}> / {r.max}</Text>
              </Text>
            </View>
            <View style={styles.markBarBg}>
              <View style={[styles.markBarFill, { width: `${rowPct}%`, backgroundColor: r.color }]} />
            </View>
          </View>
        );
      })}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Total + Grade */}
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total Score</Text>
          <Text style={styles.totalVal}>
            <Text style={{ color: gradeColor }}>{total.toFixed(1)}</Text>
            <Text style={styles.totalMax}> / 100</Text>
          </Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '18' }]}>
          <Text style={[styles.gradeTxt, { color: gradeColor }]}>{grade}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.totalBarBg}>
        <View style={[styles.totalBarFill, { width: `${pct}%`, backgroundColor: gradeColor }]} />
      </View>
      <Text style={styles.totalBarLbl}>{pct}% — {grade}</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
const CourseDetailsScreen = ({ route }) => {
  const { course } = route.params;
  const [activeTab, setActiveTab] = useState('Info');

  const TABS = ['Info', 'Attendance', 'Marks'];

  const grade       = course?.grade      ?? '—';
  const percentage  = course?.percentage ?? 0;
  const assignments = course?.assignments ?? [];
  const attendance  = {
    present:    course?.attendance?.present    ?? 0,
    total:      course?.attendance?.total      ?? 0,
    percentage: course?.attendance?.percentage ?? 0,
  };
  const instructorName = typeof course?.instructor === 'object'
    ? (course.instructor?.name ?? '—')
    : (course?.instructor ?? '—');

  // ── Info tab content ─────────────────────────────────────────────────────────
  const renderInfoTab = () => (
    <View>
      {/* Course header card */}
      <View style={styles.courseHeader}>
        <View style={styles.courseIconWrap}>
          <Ionicons name="book" size={32} color={colors.primary} />
        </View>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{course.name}</Text>
          <Text style={styles.courseCode}>{course.code}</Text>
          <Text style={styles.instructor}>Instructor: {instructorName}</Text>
        </View>
        <View style={styles.gradeContainer}>
          <Text style={[styles.grade, { color: getGradeColor(grade) }]}>{grade}</Text>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Course Information</Text>
        {[
          { label: 'Description', value: course.description ?? '—' },
          { label: 'Credits',     value: course.credits?.toString() ?? '—' },
          { label: 'Instructor',  value: instructorName },
        ].map((item, index) => (
          <View key={index} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{item.label}:</Text>
            <Text style={styles.infoValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Assignments */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Assignments & Grades</Text>
        {assignments.length === 0 ? (
          <Text style={styles.emptyCardTxt}>No assignments posted yet</Text>
        ) : assignments.map((assignment, index) => (
          <View key={index} style={styles.assignmentItem}>
            <View style={styles.assignmentInfo}>
              <Text style={styles.assignmentName}>{assignment.name}</Text>
              <Text style={styles.assignmentGrade}>
                Grade: <Text style={{ color: getGradeColor(assignment.grade) }}>{assignment.grade}</Text>
              </Text>
            </View>
            <View style={styles.assignmentScore}>
              <Text style={[styles.assignmentPercentage, { color: getGradeColor(assignment.grade) }]}>
                {assignment.percentage}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // ── Attendance tab content ───────────────────────────────────────────────────
  const renderAttendanceTab = () => (
    <View style={styles.infoCard}>
      <Text style={styles.cardTitle}>Attendance Details</Text>
      <View style={styles.attendanceGrid}>
        <View style={styles.attendanceItem}>
          <Text style={[styles.attendanceNumber, { color: colors.success }]}>
            {attendance.present}
          </Text>
          <Text style={styles.attendanceLabel}>Present</Text>
        </View>
        <View style={styles.attendanceItem}>
          <Text style={[styles.attendanceNumber, { color: colors.error }]}>
            {attendance.total - attendance.present}
          </Text>
          <Text style={styles.attendanceLabel}>Absent</Text>
        </View>
        <View style={styles.attendanceItem}>
          <Text style={[styles.attendanceNumber, { color: colors.primary }]}>
            {attendance.percentage}%
          </Text>
          <Text style={styles.attendanceLabel}>Overall</Text>
        </View>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            {
              width: `${attendance.percentage}%`,
              backgroundColor: attendance.percentage >= 80 ? colors.success
                             : attendance.percentage >= 60 ? colors.warning
                             : colors.error,
            },
          ]} />
        </View>
        <Text style={styles.progressText}>Attendance Progress</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient header */}
      <LinearGradient colors={colors.backgroundGradient} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Course Details</Text>
          </View>
          <Text style={styles.headerSubtitle}>{course.name}</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Course Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: colors.primary }]}>
                  {course.credits} Credits
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: getGradeColor(grade) }]}>
                  {grade}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: colors.success }]}>
                  {attendance.percentage}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const isActive = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabTxt, isActive && styles.tabTxtActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'Info'       && renderInfoTab()}
        {activeTab === 'Attendance' && renderAttendanceTab()}
        {activeTab === 'Marks'      && <MarksTab courseId={course._id} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: { paddingBottom: spacing.lg },
  headerContent: { paddingHorizontal: spacing.md },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography['2xl'], fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  headerSubtitle: { fontSize: typography.base, opacity: 0.9, marginBottom: spacing.lg },
  summaryCard: { borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.md },
  summaryTitle: {
    fontSize: typography.lg, fontWeight: typography.semibold, marginBottom: spacing.sm,
  },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem:  { alignItems: 'center' },
  summaryNumber:{ fontSize: typography.base, fontWeight: typography.semibold },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13,
  },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#047857' },
  tabTxt:       { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  tabTxtActive: { color: '#047857' },

  content: { flex: 1, paddingHorizontal: spacing.md },

  // Course header (Info tab)
  courseHeader: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, padding: spacing.lg, marginVertical: spacing.md, ...shadows.sm,
  },
  courseIconWrap: { marginRight: spacing.md },
  courseInfo:    { flex: 1 },
  courseName:    { fontSize: typography.xl, fontWeight: typography.bold, marginBottom: spacing.xs },
  courseCode:    { fontSize: typography.base, color: colors.primary, marginBottom: spacing.xs },
  instructor:    { fontSize: typography.sm },
  gradeContainer:{ alignItems: 'center' },
  grade:         { fontSize: typography['3xl'], fontWeight: typography.bold },
  percentage:    { fontSize: typography.base },

  // Info card
  infoCard: {
    borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
    backgroundColor: '#fff',
  },
  cardTitle: { fontSize: typography.lg, fontWeight: typography.semibold, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: typography.base, fontWeight: typography.medium, flex: 1 },
  infoValue: { fontSize: typography.base, flex: 2, textAlign: 'right', color: '#374151' },

  // Attendance
  attendanceGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  attendanceItem: { alignItems: 'center' },
  attendanceNumber: { fontSize: typography.xl, fontWeight: typography.bold },
  attendanceLabel:  { fontSize: typography.sm, marginTop: spacing.xs },
  progressContainer:{ marginTop: spacing.sm },
  progressBar: {
    height: 12, backgroundColor: colors.lightGray,
    borderRadius: borderRadius.full, overflow: 'hidden', marginBottom: spacing.xs,
  },
  progressFill: { height: '100%', borderRadius: borderRadius.full },
  progressText: { fontSize: typography.sm, textAlign: 'center' },

  // Assignments
  assignmentItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  assignmentInfo: { flex: 1 },
  assignmentName: { fontSize: typography.base, fontWeight: typography.medium, marginBottom: spacing.xs },
  assignmentGrade:{ fontSize: typography.sm },
  assignmentScore:{ alignItems: 'center' },
  assignmentPercentage: { fontSize: typography.lg, fontWeight: typography.bold },
  emptyCardTxt: {
    fontSize: typography.sm, color: '#94A3B8',
    textAlign: 'center', paddingVertical: spacing.md,
  },

  // Marks tab
  marksContainer: { paddingVertical: spacing.md },
  markRow:    { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, ...shadows.sm },
  markRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  markLabel:  { fontSize: 13, fontWeight: '600', color: '#334155' },
  markVal:    { fontSize: 13 },
  markMax:    { color: '#94A3B8', fontWeight: '400' },
  markBarBg:  { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3 },
  markBarFill:{ height: 6, borderRadius: 3 },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },

  totalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  totalLabel:{ fontSize: 13, color: '#64748B' },
  totalVal:  { fontSize: 22, fontWeight: '800' },
  totalMax:  { fontSize: 14, color: '#94A3B8', fontWeight: '400' },
  gradeBadge:{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  gradeTxt:  { fontSize: 20, fontWeight: '800' },

  totalBarBg:  { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  totalBarFill:{ height: 8, borderRadius: 4 },
  totalBarLbl: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 48, gap: 8, paddingBottom: 24 },
  emptyTxt:   { fontSize: 15, color: '#94A3B8' },
  emptySub:   { fontSize: 13, color: '#CBD5E1', textAlign: 'center' },
});

export default CourseDetailsScreen;
