import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Alert, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

const TABS = ['Students', 'Courses', 'Attendance'];

export default function AdminBatchScreen({ route, navigation }) {
  const { batch: batchParam } = route.params;
  const [activeTab, setActiveTab] = useState('Students');
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const deptId = batchParam.department?._id || batchParam.department;
      const res = await api.get(`/departments/${deptId}/batches/${batchParam._id}`);
      setBatchData(res.data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [batchParam._id, batchParam.department]);

  useEffect(() => { load(); }, [load]);

  const students = batchData?.students || [];
  const courses  = batchData?.courses  || [];

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#047857', '#047857']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.batchTitle}>{batchParam.name}</Text>
            <Text style={styles.batchSub}>
              {batchParam.currentSemester} Sem · {students.length} students · {courses.length} courses
            </Text>
          </View>
        </View>
        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t} style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabTxt, activeTab === t && styles.tabTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {activeTab === 'Students' && (
          <StudentsTab
            students={students} batchId={batchParam._id}
            navigation={navigation} onRefresh={load}
          />
        )}
        {activeTab === 'Courses' && (
          <CoursesTab
            courses={courses} batchId={batchParam._id}
            deptId={batchParam.department}
            onRefresh={load}
          />
        )}
        {activeTab === 'Attendance' && (
          <AttendanceTab courses={courses} batchId={batchParam._id} students={students} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STUDENTS TAB ─────────────────────────────────────────────────────────────

function StudentsTab({ students, batchId, navigation, onRefresh }) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      s.profile?.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.profile?.rollNumber?.toLowerCase().includes(q)
    );
  });

  const approve = async (id) => {
    try {
      await api.put(`/admin/students/${id}/approve`);
      onRefresh();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const reject = async (id) => {
    Alert.alert('Reject Student', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try { await api.put(`/admin/students/${id}/reject`, { reason: 'Rejected by admin' }); onRefresh(); }
          catch (e) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const remove = async (id) => {
    Alert.alert('Delete Student', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/admin/students/${id}`); onRefresh(); }
          catch (e) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  return (
    <View style={styles.tab}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search students..." placeholderTextColor="#94A3B8"
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#94A3B8" /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="person-add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyInner}>
          <Ionicons name="people-outline" size={40} color="#CBD5E1" />
          <Text style={styles.emptyTxt}>No students found</Text>
        </View>
      ) : filtered.map(s => (
        <StudentCard
          key={s._id} student={s}
          onView={() => navigation.navigate('AdminStudentDetail', { student: s, batchId })}
          onApprove={() => approve(s._id)}
          onReject={() => reject(s._id)}
          onDelete={() => remove(s._id)}
        />
      ))}

      <AddStudentModal
        visible={showAdd} batchId={batchId}
        onClose={() => setShowAdd(false)} onAdded={onRefresh}
      />
    </View>
  );
}

function StudentCard({ student: s, onView, onApprove, onReject, onDelete }) {
  const name = s.profile?.name || s.email.split('@')[0];
  const statusColor = { approved: '#10B981', pending: '#F59E0B', rejected: '#EF4444' }[s.status] || '#94A3B8';

  return (
    <TouchableOpacity style={styles.card} onPress={onView} activeOpacity={0.85}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarTxt}>{name[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardRow}>
          <Text style={styles.cardName}>{name}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.badgeTxt, { color: statusColor }]}>{s.status}</Text>
          </View>
        </View>
        <Text style={styles.cardEmail}>{s.email}</Text>
        {s.profile?.rollNumber ? <Text style={styles.cardMeta}>Roll: {s.profile.rollNumber}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        {s.status === 'pending' && (
          <>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={onApprove}>
              <Ionicons name="checkmark" size={14} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={onReject}>
              <Ionicons name="close" size={14} color="#EF4444" />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function AddStudentModal({ visible, batchId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', rollNumber: '', phone: '', gender: 'male' });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.email || !form.password) { Alert.alert('Error', 'Email and password required'); return; }
    setSaving(true);
    try {
      await api.post('/admin/students', { ...form, batchId });
      onAdded(); onClose();
      setForm({ name: '', email: '', password: '', rollNumber: '', phone: '', gender: 'male' });
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Student</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#64748B" /></TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {[
            { k: 'name', label: 'Full Name', ph: 'Ali Hassan' },
            { k: 'email', label: 'Email *', ph: 'student@email.com', type: 'email-address' },
            { k: 'password', label: 'Password *', ph: 'Min 6 chars', secure: true },
            { k: 'rollNumber', label: 'Roll Number', ph: 'BS-CS-2024-01' },
            { k: 'phone', label: 'Phone', ph: '03001234567', type: 'phone-pad' },
          ].map(({ k, label, ph, type, secure }) => (
            <View key={k} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.fieldInput} value={form[k]} onChangeText={v => f(k, v)}
                placeholder={ph} keyboardType={type} secureTextEntry={secure}
                placeholderTextColor="#94A3B8"
              />
            </View>
          ))}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {['male', 'female'].map(g => (
                <TouchableOpacity
                  key={g} style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                  onPress={() => f('gender', g)}
                >
                  <Text style={[styles.genderTxt, form.gender === g && styles.genderTxtActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveTxt}>Add Student</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── COURSES TAB ──────────────────────────────────────────────────────────────

function CoursesTab({ courses, batchId, deptId, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const remove = async (id) => {
    Alert.alert('Delete Course', 'Remove this course?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/courses/${id}`); onRefresh(); }
          catch (e) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  return (
    <View style={styles.tab}>
      <TouchableOpacity style={styles.addCourseBtn} onPress={() => { setEditing(null); setShowAdd(true); }}>
        <Ionicons name="add-circle-outline" size={18} color="#047857" />
        <Text style={styles.addCourseTxt}>Add Course</Text>
      </TouchableOpacity>

      {courses.length === 0 ? (
        <View style={styles.emptyInner}>
          <Ionicons name="book-outline" size={40} color="#CBD5E1" />
          <Text style={styles.emptyTxt}>No courses yet</Text>
        </View>
      ) : courses.map(c => (
        <CourseCard key={c._id} course={c}
          onEdit={() => { setEditing(c); setShowAdd(true); }}
          onDelete={() => remove(c._id)}
        />
      ))}

      <CourseFormModal
        visible={showAdd} course={editing} batchId={batchId} deptId={deptId}
        onClose={() => setShowAdd(false)} onSaved={onRefresh}
      />
    </View>
  );
}

function CourseCard({ course: c, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <View style={styles.courseIconWrap}>
        <Ionicons name="book" size={20} color="#10b981" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardRow}>
          <Text style={styles.cardName}>{c.name}</Text>
          <Text style={styles.courseCode}>{c.code}</Text>
        </View>
        {c.teacher ? <Text style={styles.cardMeta}><Ionicons name="person-outline" size={11} /> {c.teacher}</Text> : null}
        <Text style={styles.cardMeta}>{c.credits ?? 3} credits · {c.students?.length ?? 0} students</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ecfdf5' }]} onPress={onEdit}>
          <Ionicons name="pencil" size={14} color="#059669" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CourseFormModal({ visible, course, batchId, deptId, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', code: '', teacher: '', teacherEmail: '', credits: '3', description: '', semester: '', schedule: '' });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (course) {
      setForm({
        name: course.name || '', code: course.code || '',
        teacher: course.teacher || '', teacherEmail: course.teacherEmail || '',
        credits: String(course.credits || 3), description: course.description || '',
        semester: course.semester || '', schedule: course.schedule || '',
      });
    } else {
      setForm({ name: '', code: '', teacher: '', teacherEmail: '', credits: '3', description: '', semester: '', schedule: '' });
    }
  }, [course]);

  const submit = async () => {
    if (!form.name || !form.code) { Alert.alert('Error', 'Name and code required'); return; }
    setSaving(true);
    try {
      const body = { ...form, credits: Number(form.credits), batch: batchId, department: deptId };
      if (course) await api.put(`/courses/${course._id}`, body);
      else         await api.post('/courses', body);
      onSaved(); onClose();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{course ? 'Edit Course' : 'Add Course'}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#64748B" /></TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {[
            { k: 'name',         label: 'Course Name *',      ph: 'Data Structures' },
            { k: 'code',         label: 'Course Code *',      ph: 'CS-201' },
            { k: 'teacher',      label: 'Teacher Name',       ph: 'Prof. Kamran' },
            { k: 'teacherEmail', label: 'Teacher Email',      ph: 'teacher@uni.edu', type: 'email-address' },
            { k: 'credits',      label: 'Credit Hours',       ph: '3', type: 'numeric' },
            { k: 'semester',     label: 'Semester',           ph: '3rd' },
            { k: 'schedule',     label: 'Schedule',           ph: 'Mon/Wed 10:00-11:30' },
            { k: 'description',  label: 'Description',        ph: 'Optional' },
          ].map(({ k, label, ph, type }) => (
            <View key={k} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.fieldInput} value={form[k]} onChangeText={v => f(k, v)}
                placeholder={ph} keyboardType={type} placeholderTextColor="#94A3B8"
              />
            </View>
          ))}
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={submit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveTxt}>{course ? 'Save Changes' : 'Add Course'}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── ATTENDANCE TAB ───────────────────────────────────────────────────────────

function AttendanceTab({ courses, students }) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);

  // Load enrolled students for selected course from existing attendance
  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    api.get(`/attendance/course/${selectedCourse._id}?date=${date}`)
      .then(res => {
        setExisting(res.data);
        const init = {};
        // Pre-fill from existing records
        res.data.forEach(r => { init[r.student?._id] = r.status; });
        // Default all enrolled to 'present' if not marked
        (selectedCourse.students || []).forEach(sid => {
          const id = typeof sid === 'object' ? sid._id : sid;
          if (!init[id]) init[id] = 'present';
        });
        setRecords(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCourse, date]);

  const enrolledStudents = selectedCourse
    ? students.filter(s => {
        const ids = (selectedCourse.students || []).map(x => typeof x === 'object' ? x._id : x);
        return ids.includes(s._id);
      })
    : [];

  const setStatus = (studentId, status) => setRecords(p => ({ ...p, [studentId]: status }));

  const submit = async () => {
    if (!selectedCourse) { Alert.alert('Select a course first'); return; }
    if (enrolledStudents.length === 0) { Alert.alert('No students enrolled in this course'); return; }
    setSaving(true);
    try {
      const recordsArr = enrolledStudents.map(s => ({
        studentId: s._id,
        status: records[s._id] || 'present',
      }));
      await api.post('/attendance/mark', {
        courseId: selectedCourse._id,
        date,
        records: recordsArr,
      });
      Alert.alert('Success', `Attendance marked for ${recordsArr.length} students`);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const statusColor = { present: '#10B981', absent: '#EF4444', late: '#F59E0B', excused: '#059669' };
  const statusLabel = { present: 'P', absent: 'A', late: 'L', excused: 'E' };

  return (
    <View style={styles.tab}>
      {/* Course picker */}
      <TouchableOpacity style={styles.coursePicker} onPress={() => setShowCoursePicker(true)}>
        <Ionicons name="book-outline" size={16} color="#047857" />
        <Text style={styles.coursePickerTxt}>
          {selectedCourse ? selectedCourse.name : 'Select Course'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#94A3B8" />
      </TouchableOpacity>

      {/* Date input */}
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={16} color="#047857" />
        <TextInput
          style={styles.dateInput} value={date} onChangeText={setDate}
          placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Course picker modal */}
      <Modal visible={showCoursePicker} transparent animationType="fade" onRequestClose={() => setShowCoursePicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowCoursePicker(false)}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>Select Course</Text>
            {courses.length === 0 ? (
              <Text style={styles.pickerEmpty}>No courses in this batch</Text>
            ) : courses.map(c => (
              <TouchableOpacity key={c._id} style={styles.pickerItem}
                onPress={() => { setSelectedCourse(c); setShowCoursePicker(false); }}>
                <Text style={styles.pickerItemTxt}>{c.name}</Text>
                <Text style={styles.pickerItemCode}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {!selectedCourse ? (
        <View style={styles.emptyInner}>
          <Ionicons name="checkmark-circle-outline" size={40} color="#CBD5E1" />
          <Text style={styles.emptyTxt}>Select a course to mark attendance</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color="#047857" style={{ marginTop: 24 }} />
      ) : enrolledStudents.length === 0 ? (
        <View style={styles.emptyInner}>
          <Ionicons name="people-outline" size={40} color="#CBD5E1" />
          <Text style={styles.emptyTxt}>No students enrolled in {selectedCourse.name}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.attSummary}>
            {selectedCourse.name} · {enrolledStudents.length} students
          </Text>

          {/* Quick select all */}
          <View style={styles.quickRow}>
            {['present', 'absent', 'late'].map(s => (
              <TouchableOpacity key={s} style={[styles.quickBtn, { borderColor: statusColor[s] }]}
                onPress={() => {
                  const next = {};
                  enrolledStudents.forEach(st => next[st._id] = s);
                  setRecords(next);
                }}>
                <Text style={[styles.quickTxt, { color: statusColor[s] }]}>All {s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {enrolledStudents.map(s => {
            const name = s.profile?.name || s.email.split('@')[0];
            const status = records[s._id] || 'present';
            return (
              <View key={s._id} style={styles.attCard}>
                <View style={styles.cardAvatar}>
                  <Text style={styles.cardAvatarTxt}>{name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{name}</Text>
                  <Text style={styles.cardEmail}>{s.profile?.rollNumber || s.email}</Text>
                </View>
                <View style={styles.statusBtns}>
                  {['present', 'absent', 'late', 'excused'].map(st => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.statusBtn, status === st && { backgroundColor: statusColor[st] }]}
                      onPress={() => setStatus(s._id, st)}
                    >
                      <Text style={[styles.statusBtnTxt, status === st && { color: '#fff' }]}>
                        {statusLabel[st]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

          <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitTxt}>Save Attendance</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  batchTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  batchSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  tabBar: { flexDirection: 'row', gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#fff' },
  tabTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  tabTxtActive: { color: '#fff' },

  tab: { padding: 16 },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  addBtn: {
    backgroundColor: '#047857', borderRadius: 10, width: 42, height: 42,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardAvatar: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  cardAvatarTxt: { fontSize: 16, fontWeight: '700', color: '#047857' },
  cardRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
  cardEmail:{ fontSize: 12, color: '#64748B', marginTop: 2 },
  cardMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  badge:    { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  courseIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  courseCode: { fontSize: 11, fontWeight: '700', color: '#10b981', backgroundColor: '#ecfdf5', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },

  addCourseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ecfdf5', borderRadius: 10, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: '#a7f3d0',
  },
  addCourseTxt: { color: '#047857', fontWeight: '600', fontSize: 14 },

  emptyInner: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt:   { fontSize: 14, color: '#94A3B8' },

  // Attendance styles
  coursePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#a7f3d0', marginBottom: 10,
  },
  coursePickerTxt: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14,
  },
  dateInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 10 },
  attSummary: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  quickTxt: { fontSize: 12, fontWeight: '600' },
  attCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  statusBtns: { flexDirection: 'row', gap: 4 },
  statusBtn: {
    width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  statusBtnTxt: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  submitBtn: {
    backgroundColor: '#047857', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  pickerBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%',
  },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  pickerItemTxt:  { fontSize: 14, color: '#0F172A' },
  pickerItemCode: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  pickerEmpty:    { color: '#94A3B8', textAlign: 'center', paddingVertical: 16 },

  // Modal styles
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  modalBody: { flex: 1, padding: 20 },
  field:      { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A',
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  genderBtnActive: { borderColor: '#047857', backgroundColor: '#ecfdf5' },
  genderTxt: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  genderTxtActive: { color: '#047857' },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  saveBtn: {
    flex: 2, backgroundColor: '#047857', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
