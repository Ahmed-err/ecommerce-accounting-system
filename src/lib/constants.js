/** VAT applied at checkout on (subtotal − coupon discount). Align with invoice copy. */
export const CHECKOUT_TAX_RATE = 0.14;

/** Admin inventory table — keep in sync with server fetch limit. */
export const INVENTORY_PAGE_SIZE = 20;

export const SUDAN_CITIES = [
  { name: "Khartoum - Center", arName: "الخرطوم - المركز", rate: 1500 },
  { name: "Khartoum - East", arName: "الخرطوم - شرق (بري/اركويت)", rate: 2000 },
  { name: "Khartoum - South", arName: "الخرطوم - جنوب", rate: 2500 },
  { name: "Omdurman - Center", arName: "أم درمان - المركز", rate: 2000 },
  { name: "Omdurman - North", arName: "أم درمان - شمال", rate: 2500 },
  { name: "Bahri - Center", arName: "بحري - المركز", rate: 2000 },
  { name: "Bahri - East", arName: "بحري - شرق", rate: 2500 },
  { name: "Sharg Al-Neel", arName: "شرق النيل", rate: 3000 },
  { name: "Atbara", arName: "عطبرة", rate: 5000 },
  { name: "Port Sudan", arName: "بورتسودان", rate: 7000 },
  { name: "Wad Madani", arName: "واد مدني", rate: 4500 },
  { name: "Other States", arName: "الولايات الأخرى", rate: 8000 },
];

export const PAYMENT_METHODS = [
  { 
    id: "CASH_ON_DELIVERY", 
    enName: "Cash on Delivery", 
    arName: "الدفع عند الاستلام", 
    enDesc: "Pay when you receive your order.", 
    arDesc: "ادفع عند استلام طلبك." 
  },
  { 
    id: "BANK_TRANSFER", 
    enName: "Bank Transfer (MBOK)", 
    arName: "تحويل بنكي (بنكك)", 
    enDesc: "Transfer to our Bank of Khartoum account.", 
    arDesc: "التحويل إلى حسابنا في بنك الخرطوم." 
  },
];

export const STORE_BANK_DETAILS = {
  bankName: "Bank of Khartoum (MBOK)",
  arBankName: "بنك الخرطوم (بنكك)",
  accountNumber: "1234567",
  accountName: "Essam El-Din Nasr Electrical Tools",
  arAccountName: "أعمال عصام الدين نصر للأدوات الكهربائية",
};

// WhatsApp E.164 (country code without plus sign)
export const STORE_WHATSAPP_NUMBER = "249916941346";

export const STORE_VAT_NUMBER = process.env.STORE_VAT_NUMBER || "310123456700003";
