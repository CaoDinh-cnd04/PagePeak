using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

/// <summary>Gửi lead từ trang đích đã xuất bản — không cần đăng nhập.</summary>
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
        Dictionary<string, string>? Data);

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitLeadRequest req, CancellationToken ct)
    {
        if (req.Data == null || req.Data.Count == 0)
            return BadRequest(new { error = "missing_data" });

        var page = await _db.Pages.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == req.PageId, ct);
        if (page == null) return NotFound(new { error = "page_not_found" });
        if (page.WorkspaceId != req.WorkspaceId) return BadRequest(new { error = "workspace_mismatch" });
        if (!string.Equals(page.Status, "published", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "page_not_published" });

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

        if (formEntity?.EmailNotify == true)
            await TryNotifyLeadEmailAsync(req, page.Name, lead.Id, ct);

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

    private async Task TryNotifyLeadEmailAsync(SubmitLeadRequest req, string pageName, long leadId, CancellationToken ct)
    {
        var ownerId = await _db.Workspaces.AsNoTracking()
            .Where(w => w.Id == req.WorkspaceId)
            .Select(w => w.OwnerId)
            .FirstOrDefaultAsync(ct);
        if (ownerId == 0) return;
        var owner = await _db.Users.AsNoTracking()
            .Where(u => u.Id == ownerId)
            .Select(u => new { u.Email, u.FullName })
            .FirstOrDefaultAsync(ct);
        if (owner == null || string.IsNullOrWhiteSpace(owner.Email)) return;

        var title = $"Lead mới — {pageName}";
        var body = $"Trang: {pageName} (ID trang {req.PageId})\nLead ID: {leadId}\n\nDữ liệu gửi:\n{JsonSerializer.Serialize(req.Data, new JsonSerializerOptions { WriteIndented = true })}";
        try
        {
            await _email.SendNotificationEmailAsync(owner.Email, owner.FullName ?? "Chủ workspace", title, body, ct);
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
