-- P3.6: a purchase that was received or paid is cancelled (stock and money reversed), not deleted.
ALTER TYPE "PurchaseDeliveryStatus" ADD VALUE 'CANCELLED';
