using System.Net;
using System.Net.Mail;
using LadiPage.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LadiPage.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string toEmail, string fullName, string verificationUrl, CancellationToken cancellationToken = default)
    {
        var smtpHost = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_config["Email:SmtpPort"] ?? "587");
        var smtpUser = _config["Email:SmtpUser"] ?? "";
        var smtpPass = _config["Email:SmtpPass"] ?? "";
        var fromName = _config["Email:FromName"] ?? "PagePeak";
        var fromEmail = _config["Email:FromEmail"] ?? smtpUser;

        if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
        {
            _logger.LogWarning("SMTP credentials not configured. Skipping email to {Email}. Verification URL: {Url}", toEmail, verificationUrl);
            return;
        }

        var subject = "Xác thực email tài khoản PagePeak";

        var body = $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">PagePeak</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Nền tảng tạo Landing Page chuyên nghiệp</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">Xin chào {fullName}! 👋</h2>
                    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                      Cảm ơn bạn đã đăng ký tài khoản PagePeak. Để hoàn tất quá trình tạo tài khoản, vui lòng xác thực email bằng cách nhấn nút bên dưới:
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                      <tr><td align="center" style="background:#4f46e5;border-radius:12px;">
                        <a href="{verificationUrl}" style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                          ✅ Xác thực email ngay
                        </a>
                      </td></tr>
                    </table>
                    <p style="margin:0 0 16px;color:#94a3b8;font-size:13px;line-height:1.5;">
                      Hoặc copy đường link sau vào trình duyệt:
                    </p>
                    <p style="margin:0 0 24px;padding:12px 16px;background:#f1f5f9;border-radius:8px;word-break:break-all;font-size:12px;color:#4f46e5;">
                      {verificationUrl}
                    </p>
                    <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:8px;">
                      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                        ⏰ Link xác thực có hiệu lực trong <strong>24 giờ</strong>.<br/>
                        Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;color:#94a3b8;font-size:12px;">
                      © {DateTime.UtcNow.Year} PagePeak. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPass),
            EnableSsl = true,
        };

        var msg = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true,
        };
        msg.To.Add(new MailAddress(toEmail, fullName));

        try
        {
            await client.SendMailAsync(msg, cancellationToken);
            _logger.LogInformation("Verification email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", toEmail);
            throw;
        }
    }

    public async Task SendNotificationEmailAsync(string toEmail, string fullName, string title, string message, CancellationToken cancellationToken = default, LadiPage.Domain.Interfaces.SmtpOverride? smtpOverride = null)
    {
        // Ưu tiên workspace SMTP nếu được truyền vào, nếu không dùng global config
        var smtpHost  = smtpOverride?.Host     ?? _config["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort  = smtpOverride?.Port     ?? int.Parse(_config["Email:SmtpPort"] ?? "587");
        var smtpUser  = smtpOverride?.Username ?? _config["Email:SmtpUser"] ?? "";
        var smtpPass  = smtpOverride?.Password ?? _config["Email:SmtpPass"] ?? "";
        var fromName  = smtpOverride?.FromName  ?? _config["Email:FromName"] ?? "PagePeak";
        var fromEmail = smtpOverride?.FromEmail ?? _config["Email:FromEmail"] ?? smtpUser;
        var useSsl    = smtpOverride?.UseSsl   ?? true;

        if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
        {
            _logger.LogWarning("SMTP credentials not configured. Skipping notification email to {Email}", toEmail);
            return;
        }

        var subject = $"[PagePeak] {title}";

        var body = $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">PagePeak</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Thông báo mới</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;font-weight:700;">Xin chào {fullName}!</h2>
                    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">{message}</p>
                    <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:16px;">
                      <p style="margin:0;color:#94a3b8;font-size:12px;">© {DateTime.UtcNow.Year} PagePeak</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPass),
            EnableSsl = useSsl,
        };

        var msg = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true,
        };
        msg.To.Add(new MailAddress(toEmail, fullName));

        try
        {
            await client.SendMailAsync(msg, cancellationToken);
            _logger.LogInformation("Notification email sent to {Email}: {Title}", toEmail, title);
        }
        catch (System.Net.Mail.SmtpException ex)
        {
            var hint = ex.Message.Contains("5.7.0") || ex.Message.Contains("Authentication") || ex.Message.Contains("535")
                ? " [Gmail hint: Use App Password, not regular password — myaccount.google.com/apppasswords]"
                : "";
            _logger.LogError(ex, "Failed to send notification email to {Email}{Hint}", toEmail, hint);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification email to {Email}", toEmail);
            throw;
        }
    }
}
