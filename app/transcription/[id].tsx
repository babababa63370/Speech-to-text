import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Share,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useTranscriptions } from "@/context/TranscriptionContext";

export default function TranscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { getTranscription, deleteTranscription } = useTranscriptions();
  const transcription = getTranscription(id || "");

  if (!transcription) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Transcription not found
        </Text>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(transcription.text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Text copied to clipboard");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: transcription.text,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Transcription",
      "Are you sure you want to delete this transcription?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTranscription(transcription.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

  const wordCount = transcription.text.split(/\s+/).filter(Boolean).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ["#0F0F1A", "#1A1A2E", "#0F0F1A"] : ["#F8FAFC", "#E0F2FE", "#F8FAFC"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          Transcription
        </Text>
        <Pressable
          style={styles.headerButton}
          onPress={handleDelete}
          hitSlop={12}
        >
          <Feather name="trash-2" size={22} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.metaCard, { backgroundColor: colors.card }]}>
          <View style={styles.metaRow}>
            <View style={[styles.sourceIcon, { backgroundColor: colors.tint + "20" }]}>
              <Feather
                name={transcription.source === "recording" ? "mic" : "file"}
                size={18}
                color={colors.tint}
              />
            </View>
            <View style={styles.metaInfo}>
              <Text style={[styles.metaTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {transcription.source === "recording"
                  ? "Voice Recording"
                  : transcription.fileName || "Uploaded File"}
              </Text>
              <Text style={[styles.metaDate, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {formatDate(transcription.createdAt)}
              </Text>
            </View>
          </View>

          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {wordCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                words
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {transcription.text.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                characters
              </Text>
            </View>
            {transcription.duration ? (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                    {formatDuration(transcription.duration)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    duration
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>

        <View style={[styles.textCard, { backgroundColor: colors.card }]}>
          <Text
            style={[styles.transcriptionText, { color: colors.text, fontFamily: "Inter_400Regular" }]}
            selectable
          >
            {transcription.text}
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleCopy}
        >
          <Feather name="copy" size={20} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
            Copy
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonPrimary,
            { backgroundColor: colors.tint, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleShare}
        >
          <Feather name="share" size={20} color="#FFFFFF" />
          <Text style={[styles.actionText, { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" }]}>
            Share
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  metaCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  metaInfo: {
    flex: 1,
    gap: 4,
  },
  metaTitle: {
    fontSize: 16,
  },
  metaDate: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    padding: 16,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
  },
  textCard: {
    borderRadius: 16,
    padding: 20,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 28,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimary: {
    flex: 1.5,
  },
  actionText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
  },
});
