# Provider Integrations

All paid or external services are abstracted and mocked by default.

## Payment

`PaymentProvider`:

- `createCheckoutSession()`
- `verifyWebhook()`
- `getPaymentStatus()`
- `refundPayment()`
- `createMandate()`
- `cancelMandate()`

Mock sessions live under `/checkout/mock/{sessionId}`. Future provider modules can map Razorpay, Cashfree, PhonePe, PayU, UPI AutoPay, cards, or mandates into the same interface.

## Maps

`MapProvider`:

- `resolveGoogleMapsLink()`
- `searchPlaces()`
- `geocodeAddress()`
- `reverseGeocode()`

The mock provider returns deterministic Indian city coordinates and stores original map URLs. The UI falls back to list and map-placeholder panels when no SDK/API key exists.

## AI

`AIProvider`:

- `generateText()`
- `generateStructuredPlan()`
- `generateImage()`
- `classifyScope()`
- `classifySafety()`

OpenAI can be enabled backend-side only with `OPENAI_API_KEY`, after quotas and guardrails run.

## Push

`PushProvider` records mock delivery and is Expo/FCM/APNs-ready.

## Storage

`StorageProvider` supports local upload metadata and S3/R2-compatible future signed URLs.
