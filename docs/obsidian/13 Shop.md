# Shop

The shop module supports products, inventory, member orders, backend checkout, pickup codes, receptionist fulfillment, and audit trail.

## Member Flow

1. Member opens shop.
2. Member adds product to cart.
3. Backend creates shop order and checkout session.
4. Payment confirmation marks order ready for pickup.
5. Pickup code is shown.
6. Reception verifies and fulfills.

## Owner/Admin Flow

- Manage products.
- Upload product photos.
- Track branch stock.
- Review low-stock alerts.
- Review orders.

## Reception Flow

- View pending pickup orders.
- Verify pickup code.
- Fulfill order.

## Routes

- `/dashboard/shop`
- `/dashboard/shop/orders`
- `/desk/orders`
- Mobile `/shop`, `/shop/cart`, `/shop/checkout`, `/shop/pickup/[orderId]`

## Safety Rules

- Shop orders are not activated by client redirect alone.
- Pickup code is generated after paid state.
- Fulfillment is audited.

