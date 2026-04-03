namespace LadiPage.Domain.Interfaces;

public interface IOnePayPaymentService
{
    /// <summary>Tạo URL redirect tới cổng OnePay VPC (đã ký vpc_SecureHash).</summary>
    string BuildPaymentRedirectUrl(long amountVnd, string merchTxnRef, string orderInfo, string returnUrl);

    /// <summary>Kiểm tra chữ ký vpc_SecureHash trên query callback (request hoặc digital receipt).</summary>
    bool TryVerifySecureHash(IReadOnlyDictionary<string, string> queryFields, out string? error);
}
