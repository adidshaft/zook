import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

const products = [
  ["Water Bottle", "₹399", "24 left"],
  ["Protein Shake", "₹149", "18 left"],
  ["Shaker", "₹299", "8 left"]
];

export default function Shop() {
  return (
    <Screen title="Shop">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card>
          <Pill tone="lime">Pay online · pickup at gym</Pill>
          <Text style={styles.title} selectable>
            Pickup code: IH-PICK-101
          </Text>
          <Text style={styles.body} selectable>
            Mock checkout confirms the order before stock moves.
          </Text>
        </Card>
        {products.map(([name, price, stock]) => (
          <Card key={name}>
            <View style={styles.row}>
              <View>
                <Text style={styles.title} selectable>
                  {name}
                </Text>
                <Text style={styles.body} selectable>
                  {price} · {stock}
                </Text>
              </View>
              <PrimaryButton>Buy</PrimaryButton>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 8 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }
});
