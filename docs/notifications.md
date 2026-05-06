# Notifications

## WhatsApp Transactional Foundation

`WHATSAPP_PROVIDER` supports:

- `disabled` default: no WhatsApp delivery.
- `mock`: local in-memory delivery for development and tests.
- `twilio`: live Twilio WhatsApp delivery.

Twilio mode requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM`.
Production must use `twilio` or `disabled`; `mock` is rejected by runtime validation.

Users opt in through `POST /api/push/whatsapp-register` and opt out through
`POST /api/push/whatsapp-unregister`. Devices are persisted as `WhatsAppDevice` rows with
the normalized E.164 phone number.

Canonical transactional topics for WhatsApp fanout are:

- `PAYMENT`
- `ATTENDANCE`
- `MEMBERSHIP`

Templates must be pre-approved in Twilio/Meta before live delivery. Use template names that match
the topic and action, for example `payment_receipt`, `attendance_check_in`, and
`membership_activation`.
