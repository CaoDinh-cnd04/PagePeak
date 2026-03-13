namespace LadiPage.Core.Interfaces;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string fullName, string verificationUrl, CancellationToken cancellationToken = default);
}
