import { CameraView, useCameraPermissions } from "expo-camera";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, PrimaryButton, Screen } from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [lastScan, setLastScan] = useState("No scan yet");
  const [manualToken, setManualToken] = useState("");
  const [statusMessage, setStatusMessage] = useState("Scan a live QR token or paste one in development.");
  const [submitting, setSubmitting] = useState(false);

  async function submitScan(qrPayload: string) {
    if (!token || !qrPayload || submitting) {
      return;
    }
    setSubmitting(true);
    setLastScan(qrPayload);
    try {
      const result = await mobileApiFetch<{
        status: string;
        duplicate?: boolean;
        suspiciousFlags?: string[];
      }>("/attendance/scan", {
        method: "POST",
        token,
        body: { qrPayload }
      });
      if (result.duplicate) {
        setStatusMessage("You are already checked in for today. Re-entry did not create another attendance record.");
      } else if (result.status === "APPROVED") {
        setStatusMessage("Checked in successfully.");
      } else if (result.status === "PENDING_APPROVAL") {
        setStatusMessage("Scan submitted. Reception can review it in the approval queue.");
      } else {
        setStatusMessage(`Scan result: ${result.status}`);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] })
      ]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to validate the QR token.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen title="Scan QR">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <Text style={styles.title} selectable>
            Attendance scanner
          </Text>
          <Text style={styles.body} selectable>
            Rolling signed QR tokens are validated by the backend. Profile photo and membership checks run before approval.
          </Text>
          {!permission?.granted ? (
            <PrimaryButton onPress={requestPermission}>Allow camera</PrimaryButton>
          ) : (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={(event) => void submitScan(event.data)}
              />
            </View>
          )}
        </Card>
        <Card>
          <Text style={styles.body} selectable>
            Manual token entry
          </Text>
          <TextInput
            placeholder="Paste QR token for simulator / development"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={manualToken}
            onChangeText={setManualToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <PrimaryButton onPress={() => void submitScan(manualToken)}>
            {submitting ? "Validating..." : "Submit token"}
          </PrimaryButton>
        </Card>
        <Card>
          <Text style={styles.body} selectable>
            Scan result
          </Text>
          <Text style={styles.status} selectable>
            {statusMessage}
          </Text>
          <Text style={styles.body} selectable>
            Last token
          </Text>
          <Text style={styles.token} selectable>
            {lastScan}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  hero: { gap: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
  body: { color: colors.muted, lineHeight: 20 },
  cameraWrap: { height: 340, borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  camera: { flex: 1 },
  input: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  status: { color: colors.text, marginTop: 8, lineHeight: 20 },
  token: { color: colors.lime, marginTop: 8, lineHeight: 20 }
});
