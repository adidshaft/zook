import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, PrimaryButton, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScan, setLastScan] = useState("No scan yet");

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
                onBarcodeScanned={(event) => setLastScan(event.data)}
              />
            </View>
          )}
        </Card>
        <Card>
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
  token: { color: colors.lime, marginTop: 8, lineHeight: 20 }
});
