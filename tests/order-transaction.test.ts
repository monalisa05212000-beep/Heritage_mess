import { describe, expect, it } from "vitest";

import { ORDER_TRANSACTION_OPTIONS } from "../src/lib/domain/order-transaction";

describe("order transaction lifecycle", () => {
  it("allows the complete remote order workflow to finish before expiry", () => {
    expect(ORDER_TRANSACTION_OPTIONS).toEqual({
      isolationLevel: "Serializable",
      maxWait: 10_000,
      timeout: 15_000,
    });
  });
});
