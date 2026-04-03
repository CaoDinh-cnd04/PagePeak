namespace LadiPage.Infrastructure.Services;

public class OnePayOptions
{
    public const string SectionName = "OnePay";

    public bool Enabled { get; set; }
    public string MerchantId { get; set; } = "";
    public string AccessCode { get; set; } = "";
    /// <summary>Mã bảo mật dạng hex (Hash Key) dùng với HMAC-SHA256.</summary>
    public string SecureSecretHex { get; set; } = "";
    public string PaymentUrl { get; set; } = "https://mtf.onepay.vn/paygate/vpcpay.op";
    public string VpcVersion { get; set; } = "2";
    /// <summary>Base URL công khai của API (vd. ngrok tới port 5000) để OnePay redirect GET /api/payments/onepay/return. Để trống thì dùng redirect về frontend + xác nhận qua POST /api/plans/onepay/confirm.</summary>
    public string? CallbackBaseUrl { get; set; }
    public string RedirectPath { get; set; } = "/dashboard/settings?tab=billing&payment=onepay";
    public string? RedirectBaseUrl { get; set; }
}
