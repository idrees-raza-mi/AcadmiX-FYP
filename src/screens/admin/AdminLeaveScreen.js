import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

const TABS = ['Pending', 'Approved', 'Rejected'];

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

export default function AdminLeaveScreen() {
  const [activeTab, setActiveTab]     = useState('Pending');
  const [requests, setRequests]       = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // Reject modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTargetId, setRejectTargetId]         = useState(null);
  const [adminReason, setAdminReason]               = useState('');
  const [actionLoading, setActionLoading]           = useState(false);

  const load = useCallback(async (tab = activeTab, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/leave/all?status=${tab.toLowerCase()}`);
      setRequests(res.data || []);
      if (tab === 'Pending') setPendingCount(res.data?.length ?? 0);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  // Also fetch pending count independently when not on Pending tab
  const loadPendingCount = useCallback(async () => {
    try {
      const res = await api.get('/leave/all?status=pending');
      setPendingCount(res.data?.length ?? 0);
    } catch (_) {}
  }, []);

  useEffect(() => {
    setLoading(true);
    load(activeTab);
    if (activeTab !== 'Pending') loadPendingCount();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    load(activeTab);
    if (activeTab !== 'Pending') loadPendingCount();
  };

  const handleApprove = (id) => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this leave request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.put(`/leave/${id}/approve`);
              load(activeTab, true);
              loadPendingCount();
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const openRejectModal = (id) => {
    setRejectTargetId(id);
    setAdminReason('');
    setRejectModalVisible(true);
  };

  const handleRejectSubmit = async () => {
    if (!adminReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for rejection.');
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/leave/${rejectTargetId}/reject`, { adminReason: adminReason.trim() });
      setRejectModalVisible(false);
      load(activeTab, true);
      loadPendingCount();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#047857', '#059669']} style={styles.header}>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <Text style={styles.headerSub}>Review and manage student leave requests</Text>
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
              {tab === 'Pending' && pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#047857" />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {requests.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTxt}>No {activeTab.toLowerCase()} requests</Text>
            </View>
          ) : (
            requests.map(req => (
              <View key={req._id} style={styles.card}>
                {/* Card top: student info + status */}
                <View style={styles.cardTop}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarTxt}>
                      {(req.student?.profile?.name || req.student?.email || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>
                      {req.student?.profile?.name || req.student?.email || 'Unknown Student'}
                    </Text>
                    {req.batch?.name ? (
                      <Text style={styles.batchName}>{req.batch.name}</Text>
                    ) : null}
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

                {/* Date range */}
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={styles.infoTxt}>
                    {formatDate(req.dateFrom)}
                    {req.dateTo && req.dateTo !== req.dateFrom
                      ? ` — ${formatDate(req.dateTo)}`
                      : ''}
                  </Text>
                </View>

                {/* Reason */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Reason</Text>
                  <Text style={styles.reasonTxt}>{req.reason}</Text>
                </View>

                {/* Admin reason (rejected) */}
                {req.status === 'rejected' && req.adminReason ? (
                  <View style={styles.adminReasonBox}>
                    <Ionicons name="information-circle-outline" size={14} color="#EF4444" />
                    <Text style={styles.adminReasonTxt}>
                      Rejection reason: {req.adminReason}
                    </Text>
                  </View>
                ) : null}

                {/* Review info */}
                {req.reviewedAt ? (
                  <View style={styles.reviewRow}>
                    <Ionicons name="checkmark-done-outline" size={13} color="#94A3B8" />
                    <Text style={styles.reviewTxt}>
                      Reviewed {formatDate(req.reviewedAt)}
                      {req.reviewedBy?.name ? ` by ${req.reviewedBy.name}` : ''}
                    </Text>
                  </View>
                ) : null}

                {/* Action buttons (Pending only) */}
                {req.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(req._id)}
                      disabled={actionLoading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark" size={15} color="#fff" />
                      <Text style={styles.approveTxt}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => openRejectModal(req._id)}
                      disabled={actionLoading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={15} color="#fff" />
                      <Text style={styles.rejectTxt}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Reject Leave Request</Text>
            <Text style={styles.sheetSub}>
              Provide a reason for the student (required).
            </Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea]}
              value={adminReason}
              onChangeText={setAdminReason}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.sheetCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetRejectBtn}
                onPress={handleRejectSubmit}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.sheetRejectTxt}>Confirm Reject</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { padding: 20, paddingTop: 14 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6,
  },
  tabItemActive: {
    borderBottomWidth: 2, borderBottomColor: '#047857',
  },
  tabTxt: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  tabTxtActive: { color: '#047857' },
  badge: {
    backgroundColor: '#EF4444', borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },

  listContent: { padding: 16, paddingBottom: 24 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  studentAvatar: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarTxt: { fontSize: 15, fontWeight: '800', color: '#047857' },
  studentName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  batchName:   { fontSize: 12, color: '#10b981', fontWeight: '500', marginTop: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:   { fontSize: 12, fontWeight: '700' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  infoTxt: { fontSize: 13, color: '#334155', fontWeight: '600' },

  reasonBox:  { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, marginBottom: 8 },
  reasonLabel:{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonTxt:  { fontSize: 13, color: '#334155', lineHeight: 19 },

  adminReasonBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 8,
  },
  adminReasonTxt: { fontSize: 12, color: '#EF4444', flex: 1, lineHeight: 17 },

  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  reviewTxt: { fontSize: 11, color: '#94A3B8' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 10,
  },
  approveTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: '#EF4444', borderRadius: 10, paddingVertical: 10,
  },
  rejectTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Empty state
  empty:    { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTxt: { fontSize: 15, color: '#94A3B8' },

  // Bottom sheet modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  sheetSub:   { fontSize: 13, color: '#64748B', marginBottom: 14 },
  fieldInput: {
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A',
  },
  fieldTextArea: { minHeight: 100, paddingTop: 12 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sheetCancelBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  sheetCancelTxt: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  sheetRejectBtn: {
    flex: 2, backgroundColor: '#EF4444', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  sheetRejectTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
