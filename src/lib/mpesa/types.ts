/**
 * M-Pesa Daraja API types (STK Push / Lipa Na M-Pesa Online).
 */

export type MpesaEnvironment = 'sandbox' | 'production';

export type MpesaTransactionType = 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackUrl: string;
  environment: MpesaEnvironment;
  baseUrl: string;
  stkMode?: 'paybill' | 'till';
  transactionType?: MpesaTransactionType;
}

export interface StkPushRequest {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
}

export interface StkPushSuccessResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface StkPushErrorResponse {
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export type StkPushApiResponse = StkPushSuccessResponse | StkPushErrorResponse;

export interface OAuthTokenResponse {
  access_token: string;
  expires_in: string;
}

export interface StkCallbackItem {
  Name: string;
  Value?: string | number;
}

export interface StkCallbackBody {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: StkCallbackItem[];
  };
}

export interface StkCallbackPayload {
  Body: {
    stkCallback: StkCallbackBody;
  };
}

export interface ParsedStkCallback {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
  status: PaymentStatus;
}

export interface InitiateStkPushInput {
  amount: number;
  phoneNumber: string;
  description?: string;
  userId?: string | null;
  jobId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface InitiateStkPushResult {
  paymentId: string;
  transactionReference: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  customerMessage: string;
  status: PaymentStatus;
}
