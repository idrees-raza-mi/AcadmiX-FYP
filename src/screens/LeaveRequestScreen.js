import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';

const STATUS_COLORS = {
  pending:  '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
};
const STATUS_BG = {
  pending:  '#FFFBEB',
  approved: '#ECFDF5',
  rejected: '#FEF2F2',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function isValidDate(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

export default function LeaveRequestScreen() {
  const [requests, setRequests]       = useState([]);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [reason, setReason]             = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const QUOTA = 2;

  const load = useCallback(async () => {
    try {
      const res = await api.get('/leave/my');
      setRequests(res.data || []);
      setMonthlyUsed(res.monthlyUsed ?? 0);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = () => {
    setDateFrom('');
    setDateTo('');
    setReason('');
    setModalVisible(true);
  };

  const validateAndSubmit = async () => {
    const today = todayISO();

    if (!isValidDate(dateFrom)) {
      Alert.alert('Validation Error', 'Please enter a valid From date (YYYY-MM-DD).');
      return;
    }
    if (dateFrom < today) {
      Alert.alert('Validation Error', 'From date must be today or in the future.');
      return;
    }
    if (!isValidDate(dateTo)) {
      Alert.alert('Validation Error', 'Please enter a valid To date (YYYY-MM-DD).');
      return;
    }
    if (dateTo < dateFrom) {
      Alert.alert('Validation Error', 'To date must be on or after From date.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for your leave request.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/leave/request', { dateFrom, dateTo, reason: reason.trim() });
      setModalVisible(false);
      Alert.alert('Success', 'Leave request submitted successfully.');
      setLoading(true);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const quotaFull = monthlyUsed >= QUOTA;
  const quotaPct  = Math.min((monthlyUsed / QUOTA) * 100, 100);
  const barColor  = quotaFull ? '#EF4444' : '#10B981';

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#047857" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#047857', '#047857']} style={styles.header}>
          <Text style={styles.headerTitle}>Leave Requests</Text>
          <View style={styles.quotaCard}>
            <View style={styles.quotaRow}>
              <View style={styles.quotaIcon}>
                <Ionicons name="calendar" size={18} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quotaLabel}>Monthly Quota</Text>
                <Text style={styles.quotaCount}>
                  {monthlyUsed} / {QUOTA} used this month
                </Text>
              </View>
              <Text style={[styles.quotaStatus, { color: barColor }]}>
                {quotaFull ? 'Limit reached' : `${QUOTA - monthlyUsed} left`}
              </Text>
            </View>
            <View style={styles.quotaBarBg}>
              <View style={[styles.quotaBarFill, { width: `${quotaPct}%`, backgroundColor: barColor }]} />
            </View>
          </View>
        </LinearGradient>

        {/* New Request button */}
        <View style={styles.btnRow}>
          {quotaFull ? (
            <View style={styles.disabledBtn}>
              <Ionicons name="ban-outline" size={16} color="#94A3B8" />
              <Text style={styles.disabledBtnTxt}>Monthly quota reached</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.newBtn} onPress={openModal} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.newBtnTxt}>New Request</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Requests list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Requests</Text>

          {requests.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTxt}>No leave requests yet</Text>
              <Text style={styles.emptySub}>Submit a request using the button above</Text>
            </View>
          ) : (
            requests.map((req) => (
              <View key={req._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.dateRange}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <Text style={styles.dateText}>
                      {formatDate(req.dateFrom)}
                      {req.dateTo && req.dateTo !== req.dateFrom
                        ? ` — ${formatDate(req.dateTo)}`
                        : ''}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_BG[req.status] || '#F1F5F9' },
                  ]}>
                    <Text style={[
                      styles.statusTxt,
                      { color: STATUS_COLORS[req.status] || '#64748B' },
                    ]}>
                      {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.reasonTxt} numberOfLines={3}>
                  {req.reason}
                </Text>

                {req.status === 'rejected' && req.adminReason ? (
                  <View style={styles.adminReasonBox}>
                    <Ionicons name="information-circle-outline" size={14} color="#EF4444" />
                    <Text style={styles.adminReasonTxt}>
                      Admin: {req.adminReason}
                    </Text>
                  </View>
                ) : null}

                {req.reviewedAt ? (
                  <Text style={styles.reviewDate}>
                    Reviewed {formatDate(req.reviewedAt)}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* New Request Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Leave Request</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalHint}>
                Enter dates in YYYY-MM-DD format. From date must be today or later.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>From Date</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>To Date</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={dateTo}
                  onChangeText={setDateTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Reason</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldTextArea]}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Describe the reason for your leave..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={validateAndSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveTxt}>Submit Request</Text>
                }
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

  // Header
  header:       { padding: 20, paddingTop: 16 },
  headerTitle:  { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 14 },
  quotaCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, padding: 14,
  },
  quotaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  quotaIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  quotaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  quotaCount: { fontSize: 14, fontWeight: '700', color: '#fff' },
  quotaStatus: { fontSize: 12, fontWeight: '700' },
  quotaBarBg: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3, overflow: 'hidden',
  },
  quotaBarFill: { height: 6, borderRadius: 3 },

  // Buttons
  btnRow: { padding: 16, paddingBottom: 4 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#047857', borderRadius: 12,
    paddingVertical: 13,
    shadowColor: '#047857', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  newBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#F1F5F9', borderRadius: 12,
    paddingVertical: 13, borderWidth: 1, borderColor: '#E2E8F0',
  },
  disabledBtnTxt: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },

  // Section
  section:      { padding: 16, paddingTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12 },

  // Request card
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  dateRange: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dateText:  { fontSize: 13, color: '#334155', fontWeight: '600' },
  statusBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusTxt: { fontSize: 12, fontWeight: '700' },
  reasonTxt: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  adminReasonBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 8,
  },
  adminReasonTxt: { fontSize: 12, color: '#EF4444', flex: 1, lineHeight: 17 },
  reviewDate: { fontSize: 11, color: '#94A3B8', marginTop: 6 },

  // Empty state
  empty:    { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTxt: { fontSize: 15, color: '#94A3B8' },
  emptySub: { fontSize: 13, color: '#CBD5E1', textAlign: 'center' },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  modalBody:  { padding: 20 },
  modalHint:  {
    fontSize: 12, color: '#64748B', backgroundColor: '#ecfdf5',
    borderRadius: 8, padding: 10, marginBottom: 16, lineHeight: 18,
  },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A',
  },
  fieldTextArea: { minHeight: 110, paddingTop: 12 },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  saveBtn: {
    flex: 2, backgroundColor: '#047857', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  saveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
