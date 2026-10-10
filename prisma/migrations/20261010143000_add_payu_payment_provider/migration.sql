-- Preserve existing Cashfree/Razorpay values while making PayU the default.
ALTER TABLE `Payment`
  MODIFY `provider` ENUM('RAZORPAY', 'CASHFREE', 'PAYU') NOT NULL DEFAULT 'PAYU';

CREATE INDEX `Payment_providerOrderId_idx` ON `Payment`(`providerOrderId`);
