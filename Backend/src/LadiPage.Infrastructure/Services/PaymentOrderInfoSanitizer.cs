using System.Text;
using System.Text.RegularExpressions;

namespace LadiPage.Infrastructure.Services;

/// <summary>Chuẩn hóa mô tả đơn (vpc_OrderInfo OnePay / cổng khác): plain text, không dấu gạt/em dash, tránh &amp;=.</summary>
public static class PaymentOrderInfoSanitizer
{
    public const int MaxLength = 255;

    /// <summary>Bo ky tu dieu khien, dau ngat, tat ca dang gach (Unicode Pd), &amp; =; gom khoang trang.</summary>
    public static string Sanitize(string? input, string fallback = "Thanh toan PagePeak")
    {
        if (string.IsNullOrWhiteSpace(input))
            return fallback;

        var s = input.Trim();
        s = s.Replace('\u2014', ' ').Replace('\u2013', ' ').Replace('\u2012', ' ');
        s = Regex.Replace(s, @"\p{Pd}", " ");
        s = Regex.Replace(s, @"[&=]", " ");
        s = Regex.Replace(s, @"[\x00-\x08\x0B\x0C\x0E-\x1F]", "");
        s = Regex.Replace(s, @"\s+", " ").Trim();
        if (s.Length == 0)
            return fallback;
        if (s.Length > MaxLength)
            s = s[..MaxLength];
        return s;
    }

    /// <summary>Chi chu cai Latin, so, khoang trang (plain text an toan cho cong thanh toan).</summary>
    public static string ToPlainLatin(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (var c in s)
        {
            if (c is >= 'a' and <= 'z' or >= 'A' and <= 'Z' or >= '0' and <= '9')
                sb.Append(c);
            else if (char.IsWhiteSpace(c))
                sb.Append(' ');
        }
        var t = Regex.Replace(sb.ToString(), @"\s+", " ").Trim();
        return t.Length > 0 ? t : "PagePeak";
    }

    /// <summary>orderInfo co dinh: thanh toan goi {code} PagePeak (plain Latin).</summary>
    public static string ForPlanPayment(string planCode, string? planNameFallback)
    {
        var key = string.IsNullOrWhiteSpace(planCode) ? planNameFallback : planCode;
        var segment = ToPlainLatin(Sanitize(key, "goi"));
        return ToPlainLatin(Sanitize($"Thanh toan goi {segment} PagePeak", "Thanh toan PagePeak"));
    }
}
