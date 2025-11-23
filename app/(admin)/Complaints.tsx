// app/(admin)/Complaints.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { fetchReports, updateReportsStatus } from "../../api/users";
import { useAuth } from "../../sessions/AuthContext";
import { createModerationLog } from "../../api/moderation";

const VIOLET = "#7C3AED";
const STATUS_FLOW: ReportStatus[] = ["pending", "in_progress", "resolved"];

type ReportStatus = "pending" | "in_progress" | "resolved" | string | null;
type Report = {
  id: number;
  user_id?: number | null;
  message?: string | null;
  status?: ReportStatus;
  created_at?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user?: { name?: string | null; email?: string | null };
};

type FilterKey = "all" | "pending" | "in_progress" | "resolved";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatus(s: ReportStatus) {
  const v = String(s || "").toLowerCase();
  if (v === "resolved") return "Resolved";
  if (v === "in_progress") return "In progress";
  return "Pending";
}

function statusColor(status: ReportStatus) {
  const v = String(status || "").toLowerCase();
  if (v === "resolved") return "#16A34A";
  if (v === "in_progress") return "#F97316";
  return "#DC2626";
}

function StatCard({
  label,
  value,
  color,
  style,
}: {
  label: string;
  value: number;
  color: string;
  style?: any;
}) {
  return (
    <View
      className="rounded-2xl px-4 py-3"
      style={{ backgroundColor: `${color}1A`, ...style }}
    >
      <Text className="text-[12px] text-gray-700 font-semibold">{label}</Text>
      <Text
        className="text-[24px] font-extrabold mt-1"
        style={{ color: color === "#111827" ? "#111827" : color }}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusPill({ status }: { status: ReportStatus }) {
  const color = statusColor(status);
  return (
    <View
      className="px-2 py-[4px] rounded-full"
      style={{ backgroundColor: `${color}1A` }}
    >
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

function ReportCard({
  report,
  isLast,
  style,
  onPress,
  disabled,
  nextStatusLabel,
}: {
  report: Report;
  isLast: boolean;
  style?: any;
  onPress?: () => void;
  disabled?: boolean;
  nextStatusLabel?: string;
}) {
  const reporterName =
    report.user?.name ||
    report.user_name ||
    report.user_email ||
    report.user?.email ||
    (report.user_id ? `User #${report.user_id}` : "Unknown user");
  const dateLabel = formatDate(report.created_at);
  const message = report.message || "No details provided.";

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      disabled={disabled}
      className="rounded-2xl border border-gray-200 bg-white p-4"
      style={style}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[12px] text-gray-500">{reporterName}</Text>
          {report.user_id ? (
            <Text className="text-[11px] text-gray-400 mt-0.5">
              #{report.user_id}
            </Text>
          ) : null}
        </View>
        <StatusPill status={report.status ?? null} />
      </View>

        <Text className="text-[13px] text-gray-800 mt-2 leading-[20px]">
          {message}
        </Text>

      <View className="flex-row items-center mt-3 justify-between">
        <View className="flex-row items-center">
          <Feather name="clock" size={14} color="#9CA3AF" />
          <Text className="text-[11px] text-gray-500 ml-1">
            {dateLabel || "Date unknown"}
          </Text>
        </View>

        {nextStatusLabel ? (
          <View className="flex-row items-center">
            <Feather name="refresh-cw" size={14} color="#6B7280" />
            <Text className="text-[11px] text-gray-600 ml-1">
              Tap to mark {nextStatusLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ComplaintsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [logModal, setLogModal] = useState<{
    visible: boolean;
    report: Report | null;
    nextStatus: ReportStatus;
    notes: string;
  }>({ visible: false, report: null, nextStatus: "pending", notes: "" });

  const loadReports = useCallback(async () => {
    setError(null);
    try {
      const list: Report[] | any = await fetchReports();
      setReports(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load reports");
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getNextStatus = useCallback((status: ReportStatus) => {
    const current = String(status || "pending").toLowerCase();
    const idx = STATUS_FLOW.indexOf(current as ReportStatus);
    const nextIdx = idx >= 0 && idx < STATUS_FLOW.length - 1 ? idx + 1 : 0;
    return STATUS_FLOW[nextIdx];
  }, []);

  const handleStatusChange = useCallback(
    async (report: Report, notes?: string) => {
      if (!report?.id || updatingId) return;

      const next = getNextStatus(report.status ?? "pending");
      setUpdatingId(report.id);
      try {
        await updateReportsStatus(report.id, next);
        if ((user as any)?.id) {
          try {
            await createModerationLog({
              admin_user_id: (user as any).id,
              action: `set_report_${next}`,
              entity_type: "user",
              entity_id: report.user_id ?? report.id,
              notes: notes?.trim?.() || null,
            });
          } catch (logErr: any) {
            Alert.alert(
              "Status saved, log failed",
              logErr?.message ||
                "The report status was updated but the moderation log could not be saved."
            );
          }
        }
        setReports((prev) =>
          prev.map((r) =>
            r.id === report.id
              ? {
                  ...r,
                  status: next,
                }
              : r
          )
        );
        return true;
      } catch (e: any) {
        Alert.alert("Update failed", e?.message || "Could not update status");
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [getNextStatus, updatingId, user]
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((rep) => {
      const s = String(rep.status || "").toLowerCase();
      return s === filter;
    });
  }, [filter, reports]);

  const openLogModal = useCallback(
    (report: Report) => {
      const next = getNextStatus(report.status ?? "pending");
      setLogModal({ visible: true, report, nextStatus: next, notes: "" });
    },
    [getNextStatus]
  );

  const submitModerationLog = useCallback(async () => {
    if (!logModal.report) return;
    const ok = await handleStatusChange(logModal.report, logModal.notes);
    if (!ok) return;
    setLogModal({ visible: false, report: null, nextStatus: "pending", notes: "" });
  }, [handleStatusChange, logModal]);

  const pendingCount = useMemo(
    () =>
      reports.filter(
        (r) => String(r.status || "").toLowerCase() === "pending"
      ).length,
    [reports]
  );
  const progressCount = useMemo(
    () =>
      reports.filter(
        (r) => String(r.status || "").toLowerCase() === "in_progress"
      ).length,
    [reports]
  );
  const resolvedCount = useMemo(
    () =>
      reports.filter(
        (r) => String(r.status || "").toLowerCase() === "resolved"
      ).length,
    [reports]
  );

  if (user && (user as any).role && (user as any).role !== "admin") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView
          className="flex-1 bg-white items-center justify-center px-6"
          edges={["top"]}
        >
          <Text className="text-[18px] font-semibold text-gray-900 mb-2">
            Restricted area
          </Text>
          <Text className="text-[13px] text-gray-500 text-center">
            This section is only available for admin accounts.
          </Text>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-[#F3F4F6]" edges={["top"]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadReports();
              }}
            />
          }
        >
          {/* Header */}
          <View className="px-5 pt-4 flex-row items-center justify-between">
            <View>
              <Text className="text-[28px] font-extrabold text-gray-900">
                Complaints
              </Text>
              <Text className="text-[13px] text-gray-500 mt-1">
                User reports & feedback
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(admin)/dashboard")}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: `${VIOLET}1A` }}
            >
              <Text
                className="text-[12px] font-semibold"
                style={{ color: VIOLET }}
              >
                Dashboard
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View className="px-5 mt-6 flex-row flex-wrap justify-between">
            <StatCard
              label="Total"
              value={reports.length}
              color="#111827"
              style={{ width: "48%", marginBottom: 12 }}
            />
            <StatCard
              label="Pending"
              value={pendingCount}
              color="#DC2626"
              style={{ width: "48%", marginBottom: 12 }}
            />
            <StatCard
              label="In progress"
              value={progressCount}
              color="#F97316"
              style={{ width: "48%", marginBottom: 12 }}
            />
            <StatCard
              label="Resolved"
              value={resolvedCount}
              color="#16A34A"
              style={{ width: "48%", marginBottom: 12 }}
            />
          </View>

          {/* Filters */}
          <View className="px-5 mt-2 flex-row">
            {(["all", "pending", "in_progress", "resolved"] as FilterKey[]).map(
              (key) => {
                const active = filter === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setFilter(key)}
                    activeOpacity={0.85}
                    className="mr-2 mb-2 px-3 py-2 rounded-full border"
                    style={{
                      borderColor: active ? VIOLET : "#E5E7EB",
                      backgroundColor: active ? `${VIOLET}1A` : "#FFFFFF",
                    }}
                  >
                    <Text
                      className="text-[12px] font-semibold"
                      style={{ color: active ? VIOLET : "#111827" }}
                    >
                      {key === "all"
                        ? "All"
                        : key === "in_progress"
                        ? "In progress"
                        : key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {/* Body */}
          <View className="px-5 mt-2">
            {loading ? (
              <View className="py-12 items-center">
                <ActivityIndicator />
                <Text className="text-[12px] text-gray-500 mt-2">
                  Loading reports…
                </Text>
              </View>
            ) : error ? (
              <View className="py-10 items-center">
                <Text className="text-[15px] font-semibold text-gray-900">
                  Couldn’t load reports
                </Text>
                <Text className="text-[12px] text-gray-500 mt-2 text-center">
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setLoading(true);
                    loadReports();
                  }}
                  className="mt-4 px-4 py-2 rounded-full bg-white border border-gray-200"
                >
                  <Text className="text-[13px] font-semibold text-gray-900">
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : filtered.length === 0 ? (
              <View className="py-10 items-center rounded-2xl border border-dashed border-gray-300 bg-white/60">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: `${VIOLET}1A` }}
                >
                  <Feather name="inbox" size={20} color={VIOLET} />
                </View>
                <Text className="text-[15px] font-bold text-gray-900">
                  No reports here
                </Text>
                <Text className="text-[12px] text-gray-500 mt-1 text-center px-6">
                  {filter === "all"
                    ? "There are no user reports yet. New submissions will show up here."
                    : "No reports match this filter."}
                </Text>
              </View>
            ) : (
              filtered.map((rep, idx) => (
                <ReportCard
                  key={rep.id}
                  report={rep}
                  isLast={idx === filtered.length - 1}
                  onPress={() => openLogModal(rep)}
                  disabled={updatingId === rep.id}
                  nextStatusLabel={formatStatus(getNextStatus(rep.status ?? "pending"))}
                  style={{
                    marginBottom: idx === filtered.length - 1 ? 0 : 12,
                  }}
                />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={logModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (updatingId) return;
          setLogModal({ visible: false, report: null, nextStatus: "pending", notes: "" });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
        >
          <View className="flex-1 bg-black/30" />
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-6">
            <Text className="text-[16px] font-extrabold text-gray-900">
              Update report status
            </Text>
            <Text className="text-[13px] text-gray-600 mt-1">
              Next: {formatStatus(logModal.nextStatus)}. Add moderation notes (optional) to log this action.
            </Text>

            <TextInput
              placeholder="Notes for this decision"
              multiline
              value={logModal.notes}
              onChangeText={(t) => setLogModal((prev) => ({ ...prev, notes: t }))}
              className="mt-4 border border-gray-200 rounded-2xl px-4 py-3 text-[14px] text-gray-900"
              placeholderTextColor="#9CA3AF"
              editable={!updatingId}
              style={{ minHeight: 96, textAlignVertical: "top" }}
            />

            <View className="flex-row justify-end mt-4">
              <TouchableOpacity
                onPress={() =>
                  !updatingId &&
                  setLogModal({ visible: false, report: null, nextStatus: "pending", notes: "" })
                }
                className="px-4 py-2 mr-2 rounded-full bg-gray-100"
                disabled={!!updatingId}
              >
                <Text className="text-[14px] font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitModerationLog}
                className="px-5 py-2 rounded-full"
                style={{ backgroundColor: VIOLET, opacity: updatingId ? 0.7 : 1 }}
                disabled={!!updatingId}
                activeOpacity={0.85}
              >
                {updatingId ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-[14px] font-semibold text-white">
                    Log & Mark {formatStatus(logModal.nextStatus)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
