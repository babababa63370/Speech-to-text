import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTranscriptions } from "@/context/TranscriptionContext";
import { transcribeAudio } from "@/lib/transcribe";

type RecordingState = "idle" | "recording" | "processing";

async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    return FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
  }
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcribedText, setTranscribedText] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptionRef = useRef<boolean>(false);

  const { addTranscription } = useTranscriptions();

  const pulseScale = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const startPulse = () => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  };

  const stopPulse = () => {
    pulseScale.value = withTiming(1, { duration: 200 });
  };

  const requestPermission = async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    setPermissionGranted(status.granted);
    return status.granted;
  };

  const startRecording = async () => {
    try {
      if (permissionGranted === null || !permissionGranted) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Microphone access is needed to record audio."
          );
          return;
        }
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setRecordingState("recording");
      setRecordingDuration(0);
      setTranscribedText("");
      startPulse();

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const processRecording = useCallback(async (uri: string, duration: number) => {
    try {
      const base64 = await readFileAsBase64(uri);
      
      if (!base64 || base64.length === 0) {
        throw new Error("Recording file is empty. Please try recording again.");
      }

      const text = await transcribeAudio(base64, (progress) => {
        setTranscribedText(progress);
      });

      setTranscribedText(text);

      const transcription = await addTranscription({
        text,
        source: "recording",
        duration,
      });

      setRecordingState("idle");
      pendingTranscriptionRef.current = false;
      
      router.push(`/transcription/${transcription.id}`);
    } catch (error) {
      console.error("Failed to transcribe:", error);
      setRecordingState("idle");
      pendingTranscriptionRef.current = false;
      const message = error instanceof Error ? error.message : "Failed to transcribe audio";
      Alert.alert("Error", message);
    }
  }, [addTranscription]);

  const stopRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      stopPulse();

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      const currentDuration = recordingDuration;
      setRecordingState("processing");
      pendingTranscriptionRef.current = true;

      await audioRecorder.stop();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const uri = audioRecorder.uri;

      if (uri) {
        await processRecording(uri, currentDuration);
      } else {
        throw new Error("No recording URI available. Please try recording again.");
      }
    } catch (error) {
      console.error("Failed to transcribe:", error);
      setRecordingState("idle");
      pendingTranscriptionRef.current = false;
      const message = error instanceof Error ? error.message : "Failed to transcribe audio";
      Alert.alert("Error", message);
    }
  };

  const handleRecordPress = () => {
    if (recordingState === "idle") {
      startRecording();
    } else if (recordingState === "recording") {
      stopRecording();
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file.uri) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRecordingState("processing");
      setTranscribedText("");

      const base64 = await readFileAsBase64(file.uri);

      const text = await transcribeAudio(base64, (progress) => {
        setTranscribedText(progress);
      });

      setTranscribedText(text);

      const transcription = await addTranscription({
        text,
        source: "file",
        fileName: file.name,
      });

      setRecordingState("idle");
      
      router.push(`/transcription/${transcription.id}`);
    } catch (error) {
      console.error("Failed to pick/transcribe file:", error);
      setRecordingState("idle");
      Alert.alert("Error", "Failed to transcribe file");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ["#0F0F1A", "#1A1A2E", "#0F0F1A"] : ["#F8FAFC", "#E0F2FE", "#F8FAFC"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <View style={styles.headerLeft} />
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          VoiceScribe
        </Text>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.push("/history")}
          hitSlop={12}
        >
          <Feather name="clock" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainSection}>
          {recordingState === "processing" ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.processingText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Transcribing...
              </Text>
              {transcribedText ? (
                <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
                  <Text
                    style={[styles.previewText, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    numberOfLines={8}
                  >
                    {transcribedText}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {recordingState === "recording"
                  ? "Listening..."
                  : "Tap to start recording or upload a file"}
              </Text>

              {recordingState === "recording" && (
                <View style={styles.durationContainer}>
                  <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
                  <Text style={[styles.duration, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                    {formatDuration(recordingDuration)}
                  </Text>
                </View>
              )}

              <Animated.View style={[styles.recordButtonOuter, pulseStyle]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.recordButton,
                    {
                      backgroundColor: recordingState === "recording" ? colors.error : colors.tint,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                  onPress={handleRecordPress}
                >
                  <Ionicons
                    name={recordingState === "recording" ? "stop" : "mic"}
                    size={48}
                    color="#FFFFFF"
                  />
                </Pressable>
              </Animated.View>

              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  or
                </Text>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.uploadButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleFilePick}
              >
                <Feather name="upload" size={24} color={colors.tint} />
                <Text style={[styles.uploadText, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                  Upload Audio File
                </Text>
                <Text style={[styles.uploadSubtext, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  MP3, WAV, M4A, WebM
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Powered by AI transcription
        </Text>
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
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    letterSpacing: -0.5,
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
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mainSection: {
    alignItems: "center",
    paddingVertical: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  duration: {
    fontSize: 32,
    letterSpacing: 2,
  },
  recordButtonOuter: {
    marginBottom: 40,
  },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00D9C0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 32,
    gap: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
  },
  uploadButton: {
    width: "100%",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
  },
  uploadSubtext: {
    fontSize: 13,
  },
  processingContainer: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  processingText: {
    fontSize: 18,
  },
  previewCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    marginTop: 16,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 24,
  },
  footer: {
    alignItems: "center",
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
  },
});
