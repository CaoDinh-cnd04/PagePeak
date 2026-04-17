using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

/// <summary>DTO cho workspace SMTP settings JSON.</summary>
public record WorkspaceSmtpDto
{
    [JsonPropertyName("enabled")] public bool Enabled { get; init; }
    [JsonPropertyName("host")] public string? Host { get; init; }
    [JsonPropertyName("port")] public int Port { get; init; }
    [JsonPropertyName("username")] public string? Username { get; init; }
    [JsonPropertyName("password")] public string? Password { get; init; }
    [JsonPropertyName("fromEmail")] public string? FromEmail { get; init; }
    [JsonPropertyName("fromName")] public string? FromName { get; init; }
    [JsonPropertyName("useSsl")] public bool UseSsl { get; init; } = true;
}

/// <summary>Gửi lead từ trang đích — hỗ trợ cả draft (preview) và published.</summary>
[ApiController]
[Route("api/public/leads")]
[AllowAnonymous]
public class PublicLeadController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IEmailService _email;
    private readonly IConfiguration _config;

    public PublicLeadController(
        IAppDbContext db,
        IHttpClientFactory httpFactory,
        IEmailService email,
        IConfiguration config)
    {
        _db = db;
        _httpFactory = httpFactory;
        _email = email;
        _config = config;
    }

    public record SubmitLeadRequest(
        long PageId,
        long WorkspaceId,
        long? FormId,
        string? ElementId,
        string? RecaptchaToken,
        Dictionary<string, string>? Data,
        // Per-element email settings (set from page HTML data-attributes)
        bool? EmailNotifyEnabled,
        string? EmailNotifyRecipient,
        bool? SendConfirmationEmail);

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitLeadRequest req, CancellationToken ct)
    {
        if (req.Data == null || req.Data.Count == 0)
            return BadRequest(new { error = "missing_data" });

        var page = await _db.Pages.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == req.PageId, ct);
        if (page == null) return NotFound(new { error = "page_not_found" });
        if (page.WorkspaceId != req.WorkspaceId) return BadRequest(new { error = "workspace_mismatch" });
        // Cho phép cả draft/preview (để test form trước khi publish)

        var recaptchaResult = await VerifyRecaptchaIfRequiredAsync(req.RecaptchaToken, ct);
        if (recaptchaResult != null) return recaptchaResult;

        FormConfig? formEntity = null;
        if (req.FormId.HasValue)
        {
            formEntity = await _db.FormConfigs.AsNoTracking()
                .FirstOrDefaultAsync(f => f.Id == req.FormId.Value && f.WorkspaceId == req.WorkspaceId, ct);
            if (formEntity == null) return BadRequest(new { error = "form_not_found" });
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var lead = new Lead
        {
            WorkspaceId = req.WorkspaceId,
            PageId = req.PageId,
            FormId = req.FormId,
            DataJson = JsonSerializer.Serialize(req.Data),
            IpAddress = ip,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Leads.Add(lead);
        await _db.SaveChangesAsync(ct);

        if (formEntity?.WebhookUrl is { Length: > 0 } webhookUrl)
            await TryPostWebhookAsync(webhookUrl, req, lead.Id, ct);

        // Lấy workspace SMTP config (nếu có) để dùng cho email
        var smtpOverride = await GetWorkspaceSmtpAsync(req.WorkspaceId, ct);

        // Notify admin: FormConfig.EmailNotify OR per-element emailNotifyEnabled flag
        bool shouldNotifyAdmin = formEntity?.EmailNotify == true || req.EmailNotifyEnabled == true;
        if (shouldNotifyAdmin)
        {
            // Use per-element recipient if provided, otherwise fall back to workspace owner
            string? explicitRecipient = req.EmailNotifyEnabled == true && !string.IsNullOrWhiteSpace(req.EmailNotifyRecipient)
                ? req.EmailNotifyRecipient!.Trim()
                : null;
            await TryNotifyLeadEmailAsync(req, page.Name, lead.Id, explicitRecipient, smtpOverride, ct);
        }

        // Send confirmation email to the form submitter (if they provided an email field)
        if (req.SendConfirmationEmail == true)
            await TrySendConfirmationEmailAsync(req, page.Name, smtpOverride, ct);

        return Ok(new { ok = true, id = lead.Id });
    }

    private async Task<IActionResult?> VerifyRecaptchaIfRequiredAsync(string? token, CancellationToken ct)
    {
        var secret = _config["Recaptcha:SecretKey"];
        if (string.IsNullOrEmpty(secret)) return null;
        if (string.IsNullOrEmpty(token))
            return BadRequest(new { error = "recaptcha_required" });

        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            using var resp = await client.PostAsync(
                "https://www.google.com/recaptcha/api/siteverify",
                new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string?, string?>("secret", secret),
                    new KeyValuePair<string?, string?>("response", token),
                }), ct);
            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var root = doc.RootElement;
            if (!root.TryGetProperty("success", out var okEl) || !okEl.GetBoolean())
                return BadRequest(new { error = "recaptcha_failed" });
            if (root.TryGetProperty("score", out var scoreEl))
            {
                var minScore = double.Parse(_config["Recaptcha:MinScore"] ?? "0.5", CultureInfo.InvariantCulture);
                if (scoreEl.GetDouble() < minScore)
                    return BadRequest(new { error = "recaptcha_low_score" });
            }
        }
        catch
        {
            return BadRequest(new { error = "recaptcha_failed" });
        }

        return null;
    }

    /// <summary>Đọc workspace SMTP config và tạo SmtpOverride nếu có.</summary>
    private async Task<SmtpOverride?> GetWorkspaceSmtpAsync(long workspaceId, CancellationToken ct)
    {
        var smtpJson = await _db.Workspaces.AsNoTracking()
            .Where(w => w.Id == workspaceId)
            .Select(w => w.SmtpConfigJson)
            .FirstOrDefaultAsync(ct);
        if (string.IsNullOrWhiteSpace(smtpJson)) return null;
        try
        {
            var cfg = JsonSerializer.Deserialize<WorkspaceSmtpDto>(smtpJson);
            if (cfg == null || !cfg.Enabled || string.IsNullOrEmpty(cfg.Username) || string.IsNullOrEmpty(cfg.Password))
                return null;
            return new SmtpOverride(
                cfg.Host ?? "smtp.gmail.com",
                cfg.Port > 0 ? cfg.Port : 587,
                cfg.Username,
                cfg.Password,
                cfg.FromEmail ?? cfg.Username,
                cfg.FromName ?? "PagePeak",
                cfg.UseSsl
            );
        }
        catch { return null; }
    }

    private async Task TryNotifyLeadEmailAsync(SubmitLeadRequest req, string pageName, long leadId, string? explicitRecipient, SmtpOverride? smtp, CancellationToken ct)
    {
        string toEmail;
        string toName;

        if (!string.IsNullOrWhiteSpace(explicitRecipient))
        {
            toEmail = explicitRecipient;
            toName = "Admin";
        }
        else
        {
            // Mặc định gửi về email của chủ workspace (tài khoản đã đăng nhập tạo page)
            var ws = await _db.Workspaces.AsNoTracking()
                .Where(w => w.Id == req.WorkspaceId)
                .Select(w => new { w.OwnerId })
                .FirstOrDefaultAsync(ct);
            if (ws == null || ws.OwnerId == 0) return;
            var owner = await _db.Users.AsNoTracking()
                .Where(u => u.Id == ws.OwnerId)
                .Select(u => new { u.Email, u.FullName })
                .FirstOrDefaultAsync(ct);
            if (owner == null || string.IsNullOrWhiteSpace(owner.Email)) return;
            toEmail = owner.Email;
            toName = owner.FullName ?? "Chủ workspace";
        }

        var dataLines = req.Data != null
            ? string.Join("<br/>", req.Data.Select(kv => $"<strong>{kv.Key}:</strong> {kv.Value}"))
            : "(không có dữ liệu)";
        var title = $"Form mới từ trang \"{pageName}\"";
        var body = $"Bạn vừa nhận được một form mới từ trang: <strong>{pageName}</strong><br/><br/>"
                 + $"Lead ID: {leadId}<br/><br/>"
                 + $"Thông tin khách hàng:<br/>{dataLines}<br/><br/>"
                 + $"Thời gian: {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC";
        try
        {
            await _email.SendNotificationEmailAsync(toEmail, toName, title, body, ct, smtp);
        }
        catch
        {
            /* Giữ lead dù gửi mail lỗi */
        }
    }

    private async Task TrySendConfirmationEmailAsync(SubmitLeadRequest req, string pageName, SmtpOverride? smtp, CancellationToken ct)
    {
        if (req.Data == null) return;

        // Tìm trường email trong dữ liệu form
        string? submitterEmail = null;
        foreach (var key in new[] { "email", "Email", "EMAIL", "mail", "e-mail" })
        {
            if (req.Data.TryGetValue(key, out var val) && !string.IsNullOrWhiteSpace(val))
            {
                submitterEmail = val.Trim();
                break;
            }
        }
        // Tìm theo partial match nếu không tìm được chính xác
        if (string.IsNullOrWhiteSpace(submitterEmail))
        {
            foreach (var kv in req.Data)
            {
                if (kv.Key.Contains("email", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(kv.Value))
                {
                    submitterEmail = kv.Value.Trim();
                    break;
                }
            }
        }
        if (string.IsNullOrWhiteSpace(submitterEmail)) return;

        // Tìm tên người gửi
        string submitterName = "Bạn";
        foreach (var key in new[] { "name", "Name", "ho_ten", "fullname", "full_name", "họ_và_tên", "Họ và tên", "Họ_và_tên" })
        {
            if (req.Data.TryGetValue(key, out var val) && !string.IsNullOrWhiteSpace(val))
            {
                submitterName = val.Trim();
                break;
            }
        }
        if (submitterName == "Bạn")
        {
            foreach (var kv in req.Data)
            {
                if ((kv.Key.Contains("name", StringComparison.OrdinalIgnoreCase) || kv.Key.Contains("ten", StringComparison.OrdinalIgnoreCase))
                    && !string.IsNullOrWhiteSpace(kv.Value))
                {
                    submitterName = kv.Value.Trim();
                    break;
                }
            }
        }

        var title = $"Xác nhận đã nhận form — {pageName}";
        var body = $"Chào {submitterName},<br/><br/>"
                 + $"Chúng tôi đã nhận được thông tin của bạn từ trang <strong>\"{pageName}\"</strong>.<br/><br/>"
                 + $"Chúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất.<br/><br/>"
                 + $"Trân trọng.";
        try
        {
            await _email.SendNotificationEmailAsync(submitterEmail, submitterName, title, body, ct, smtp);
        }
        catch
        {
            /* Giữ lead dù gửi mail lỗi */
        }
    }

    private async Task TryPostWebhookAsync(string url, SubmitLeadRequest req, long leadId, CancellationToken ct)
    {
        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);
            var payload = new
            {
                leadId,
                pageId = req.PageId,
                workspaceId = req.WorkspaceId,
                formId = req.FormId,
                elementId = req.ElementId,
                data = req.Data,
            };
            await client.PostAsJsonAsync(url, payload, ct);
        }
        catch
        {
            /* Webhook lỗi không làm mất lead đã lưu */
        }
    }
}
