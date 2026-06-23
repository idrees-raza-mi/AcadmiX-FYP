import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, TextInput, Modal, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { SERVER_URL } from '../config';
import { isValidPhone, isValidCnic, MESSAGES } from '../utils/validation';

// Build an absolute, slash-normalized URL for a stored upload path.
const photoUri = (p) => (p ? `${SERVER_URL}/${String(p).replace(/\\/g, '/')}` : null);

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student/profile');
      setProfile(res.data);
      const p = res.data.profile || {};
      setForm({
        name:          p.name          || '',
        phone:         p.phone         || '',
        rollNumber:    p.rollNumber    || '',
        gender:        p.gender        || '',
        dateOfBirth:   p.dateOfBirth   || '',
        city:          p.city          || '',
        address:       p.address       || '',
        guardianName:  p.guardianName  || '',
        guardianPhone: p.guardianPhone || '',
        semester:      p.semester      || '',
        cnic:          p.cnic          || '',
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!isValidPhone(form.phone))         { Alert.alert('Invalid Phone', MESSAGES.phone); return; }
    if (!isValidPhone(form.guardianPhone)) { Alert.alert('Invalid Guardian Phone', MESSAGES.phone); return; }
    if (!isValidCnic(form.cnic))           { Alert.alert('Invalid CNIC', MESSAGES.cnic); return; }

    setSaving(true);
    try {
      await api.put('/student/profile', form);
      await load();
      setEditing(false);
      Alert.alert('Success', 'Profile updated');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const pickAndUploadPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const name = asset.fileName || `photo_${Date.now()}.jpg`;
    const type = asset.mimeType || 'image/jpeg';

    const data = new FormData();
    data.append('profilePhoto', { uri: asset.uri, name, type });

    setUploadingPhoto(true);
    try {
      await api.upload('/student/profile/photo', data);
      await load();
    } catch (e) { Alert.alert('Upload failed', e.message); }
    finally { setUploadingPhoto(false); }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#047857" /></View>
  );

  const p = profile?.profile || {};
  const name = p.name || profile?.email?.split('@')[0] || 'Student';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#047857', '#047857']} style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} onPress={pickAndUploadPhoto} disabled={uploadingPhoto}>
            <View style={styles.avatar}>
              {photoUri(p.profilePhoto)
                ? <Image source={{ uri: photoUri(p.profilePhoto) }} style={styles.avatarImg} />
                : <Text style={styles.avatarTxt}>{name[0]?.toUpperCase()}</Text>}
              <View style={styles.cameraBadge}>
                {uploadingPhoto
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="camera" size={14} color="#fff" />}
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          <View style={[styles.statusBadge, { backgroundColor: profile?.status === 'approved' ? '#D1FAE5' : '#FEF3C7' }]}>
            <Text style={[styles.statusTxt, { color: profile?.status === 'approved' ? '#065F46' : '#92400E' }]}>
              {profile?.status}
            </Text>
          </View>
        </LinearGradient>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Ionicons name="pencil" size={16} color="#047857" />
            <Text style={styles.editBtnTxt}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => {
            Alert.alert('Logout', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: logout }
            ]);
          }}>
            <Ionicons name="log-out-outline" size={16} color="#EF4444" />
            <Text style={styles.logoutTxt}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            {[
              { icon: 'card-outline',     label: 'Roll No',      val: p.rollNumber },
              { icon: 'finger-print-outline', label: 'CNIC',     val: p.cnic },
              { icon: 'call-outline',     label: 'Phone',        val: p.phone },
              { icon: 'person-outline',   label: 'Gender',       val: p.gender },
              { icon: 'calendar-outline', label: 'Date of Birth',val: p.dateOfBirth },
              { icon: 'school-outline',   label: 'Semester',     val: p.semester },
              { icon: 'location-outline', label: 'City',         val: p.city },
              { icon: 'home-outline',     label: 'Address',      val: p.address },
            ].map(r => (
              <View key={r.label} style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name={r.icon} size={14} color="#059669" />
                </View>
                <Text style={styles.infoLabel}>{r.label}</Text>
                <Text style={styles.infoVal}>{r.val || <Text style={{ color: '#CBD5E1' }}>Not set</Text>}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guardian Information</Text>
          <View style={styles.infoCard}>
            {[
              { icon: 'people-outline', label: 'Name',  val: p.guardianName },
              { icon: 'call-outline',   label: 'Phone', val: p.guardianPhone },
            ].map(r => (
              <View key={r.label} style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name={r.icon} size={14} color="#10b981" />
                </View>
                <Text style={styles.infoLabel}>{r.label}</Text>
                <Text style={styles.infoVal}>{r.val || <Text style={{ color: '#CBD5E1' }}>Not set</Text>}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {[
              { k: 'name',          label: 'Full Name',          ph: 'Ali Hassan' },
              { k: 'rollNumber',    label: 'Roll Number',        ph: 'BS-CS-2024-01' },
              { k: 'cnic',          label: 'CNIC',               ph: '35201-1234567-1', type: 'numbers-and-punctuation' },
              { k: 'phone',         label: 'Phone',              ph: '03001234567', type: 'phone-pad' },
              { k: 'gender',        label: 'Gender',             ph: 'male / female' },
              { k: 'dateOfBirth',   label: 'Date of Birth',      ph: 'YYYY-MM-DD' },
              { k: 'semester',      label: 'Semester',           ph: '3rd' },
              { k: 'city',          label: 'City',               ph: 'Lahore' },
              { k: 'address',       label: 'Address',            ph: 'Street, Area' },
              { k: 'guardianName',  label: 'Guardian Name',      ph: 'Father / Guardian' },
              { k: 'guardianPhone', label: 'Guardian Phone',     ph: '03001234567', type: 'phone-pad' },
            ].map(({ k, label, ph, type }) => {
              const err =
                (k === 'phone' || k === 'guardianPhone') && !isValidPhone(form[k]) ? MESSAGES.phone :
                (k === 'cnic' && !isValidCnic(form[k])) ? MESSAGES.cnic : null;
              return (
                <View key={k} style={{ marginBottom: 14 }}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={[styles.fieldInput, err && styles.fieldInputError]} value={form[k]} onChangeText={v => f(k, v)}
                    placeholder={ph} keyboardType={type} placeholderTextColor="#94A3B8"
                  />
                  {err && <Text style={styles.fieldError}>{err}</Text>}
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveTxt}>Save Changes</Text>
              }
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

  header: { alignItems: 'center', padding: 28, paddingTop: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarTxt: { fontSize: 28, fontWeight: '800', color: '#fff' },
  avatarImg: { width: 72, height: 72, borderRadius: 20 },
  cameraBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#047857',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name:  { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  statusTxt: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  actionRow: { flexDirection: 'row', gap: 12, padding: 16 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#ecfdf5', borderRadius: 10, paddingVertical: 11,
    borderWidth: 1, borderColor: '#a7f3d0',
  },
  editBtnTxt: { color: '#047857', fontWeight: '600', fontSize: 14 },
  logoutBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FEF2F2', borderRadius: 10, paddingVertical: 11,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutTxt: { color: '#EF4444', fontWeight: '600', fontSize: 14 },

  section:      { padding: 16, paddingTop: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 10, marginTop: 8 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  infoIcon:  { width: 28, height: 28, borderRadius: 8, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { width: 110, fontSize: 12, color: '#64748B', fontWeight: '500' },
  infoVal:   { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500' },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A',
  },
  fieldInputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  saveBtn:   { flex: 2, backgroundColor: '#047857', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveTxt:   { fontSize: 14, fontWeight: '700', color: '#fff' },
});
