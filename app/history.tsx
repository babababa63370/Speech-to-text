import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/colors";
import { useTranscriptions, Transcription } from "@/context/TranscriptionContext";

function TranscriptionItem({
  item,
  colors,
  onPress,
  onDelete,
}: {
  item: Transcription;
  colors: typeof Colors.light;
  onPress: () => void;
  onDelete: () => void;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "long" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Transcription",
      "Are you sure you want to delete this transcription?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
    >
      <View style={styles.itemHeader}>
        <View style={[styles.sourceIcon, { backgroundColor: colors.tint + "20" }]}>
          <Feather
            name={item.source === "recording" ? "mic" : "file"}
            size={16}
            color={colors.tint}
          />
        </View>
        <View style={styles.itemMeta}>
          <Text style={[styles.itemSource, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {item.source === "recording" ? "Recording" : item.fileName || "Uploaded File"}
          </Text>
          <Text style={[styles.itemDate, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
      <Text
        style={[styles.itemText, { color: colors.text, fontFamily: "Inter_400Regular" }]}
        numberOfLines={3}
      >
        {item.text}
      </Text>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { transcriptions, deleteTranscription, isLoading } = useTranscriptions();

  const handleItemPress = (id: string) => {
    router.push(`/transcription/${id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteTranscription(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
        No transcriptions yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
        Record audio or upload files to get started
      </Text>
    </View>
  );

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
          History
        </Text>
        <View style={styles.headerButton} />
      </View>

      <FlatList
        data={transcriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TranscriptionItem
            item={item}
            colors={colors}
            onPress={() => handleItemPress(item.id)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          transcriptions.length === 0 && styles.listEmpty,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) },
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  listContent: {
    padding: 20,
  },
  listEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  separator: {
    height: 12,
  },
  item: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  itemMeta: {
    flex: 1,
    gap: 2,
  },
  itemSource: {
    fontSize: 14,
  },
  itemDate: {
    fontSize: 12,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 22,
  },
  emptyContainer: {
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
