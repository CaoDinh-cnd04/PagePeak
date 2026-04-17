namespace LadiPage.Domain.Interfaces;

/// <summary>Cấu hình SMTP tuỳ chỉnh theo workspace (override appsettings).</summary>
public record SmtpOverride(string Host, int Port, string Username, string Password, string FromEmail, string FromName, bool UseSsl = true);

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string fullName, string verificationUrl, CancellationToken cancellationToken = default);
    Task SendNotificationEmailAsync(string toEmail, string fullName, string title, string message, CancellationToken cancellationToken = default, SmtpOverride? smtpOverride = null);
}
