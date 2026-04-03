using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using LadiPage.Domain.Interfaces;
using Microsoft.Extensions.Options;

namespace LadiPage.Infrastructure.Services;

/// <summary>OnePay VPC: HMAC-SHA256 trên chuỗi key=value&… đã sắp xếp theo tên tham số (không gồm vpc_SecureHash, bỏ qua giá trị rỗng).</summary>
public sealed class OnePayPaymentService : IOnePayPaymentService
{
    private readonly OnePayOptions _opt;

    public OnePayPaymentService(IOptions<OnePayOptions> options) => _opt = options.Value;

    public string BuildPaymentRedirectUrl(long amountVnd, string merchTxnRef, string orderInfo, string returnUrl)
    {
        if (amountVnd <= 0)
            throw new ArgumentOutOfRangeException(nameof(amountVnd));
        if (string.IsNullOrWhiteSpace(merchTxnRef))
            throw new ArgumentException("merchTxnRef required", nameof(merchTxnRef));
        if (string.IsNullOrWhiteSpace(returnUrl))
            throw new ArgumentException("returnUrl required", nameof(returnUrl));

        var amountMinor = checked((long)(amountVnd * 100L));
        var fields = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["vpc_AccessCode"] = _opt.AccessCode.Trim(),
            ["vpc_Amount"] = amountMinor.ToString(CultureInfo.InvariantCulture),
            ["vpc_Command"] = "pay",
            ["vpc_Currency"] = "VND",
            ["vpc_Locale"] = "vn",
            ["vpc_MerchTxnRef"] = merchTxnRef.Trim(),
            ["vpc_Merchant"] = _opt.MerchantId.Trim(),
            ["vpc_OrderInfo"] = orderInfo.Trim(),
            ["vpc_ReturnURL"] = returnUrl.Trim(),
            ["vpc_Version"] = string.IsNullOrWhiteSpace(_opt.VpcVersion) ? "2" : _opt.VpcVersion.Trim(),
        };

        var hash = ComputeSecureHash(fields);
        fields["vpc_SecureHash"] = hash;

        var ordered = fields.OrderBy(kv => kv.Key, StringComparer.Ordinal);
        var qs = string.Join(
            "&",
            ordered.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
        var baseUrl = _opt.PaymentUrl.Trim();
        return baseUrl.Contains('?', StringComparison.Ordinal) ? $"{baseUrl}&{qs}" : $"{baseUrl}?{qs}";
    }

    public bool TryVerifySecureHash(IReadOnlyDictionary<string, string> queryFields, out string? error)
    {
        error = null;
        if (queryFields == null || queryFields.Count == 0)
        {
            error = "Thiếu tham số OnePay.";
            return false;
        }

        string? received = null;
        foreach (var kv in queryFields)
        {
            if (string.Equals(kv.Key, "vpc_SecureHash", StringComparison.OrdinalIgnoreCase))
                received = kv.Value;
        }

        if (string.IsNullOrWhiteSpace(received))
        {
            error = "Thiếu vpc_SecureHash.";
            return false;
        }

        var forHash = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var kv in queryFields)
        {
            if (string.Equals(kv.Key, "vpc_SecureHash", StringComparison.OrdinalIgnoreCase))
                continue;
            if (string.IsNullOrEmpty(kv.Value))
                continue;
            if (!kv.Key.StartsWith("vpc_", StringComparison.OrdinalIgnoreCase))
                continue;
            forHash[kv.Key] = kv.Value;
        }

        var expected = ComputeSecureHash(forHash);
        var a = received.Trim();
        var b = expected;
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(a.ToUpperInvariant()),
                Encoding.UTF8.GetBytes(b.ToUpperInvariant())))
        {
            error = "Chữ ký OnePay không hợp lệ.";
            return false;
        }

        return true;
    }

    private string ComputeSecureHash(IReadOnlyDictionary<string, string> fields)
    {
        var sorted = fields
            .Where(kv => !string.Equals(kv.Key, "vpc_SecureHash", StringComparison.OrdinalIgnoreCase))
            .Where(kv => !string.IsNullOrEmpty(kv.Value))
            .OrderBy(kv => kv.Key, StringComparer.Ordinal)
            .ToList();

        var hashData = string.Join("&", sorted.Select(kv => $"{kv.Key}={kv.Value}"));
        var keyBytes = Convert.FromHexString(_opt.SecureSecretHex.Trim());
        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(hashData));
        return Convert.ToHexString(hash).ToUpperInvariant();
    }
}
