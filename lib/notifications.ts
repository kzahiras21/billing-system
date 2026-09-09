// Mock Notification Service

export async function sendInvoiceNotification(phone: string, email: string, invoiceId: string, amount: number) {
  try {
    console.log(`[WA GATEWAY] Sending New Invoice to ${phone}: You have a new bill of Rp ${amount}. Invoice ID: ${invoiceId}`);
    
    // Simulate WA Failure fallback to Email
    // console.log(`[EMAIL GATEWAY] Sending New Invoice to ${email}`);
    
    return true;
  } catch (e) {
    console.error("Failed to send notification", e);
    return false;
  }
}

export async function sendPaymentThanksNotification(phone: string, email: string, invoiceId: string, amount: number) {
  try {
    console.log(`[WA GATEWAY] Sending Thank You to ${phone}: We received your payment of Rp ${amount} for Invoice ${invoiceId}.`);
    return true;
  } catch (e) {
    console.error("Failed to send notification", e);
    return false;
  }
}

export async function sendIsolirNotification(phone: string, email: string) {
  try {
    console.log(`[WA GATEWAY] Sending Isolir Notice to ${phone}: Your internet connection has been temporarily frozen due to overdue payment.`);
    return true;
  } catch (e) {
    console.error("Failed to send notification", e);
    return false;
  }
}
