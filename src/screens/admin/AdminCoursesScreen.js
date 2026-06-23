import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
  Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

export default function AdminCoursesScreen({ navigation }) {
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  // Add/Edit course modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]           = useState(null); // null = add, object = edit
  const [form, setForm]                 = useState({ name: '', code: '', credits: '3', description: '' });
  const [saving, setSaving]             = useState(false);

  // Enroll modal
  const [enrollCourse, setEnrollCourse] = useState(null);
  const [allStudents, setAllStudents]   = useState([]);
  const [enrolled, setEnrolled]         = useState([]);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(Array.isArray(data) ? data : data.courses || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // ── Add / Edit course ────────────────────────────────────────────────────────
  function openAdd() {
    setEditing(null);
    setForm({ name: '', code: '', credits: '3', description: '' });
    setModalVisible(true);
  }

  function openEdit(course) {
    setEditing(course);
    setForm({
      name:        course.name        || '',
      code:        course.code        || '',
      credits:     String(course.credits ?? 3),
      description: course.description || '',
    });
    setModalVisible(true);
  }

  async function saveCourse() {
    if (!form.name.trim() || !form.code.trim()) {
      Alert.alert('Validation', 'Name and code are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        code:        form.code.trim().toUpperCase(),
        credits:     parseInt(form.credits, 10) || 3,
        description: form.description.trim(),
      };
      if (editing) {
        const { data } = await api.put(`/courses/${editing._id}`, payload);
        setCourses(prev => prev.map(c => c._id === editing._id ? (data.course || { ...editing, ...payload }) : c));
      } else {
        const { data } = await api.post('/courses', payload);
        setCourses(prev => [data.course || data, ...prev]);
      }
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse(course) {
    Alert.alert(
      'Delete Course',
      `Delete "${course.name}"? This will also remove related attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/courses/${course._id}`);
              setCourses(prev => prev.filter(c => c._id !== course._id));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || e.message);
            }
          }
        }
      ]
    );
  }

  // ── Enroll students ──────────────────────────────────────────────────────────
  async function openEnroll(course) {
    setEnrollCourse(course);
    setEnrollLoading(true);
    try {
      const [studRes, courseRes] = await Promise.all([
        api.get('/admin/students'),
        api.get(`/courses/${course._id}`),
      ]);
      const all = Array.isArray(studRes.data) ? studRes.data : studRes.data.students || [];
      const cur = courseRes.data.students || courseRes.data.course?.students || [];
      setAllStudents(all);
      setEnrolled(cur.map(s => s._id || s));
    } catch (e) {
      Alert.alert('Error', 'Failed to load students');
      setEnrollCourse(null);
    } finally {
      setEnrollLoading(false);
    }
  }

  function toggleEnroll(studentId) {
    setEnrolled(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  }

  async function saveEnrollment() {
    setSaving(true);
    try {
      await api.put(`/courses/${enrollCourse._id}/students`, { studentIds: enrolled });
      Alert.alert('Saved', 'Enrollment updated.');
      setEnrollCourse(null);
      fetchCourses();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) ||
           (c.code || '').toLowerCase().includes(q);
  });

  // ── Render course card ───────────────────────────────────────────────────────
  function CourseCard({ item }) {
    const enrollCount = item.students?.length ?? item.enrolledCount ?? 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="book" size={18} color="#10b981" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardCode}>{item.code} · {item.credits ?? 3} credits</Text>
          </View>
          <TouchableOpacity style={styles.cardMenuBtn} onPress={() => openEdit(item)}>
            <Ionicons name="create-outline" size={18} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardMenuBtn} onPress={() => deleteCourse(item)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.cardStat}>
            <Ionicons name="people-outline" size={13} color="#64748B" />
            <Text style={styles.cardStatTxt}>{enrollCount} students</Text>
          </View>
          <TouchableOpacity style={styles.enrollBtn} onPress={() => openEnroll(item)}>
            <Ionicons name="person-add-outline" size={13} color="#fff" />
            <Text style={styles.enrollTxt}>Manage Enrollment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Courses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or code…"
          placeholderTextColor="#94A3B8"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={({ item }) => <CourseCard item={item} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="book-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTxt}>
                {search ? 'No courses match your search.' : 'No courses yet. Tap + to add one.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Course' : 'New Course'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              {[
                { key: 'name',        label: 'Course Name *',  placeholder: 'Data Structures & Algorithms' },
                { key: 'code',        label: 'Course Code *',  placeholder: 'CS-301' },
                { key: 'credits',     label: 'Credit Hours',   placeholder: '3', keyboardType: 'numeric' },
                { key: 'description', label: 'Description',    placeholder: 'Brief overview…', multiline: true },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={[styles.fieldInput, f.multiline && { height: 80, textAlignVertical: 'top' }]}
                    value={form[f.key] || ''}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType={f.keyboardType || 'default'}
                    multiline={f.multiline}
                    autoCapitalize={f.key === 'code' ? 'characters' : 'sentences'}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveCourse} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveTxt}>{editing ? 'Update Course' : 'Create Course'}</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Enroll Modal ── */}
      <Modal visible={!!enrollCourse} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEnrollCourse(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Manage Enrollment</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{enrollCourse?.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setEnrollCourse(null)}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {enrollLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
          ) : (
            <FlatList
              data={allStudents}
              keyExtractor={s => s._id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const name = item.profile?.name || item.email?.split('@')[0] || 'Student';
                const isEnrolled = enrolled.includes(item._id);
                return (
                  <TouchableOpacity
                    style={[styles.studentRow, isEnrolled && styles.studentRowActive]}
                    onPress={() => toggleEnroll(item._id)}
                  >
                    <View style={[styles.studentAvatar, isEnrolled && { backgroundColor: '#047857' }]}>
                      <Text style={[styles.studentAvatarTxt, isEnrolled && { color: '#fff' }]}>
                        {name[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{name}</Text>
                      {item.profile?.rollNumber && (
                        <Text style={styles.studentRoll}>{item.profile.rollNumber}</Text>
                      )}
                    </View>
                    <Ionicons
                      name={isEnrolled ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isEnrolled ? '#047857' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyTxt}>No students found.</Text>}
            />
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEnrollCourse(null)}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveEnrollment} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveTxt}>Save ({enrolled.length} enrolled)</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#047857', alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12,
    paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cardCode: { fontSize: 12, color: '#10b981', marginTop: 1 },
  cardMenuBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },
  cardDesc: { fontSize: 12, color: '#64748B', marginTop: 8, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC',
  },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardStatTxt: { fontSize: 12, color: '#64748B' },
  enrollBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#047857', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  enrollTxt: { fontSize: 12, fontWeight: '600', color: '#fff' },

  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTxt:  { marginTop: 12, fontSize: 14, color: '#94A3B8', textAlign: 'center' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#475569',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#0F172A',
  },
  modalFooter: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#fff',
  },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  saveBtn: {
    flex: 2, backgroundColor: '#047857', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Enroll list
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  studentRowActive: { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
  studentAvatar: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarTxt: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  studentName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  studentRoll: { fontSize: 11, color: '#10b981', marginTop: 2 },
});
