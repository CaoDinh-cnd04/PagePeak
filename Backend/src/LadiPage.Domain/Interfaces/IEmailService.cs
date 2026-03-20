namespace LadiPage.Domain.Interfaces;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string fullName, string verificationUrl, CancellationToken cancellationToken = default);
    Task SendNotificationEmailAsync(string toEmail, string fullName, string title, string message, CancellationToken cancellationToken = default);
}
