# POS Application Security Specification

## 1. Data Invariants
1. **Authenticated Access**: All write operations require an authenticated user (`request.auth != null`).
2. **Super Admin Isolation**: Critical collections (`settings`, `userAccounts`, `stockPurchases`, and direct `products` price/creation) can only be modified by authorized Super Admins (`affan.yusuf192@guru.smp.belajar.id` or designated admin role).
3. **Transaction Immutability**: Once written, a sales transaction cannot have its receipt number, cashier ID, or totals altered. Transactions can only be deleted or viewed by authorized roles.
4. **Product Stock Integrity**: Cashiers can update stock counts during sales transactions, but cannot change product cost price or retail price unless authenticated as Super Admin.
5. **ID Poisoning Guard**: All document IDs must conform to `^[a-zA-Z0-9_\-]+$` and be <= 128 characters.
6. **Bounded Payloads**: All string fields have explicit length limits (`<= 5000` or relevant limits) and array items are bounded to prevent Denial of Wallet.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Ghost Field Injection in Product**: A payload with `{"isFree": true}` injected into a product creation attempt. Must be rejected.
2. **Unauthenticated Write**: An unauthenticated request attempting to create a transaction. Must be rejected.
3. **Price Tampering by Cashier**: A cashier attempting to update `price` or `costPrice` of a product without Super Admin privilege. Must be rejected.
4. **Huge ID Poisoning**: Creating a product or transaction with a 2,000-character ID. Must be rejected by `isValidId`.
5. **Negative Amount in Stock Purchase**: Creating a stock purchase with negative nominal amount or non-number type. Must be rejected.
6. **Self-Escalation to Super Admin**: An ordinary user account payload attempting to set `role: "super_admin"` without admin verification. Must be rejected.
7. **Negative Price in Product**: Product payload with negative price or negative stock. Must be rejected.
8. **Oversized String Payload in Settings**: Setting `storeName` to a 50,000-character string (Denial of Wallet). Must be rejected.
9. **Transaction Total Tampering**: A transaction payload where subtotal or total is non-numeric or malformed. Must be rejected.
10. **Shadow Role Update**: Patching a user document's `role` field via an unprivileged update request. Must be rejected.
11. **Spoofed Admin Email**: A request with unverified email or spoofed auth claiming admin access. Must be rejected.
12. **Malicious Delete**: An unauthenticated user attempting to delete transactions or products. Must be rejected.

## 3. Test Runner Specification
The test suite verifies that each of these 12 malicious payloads fails with `PERMISSION_DENIED` under Firestore security rules.
