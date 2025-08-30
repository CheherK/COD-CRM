### Order Status Flow

**1. Initial Order Creation**

* **PENDING**: Order is fetched from the sheet.

  * **PENDING** → Submitted by the user through the Shopify form.
  * **ABANDONED** → User left without submitting the order.
* **CONFIRMED**: After calling the client and the order is confirmed.
* **DELETED**: Marked as duplicate or fake order.
* **REJECTED**: Client rejects the order (reason for rejection is noted).

⚠️ In some cases, orders are created directly in the CRM and set as **CONFIRMED** immediately.

---

**2. Delivery Process**

* **CONFIRMED → UPLOADED**:

  * When a delivery agency is selected and the order is successfully created on the delivery platform.
  * At this point, the order is still in our inventory and not yet taken by the agency.

* **UPLOADED → DEPOSIT**:

  * When the delivery agency picks up the order and moves it to their inventory (status fetched from agency).

* **DEPOSIT → IN\_TRANSIT**:

  * When the order delivery starts (status fetched from agency).

* **IN\_TRANSIT → DELIVERED**:

  * Delivery successfully completed by the agency (status fetched from agency).

* **IN\_TRANSIT → RETURNED**:

  * Delivery failed and order returned (status fetched from agency).

---

**3. Attempts**

* At any stage (typically from **PENDING → CONFIRMED**), if the client does not respond:

  * **ATTEMPT\_1 → ATTEMPT\_2 → ATTEMPT\_3 …**
  * These represent our internal call attempts before confirming the order.
  * This process is internal and **not part of the delivery agency flow**.

---

**4. Archiving**

* Any order can be marked as **ARCHIVED** from the order edit screen.
