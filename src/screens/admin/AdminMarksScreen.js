import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

// ── Grade calculation ──────────────────────────────────────────────────────────
function calcGrade(total) {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B+';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'F';
}

const GRADE_COLORS = {
  'A+': '#10B981', 'A': '#10B981',
  'B+': '#059669', 'B': '#059669',
  'C':  '#F59E0B',
  'D':  '#EF4444', 'F': '#EF4444',
};

const FIELDS = [
  { key: 'midterm',     label: 'Midterm',     max: 30 },
  { key: 'assignments', label: 'Assignments', max: 20 },
  { key: 'quizzes',     label: 'Quizzes',     max: 10 },
  { key: 'final',       label: 'Final',       max: 40 },
];

function calcTotal(row) {
  return FIELDS.reduce((sum, f) => {
    const v = parseFloat(row[f.key]);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
}

// ── Row component ──────────────────────────────────────────────────────────────
function StudentMarkRow({ student, existing, courseId }) {
  const init = existing || {};
  const [values, setValues] = useState({
    midterm:     init.midterm     != null ? String(init.midterm)     : '',
    assignments: init.assignments != null ? String(init.assignments) : '',
    quizzes:     init.quizzes     != null ? String(init.quizzes)     : '',
    final:       init.final       != null ? String(init.final)       : '',
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [markId, setMarkId]   = useState(init._id || null);

  const total = calcTotal(values);
  const grade = calcGrade(total);
  const gradeColor = GRADE_COLORS[grade] || '#64748B';

  const set = (key, val) => {
    setSaved(false);
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const validate = () => {
    for (const f of FIELDS) {
      const v = parseFloat(values[f.key]);
      if (values[f.key] !== '' && (isNaN(v) || v < 0 || v > f.max)) {
        Alert.alert('Validation Error', `${f.label} must be between 0 and ${f.max}.`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        student:     student._id,
        course:      courseId,
        midterm:     parseFloat(values.midterm)     || 0,
        assignments: parseFloat(values.assignments) || 0,
        quizzes:     parseFloat(values.quizzes)     || 0,
        final:       parseFloat(values.final)       || 0,
      };
      if (markId) {
        await api.put(`/marks/${markId}`, payload);
      } else {
        const res = await api.post('/marks', payload);
        setMarkId(res.data?._id || res._id || null);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const allFilled = FIELDS.every(f => values[f.key] !== '');

  return (
    <View style={styles.rowCard}>
      {/* Student header */}
      <View style={styles.rowTop}>
        <View style={styles.studentAvatar}>
          <Text style={styles.studentAvatarTxt}>
            {(student.profile?.name || student.email || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName}>
            {student.profile?.name || student.email || 'Student'}
          </Text>
          {student.profile?.rollNumber ? (
            <Text style={styles.rollNumber}>{student.profile.rollNumber}</Text>
          ) : null}
        </View>
        {/* Grade badge */}
        <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '18' }]}>
          <Text style={[styles.gradeTxt, { color: gradeColor }]}>{grade}</Text>
        </View>
      </View>

      {/* Mark inputs — 2 per row */}
      <View style={styles.inputsGrid}>
        {FIELDS.map(f => {
          const v      = parseFloat(values[f.key]);
          const isOver = !isNaN(v) && v > f.max;
          return (
            <View key={f.key} style={styles.inputCell}>
              <Text style={styles.inputLabel}>{f.label} <Text style={styles.maxLbl}>/{f.max}</Text></Text>
              <TextInput
                style={[styles.markInput, isOver && styles.markInputError]}
                value={values[f.key]}
                onChangeText={val => set(f.key, val)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor="#CBD5E1"
                maxLength={5}
              />
            </View>
          );
        })}
      </View>

      {/* Total row */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={[styles.totalVal, { color: gradeColor }]}>
          {allFilled ? total.toFixed(1) : '—'} / 100
        </Text>
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.saveBtnDone]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : saved ? (
          <>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.saveBtnTxt}>Saved</Text>
          </>
        ) : (
          <>
            <Ionicons name="save-outline" size={16} color="#fff" />
            <Text style={styles.saveBtnTxt}>Save</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function AdminMarksScreen({ route }) {
  const { course } = route.params;
  const [existingMarks, setExistingMarks] = useState([]);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/marks/course/${course._id}`);
      setExistingMarks(res.data || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [course._id]);

  useEffect(() => { load(); }, [load]);

  const students = course.students || [];

  // Build a lookup: studentId → existing mark object
  const marksMap = {};
  existingMarks.forEach(m => {
    const sid = m.student?._id || m.student;
    if (sid) marksMap[sid] = m;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#047857', '#047857']} style={styles.header}>
        <Text style={styles.headerTitle}>{course.name}</Text>
        <View style={styles.headerMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="code-slash-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.metaChipTxt}>{course.code}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.metaChipTxt}>{students.length} students</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#047857" />
        </View>
      ) : students.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTxt}>No students enrolled in this course</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          <Text style={styles.listHint}>
            Enter marks for each student. Each field is auto-validated against its max value.
          </Text>
          {students.map(stu => (
            <StudentMarkRow
              key={stu._id}
              student={stu}
              existing={marksMap[stu._id] || null}
              courseId={course._id}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header:      { padding: 20, paddingTop: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  headerMeta:  { flexDirection: 'row', gap: 10 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  metaChipTxt: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  listContent: { padding: 16, paddingBottom: 32 },
  listHint: {
    fontSize: 12, color: '#64748B', marginBottom: 14,
    backgroundColor: '#ecfdf5', borderRadius: 8, padding: 10, lineHeight: 18,
  },

  // Student row card
  rowCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  studentAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarTxt: { fontSize: 14, fontWeight: '800', color: '#047857' },
  studentName:  { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  rollNumber:   { fontSize: 11, color: '#10b981', fontWeight: '500', marginTop: 1 },
  gradeBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  gradeTxt:   { fontSize: 16, fontWeight: '800' },

  // Inputs grid — 2 columns
  inputsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  inputCell:  { width: '47%' },
  inputLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  maxLbl:     { fontSize: 11, color: '#94A3B8', fontWeight: '400' },
  markInput: {
    backgroundColor: '#F8FAFC', borderRadius: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 15, color: '#0F172A', fontWeight: '700', textAlign: 'center',
  },
  markInputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },

  totalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel:{ fontSize: 13, fontWeight: '700', color: '#334155' },
  totalVal:  { fontSize: 15, fontWeight: '800' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#047857', borderRadius: 10, paddingVertical: 11,
  },
  saveBtnDone: { backgroundColor: '#10B981' },
  saveBtnTxt:  { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyTxt: { fontSize: 14, color: '#94A3B8', marginTop: 10, textAlign: 'center' },
});
