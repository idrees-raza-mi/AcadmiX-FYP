import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

export default function AdminStudentDetailScreen({ route, navigation }) {
  const { student: s, batchId } = route.params;
  const [detail, setDetail]     = useState(s);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm]       = useState({});
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/admin/students/${s._id}`),
      api.get(`/attendance/student/${s._id}`),
    ]).then(([sRes, aRes]) => {
      setDetail(sRes.data);
      setAttendance(aRes.data || []);
    }).catch(e => console.error(e))
    .finally(() => setLoading(false));
  }, [s._id]);

  const approve = async () => {
    try {
      await api.put(`/admin/students/${s._id}/approve`);
      setDetail(p => ({ ...p, status: 'approved' }));
      Alert.alert('Success', 'Student approved');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const reject = async () => {
    Alert.alert('Reject', 'Reject this student?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/admin/students/${s._id}/reject`, { reason: 'Rejected by admin' });
            setDetail(p => ({ ...p, status: 'rejected' }));
          } catch (e) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const openEdit = () => {
    setEditForm({
      name:          detail?.profile?.name || '',
      phone:         detail?.profile?.phone || '',
      rollNumber:    detail?.profile?.rollNumber || '',
      gender:        detail?.profile?.gender || '',
      city:          detail?.profile?.city || '',
      guardianName:  detail?.profile?.guardianName || '',
      guardianPhone: detail?.profile?.guardianPhone || '',
    });
    setEditVisible(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/students/${s._id}`, { profile: editForm });
      setDetail(data.student || { ...detail, profile: { ...detail.profile, ...editForm } });
      setEditVisible(false);
      Alert.alert('Saved', 'Student info updated.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = () => {
    Alert.alert(
      'Delete Student',
      `Remove ${name} permanently? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/students/${s._id}`);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || e.message);
            }
          }
        }
      ]
    );
  };

  const name = detail?.profile?.name || detail?.email?.split('@')[0] || 'Student';
  const statusColor = { approved: '#10B981', pending: '#F59E0B', rejected: '#EF4444' }[detail?.status] || '#94A3B8';

  const overallStats = attendance.reduce(
    (acc, c) => ({
      total:   acc.total   + c.total,
      present: acc.present + c.present,
      absent:  acc.absent  + c.absent,
    }), { total: 0, present: 0, absent: 0 }
  );
  const overallPct = overallStats.total > 0
    ? Math.round((overallStats.present / overallStats.total) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <LinearGradient colors={['#047857', '#047857']} style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.headerAction} onPress={openEdit}>
                  <Ionicons name="create-outline" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerAction, { backgroundColor: 'rgba(239,68,68,0.4)' }]} onPress={deleteStudent}>
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{name[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{detail?.email}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '33' }]}>
              <Text style={[styles.statusTxt, { color: statusColor }]}>{detail?.status}</Text>
            </View>
          </LinearGradient>

          {/* Approve/Reject actions */}
          {detail?.status === 'pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={approve}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.actionTxt}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={reject}>
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.actionTxt}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Profile info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <View style={styles.infoCard}>
              {[
                { icon: 'call-outline', label: 'Phone', val: detail?.profile?.phone },
                { icon: 'card-outline', label: 'Roll No', val: detail?.profile?.rollNumber },
                { icon: 'person-outline', label: 'Gender', val: detail?.profile?.gender },
                { icon: 'calendar-outline', label: 'DOB', val: detail?.profile?.dateOfBirth },
                { icon: 'location-outline', label: 'City', val: detail?.profile?.city },
                { icon: 'people-outline', label: 'Guardian', val: detail?.profile?.guardianName },
                { icon: 'call-outline', label: 'Guardian Phone', val: detail?.profile?.guardianPhone },
              ].filter(r => r.val).map(r => (
                <View key={r.label} style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name={r.icon} size={14} color="#059669" />
                  </View>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoVal}>{r.val}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Attendance overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attendance Overview</Text>
            <View style={styles.attRow}>
              <View style={[styles.attStat, { backgroundColor: '#ecfdf5' }]}>
                <Text style={[styles.attPct, { color: '#047857' }]}>{overallPct}%</Text>
                <Text style={styles.attLbl}>Overall</Text>
              </View>
              <View style={[styles.attStat, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.attPct, { color: '#10B981' }]}>{overallStats.present}</Text>
                <Text style={styles.attLbl}>Present</Text>
              </View>
              <View style={[styles.attStat, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.attPct, { color: '#EF4444' }]}>{overallStats.absent}</Text>
                <Text style={styles.attLbl}>Absent</Text>
              </View>
              <View style={[styles.attStat, { backgroundColor: '#F8FAFC' }]}>
                <Text style={[styles.attPct, { color: '#64748B' }]}>{overallStats.total}</Text>
                <Text style={styles.attLbl}>Total</Text>
              </View>
            </View>

            {/* Per-course attendance */}
            {attendance.map(c => {
              const pct = c.total > 0 ? Math.round((c.present / c.total) * 100) : 0;
              const barColor = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
              return (
                <View key={c.course?._id} style={styles.courseAtt}>
                  <View style={styles.courseAttRow}>
                    <Text style={styles.courseAttName}>{c.course?.name}</Text>
                    <Text style={[styles.courseAttPct, { color: barColor }]}>{pct}%</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={styles.courseAttDetail}>
                    Present: {c.present} · Absent: {c.absent} · Total: {c.total}
                  </Text>
                </View>
              );
            })}
            {attendance.length === 0 && (
              <Text style={styles.noAtt}>No attendance records yet</Text>
            )}
          </View>

          {/* Courses */}
          {(detail?.courses?.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enrolled Courses</Text>
              {detail.courses.map(c => (
                <View key={c._id} style={styles.courseRow}>
                  <View style={styles.courseIconWrap}>
                    <Ionicons name="book" size={16} color="#10b981" />
                  </View>
                  <View>
                    <Text style={styles.courseRowName}>{c.name}</Text>
                    <Text style={styles.courseRowCode}>{c.code}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Edit Modal ── */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
              {[
                { key: 'name',          label: 'Full Name',       placeholder: 'Enter full name' },
                { key: 'phone',         label: 'Phone',           placeholder: '+92 3XX XXXXXXX', keyboardType: 'phone-pad' },
                { key: 'rollNumber',    label: 'Roll Number',     placeholder: 'e.g. BS-CS-2301' },
                { key: 'gender',        label: 'Gender',          placeholder: 'Male / Female / Other' },
                { key: 'city',          label: 'City',            placeholder: 'Lahore' },
                { key: 'guardianName',  label: 'Guardian Name',   placeholder: "Parent / Guardian's name" },
                { key: 'guardianPhone', label: 'Guardian Phone',  placeholder: '+92 3XX XXXXXXX', keyboardType: 'phone-pad' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 12 }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editForm[f.key] || ''}
                    onChangeText={v => setEditForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType={f.keyboardType || 'default'}
                    autoCapitalize="words"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveEdit} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', padding: 24, paddingTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  back: {},
  headerAction: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarTxt: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name:  { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  statusTxt: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  actionRow: {
    flexDirection: 'row', gap: 12, padding: 16,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 12,
  },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn:  { backgroundColor: '#EF4444' },
  actionTxt:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  section: { padding: 16, paddingTop: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 10, marginTop: 16 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  infoIcon:  { width: 28, height: 28, borderRadius: 8, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { width: 100, fontSize: 12, color: '#64748B', fontWeight: '500' },
  infoVal:   { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500' },

  attRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  attStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  attPct:  { fontSize: 20, fontWeight: '800' },
  attLbl:  { fontSize: 10, color: '#64748B', marginTop: 2 },

  courseAtt: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  courseAttRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  courseAttName:   { fontSize: 13, fontWeight: '600', color: '#0F172A', flex: 1 },
  courseAttPct:    { fontSize: 13, fontWeight: '700' },
  barBg:  { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, marginBottom: 4 },
  barFill:{ height: 6, borderRadius: 3 },
  courseAttDetail: { fontSize: 11, color: '#94A3B8' },
  noAtt: { textAlign: 'center', color: '#94A3B8', paddingVertical: 16 },

  courseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  courseIconWrap: {
    width: 36, height: 36, borderRadius: 9, backgroundColor: '#ecfdf5',
    alignItems: 'center', justifyContent: 'center',
  },
  courseRowName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  courseRowCode: { fontSize: 11, color: '#10b981', marginTop: 2 },

  // Edit modal
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
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
});
