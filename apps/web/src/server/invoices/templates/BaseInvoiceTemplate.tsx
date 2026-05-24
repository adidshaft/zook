import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoicePdfData } from "./types";

function money(paise: number, currency = "INR") {
  return `${currency} ${(paise / 100).toFixed(2)}`;
}

function date(value: Date) {
  return value.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingBottom: 18,
    marginBottom: 18,
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "right",
  },
  muted: {
    color: "#6B7280",
  },
  blocks: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 20,
  },
  block: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  blockTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 6,
  },
  name: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    minHeight: 28,
    alignItems: "center",
  },
  head: {
    backgroundColor: "#F3F4F6",
    fontWeight: 700,
  },
  cell: {
    padding: 8,
  },
  desc: {
    width: "46%",
  },
  qty: {
    width: "10%",
    textAlign: "right",
  },
  amount: {
    width: "22%",
    textAlign: "right",
  },
  totals: {
    marginTop: 16,
    marginLeft: "55%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: "#111827",
    paddingTop: 8,
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    marginTop: 28,
    color: "#6B7280",
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
});

export function BaseInvoiceTemplate({ invoice }: { invoice: InvoicePdfData }) {
  return (
    <Document
      title={`${invoice.title} ${invoice.invoiceNumber}`}
      author="Zook"
      creator="Zook"
      producer="Zook"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>ZOOK</Text>
            <Text style={styles.muted}>Gym OS invoices</Text>
          </View>
          <View>
            <Text style={styles.title}>{invoice.title}</Text>
            <Text style={styles.muted}>No. {invoice.invoiceNumber}</Text>
            <Text style={styles.muted}>Issued {date(invoice.issueDate)}</Text>
          </View>
        </View>

        <View style={styles.blocks}>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Seller</Text>
            <Text style={styles.name}>{invoice.seller.name}</Text>
            <Text>{invoice.seller.address}</Text>
            <Text>GSTIN: {invoice.seller.gstin || "Not GST registered"}</Text>
            {invoice.seller.email ? <Text>Email: {invoice.seller.email}</Text> : null}
            {invoice.seller.phone ? <Text>Phone: {invoice.seller.phone}</Text> : null}
          </View>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Buyer</Text>
            <Text style={styles.name}>{invoice.buyer.name}</Text>
            {invoice.buyer.address ? <Text>{invoice.buyer.address}</Text> : null}
            <Text>GSTIN: {invoice.buyer.gstin || "Not GST registered"}</Text>
            {invoice.buyer.phone ? <Text>Phone: {invoice.buyer.phone}</Text> : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.head]}>
            <Text style={[styles.cell, styles.desc]}>Item</Text>
            <Text style={[styles.cell, styles.qty]}>Qty</Text>
            <Text style={[styles.cell, styles.amount]}>Subtotal</Text>
            <Text style={[styles.cell, styles.amount]}>GST</Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            <View key={`${item.description}-${index}`} style={styles.row}>
              <Text style={[styles.cell, styles.desc]}>{item.description}</Text>
              <Text style={[styles.cell, styles.qty]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.amount]}>
                {money(item.subtotalPaise, invoice.currency)}
              </Text>
              <Text style={[styles.cell, styles.amount]}>
                {money(item.gstPaise, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(invoice.subtotalPaise, invoice.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>GST</Text>
            <Text>{money(invoice.gstPaise, invoice.currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{money(invoice.totalPaise, invoice.currency)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {invoice.footer ??
            "This document was generated by Zook. Please contact the seller for tax or payment corrections."}
        </Text>
      </Page>
    </Document>
  );
}
