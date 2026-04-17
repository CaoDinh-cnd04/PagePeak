using LadiPage.Api.Models;
using LadiPage.Application.Features.Workspaces;
using LadiPage.Domain.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/workspaces")]
[Authorize]
public class WorkspaceController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public WorkspaceController(
        IMediator mediator,
        IAppDbContext db,
        ICurrentUser currentUser,
        IWorkspaceAccessService workspaceAccess)
    {
        _mediator = mediator;
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var list = await _mediator.Send(new GetWorkspacesQuery(), ct);
        return Ok(list);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var w = await _mediator.Send(new GetWorkspaceByIdQuery(id), ct);
        return w == null ? NotFound() : Ok(w);
    }

    [HttpGet("{id:long}/general-settings")]
    public async Task<IActionResult> GetGeneralSettings(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var uid = _currentUser.UserId.Value;
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(uid, id, ct)) return NotFound();

        var ws = await _db.Workspaces.AsNoTracking().FirstOrDefaultAsync(w => w.Id == id, ct);
        if (ws == null) return NotFound();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == uid, ct);
        if (user == null) return Unauthorized();

        return Ok(new
        {
            accountName = user.FullName,
            storeName = ws.Name,
            storeAddress = ws.StoreAddress,
            storePhone = ws.StorePhone,
            postalCode = ws.PostalCode,
            country = ws.Country,
            province = ws.Province,
            district = ws.District,
            ward = ws.Ward,
            timezone = ws.Timezone,
            currency = ws.StoreCurrency
        });
    }

    [HttpPut("{id:long}/general-settings")]
    public async Task<IActionResult> PutGeneralSettings(long id, [FromBody] WorkspaceGeneralBody? body, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (body == null) return BadRequest(new { error = "body_required" });
        var uid = _currentUser.UserId.Value;
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(uid, id, ct)) return NotFound();

        var ws = await _db.Workspaces.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (ws == null) return NotFound();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == uid, ct);
        if (user == null) return Unauthorized();

        var accountName = body.AccountName.Trim();
        if (accountName.Length > 200) return BadRequest(new { error = "account_name_too_long" });
        user.FullName = accountName;
        user.UpdatedAt = DateTime.UtcNow;

        var storeName = body.StoreName.Trim();
        if (storeName.Length < 1 || storeName.Length > 200) return BadRequest(new { error = "invalid_store_name" });
        ws.Name = storeName;

        static string? EmptyToNull(string t, int max, out bool tooLong)
        {
            tooLong = t.Length > max;
            if (tooLong) return null;
            return t.Length == 0 ? null : t;
        }

        string t;
        bool bad;

        t = body.StoreAddress.Trim();
        ws.StoreAddress = EmptyToNull(t, 500, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "storeAddress" });

        t = body.StorePhone.Trim();
        ws.StorePhone = EmptyToNull(t, 30, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "storePhone" });

        t = body.PostalCode.Trim();
        ws.PostalCode = EmptyToNull(t, 20, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "postalCode" });

        t = body.Country.Trim();
        ws.Country = EmptyToNull(t, 100, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "country" });

        t = body.Province.Trim();
        ws.Province = EmptyToNull(t, 100, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "province" });

        t = body.District.Trim();
        ws.District = EmptyToNull(t, 100, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "district" });

        t = body.Ward.Trim();
        ws.Ward = EmptyToNull(t, 100, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "ward" });

        t = body.Timezone.Trim();
        ws.Timezone = EmptyToNull(t, 100, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "timezone" });

        t = body.Currency.Trim();
        ws.StoreCurrency = EmptyToNull(t, 10, out bad);
        if (bad) return BadRequest(new { error = "field_too_long", field = "currency" });

        ws.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            accountName = user.FullName,
            storeName = ws.Name,
            storeAddress = ws.StoreAddress,
            storePhone = ws.StorePhone,
            postalCode = ws.PostalCode,
            country = ws.Country,
            province = ws.Province,
            district = ws.District,
            ward = ws.Ward,
            timezone = ws.Timezone,
            currency = ws.StoreCurrency
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWorkspaceRequest req, CancellationToken ct)
    {
        try
        {
            var result = await _mediator.Send(new CreateWorkspaceCommand(req.Name, req.Slug), ct);
            return Created($"/api/workspaces/{result.Id}", result);
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Slug"))
        {
            return Conflict(new { error = ex.Message });
        }
        catch (FluentValidation.ValidationException ex)
        {
            return BadRequest(ex.Errors);
        }
    }

    // ─── SMTP Settings ────────────────────────────────────────────────────────

    [HttpGet("{id:long}/smtp")]
    public async Task<IActionResult> GetSmtp(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var uid = _currentUser.UserId.Value;
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(uid, id, ct)) return NotFound();

        var ws = await _db.Workspaces.AsNoTracking().FirstOrDefaultAsync(w => w.Id == id, ct);
        if (ws == null) return NotFound();

        // Lấy email của chủ workspace để hiển thị là "email nhận mặc định"
        var ownerEmail = await _db.Users.AsNoTracking()
            .Where(u => u.Id == ws.OwnerId)
            .Select(u => u.Email)
            .FirstOrDefaultAsync(ct);

        SmtpSettingsBody? cfg = null;
        if (!string.IsNullOrWhiteSpace(ws.SmtpConfigJson))
        {
            try { cfg = System.Text.Json.JsonSerializer.Deserialize<SmtpSettingsBody>(ws.SmtpConfigJson); }
            catch { /* ignore */ }
        }

        return Ok(new
        {
            ownerEmail = ownerEmail ?? "",
            smtp = cfg ?? new SmtpSettingsBody { Enabled = false, Host = "smtp.gmail.com", Port = 587, UseSsl = true }
        });
    }

    [HttpPut("{id:long}/smtp")]
    public async Task<IActionResult> PutSmtp(long id, [FromBody] SmtpSettingsBody? body, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (body == null) return BadRequest(new { error = "body_required" });
        var uid = _currentUser.UserId.Value;
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(uid, id, ct)) return NotFound();

        var ws = await _db.Workspaces.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (ws == null) return NotFound();

        // Mask password: nếu frontend gửi placeholder "••••••••" thì giữ nguyên password cũ
        if (body.Password == "••••••••" || body.Password == "********")
        {
            SmtpSettingsBody? existing = null;
            if (!string.IsNullOrWhiteSpace(ws.SmtpConfigJson))
                try { existing = System.Text.Json.JsonSerializer.Deserialize<SmtpSettingsBody>(ws.SmtpConfigJson); }
                catch { /* ignore */ }
            body = body with { Password = existing?.Password ?? "" };
        }

        ws.SmtpConfigJson = System.Text.Json.JsonSerializer.Serialize(body);
        ws.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new { ok = true });
    }

    [HttpPost("{id:long}/smtp/test")]
    public async Task<IActionResult> TestSmtp(long id, [FromBody] SmtpSettingsBody? body, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (body == null || string.IsNullOrWhiteSpace(body.Username) || string.IsNullOrWhiteSpace(body.Password))
            return BadRequest(new { error = "credentials_required" });
        var uid = _currentUser.UserId.Value;
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(uid, id, ct)) return NotFound();

        // Lấy email của user hiện tại để gửi test
        var userEmail = await _db.Users.AsNoTracking()
            .Where(u => u.Id == uid)
            .Select(u => u.Email)
            .FirstOrDefaultAsync(ct);
        if (string.IsNullOrWhiteSpace(userEmail)) return BadRequest(new { error = "no_user_email" });

        var emailSvc = HttpContext.RequestServices.GetRequiredService<LadiPage.Domain.Interfaces.IEmailService>();
        var smtp = new LadiPage.Domain.Interfaces.SmtpOverride(
            body.Host ?? "smtp.gmail.com",
            body.Port > 0 ? body.Port : 587,
            body.Username,
            body.Password,
            body.FromEmail ?? body.Username,
            body.FromName ?? "PagePeak",
            body.UseSsl
        );

        try
        {
            await emailSvc.SendNotificationEmailAsync(
                userEmail, "Admin",
                "Test SMTP — PagePeak",
                $"Email kiểm tra kết nối SMTP từ PagePeak.<br/>Cấu hình: {body.Host}:{body.Port}<br/>Gửi từ: {body.FromEmail ?? body.Username}",
                ct, smtp);
            return Ok(new { ok = true, sentTo = userEmail });
        }
        catch (System.Net.Mail.SmtpException ex)
        {
            // Cung cấp thông báo lỗi chi tiết và thân thiện
            var friendly = ex.StatusCode switch
            {
                System.Net.Mail.SmtpStatusCode.MustIssueStartTlsFirst => "Server yêu cầu StartTLS — bật SSL và dùng port 587.",
                System.Net.Mail.SmtpStatusCode.MailboxUnavailable => "Hộp thư không khả dụng hoặc địa chỉ email không tồn tại.",
                _ when ex.Message.Contains("5.7.0") || ex.Message.Contains("Authentication") || ex.Message.Contains("535")
                    => body.Host?.Contains("gmail") == true
                        ? "Xác thực Gmail thất bại. Gmail yêu cầu App Password (không dùng mật khẩu thông thường). Vào myaccount.google.com → Bảo mật → Mật khẩu ứng dụng để tạo."
                        : "Xác thực thất bại — kiểm tra lại username và mật khẩu.",
                _ => ex.Message
            };
            return Ok(new { ok = false, error = friendly });
        }
        catch (Exception ex)
        {
            return Ok(new { ok = false, error = ex.Message });
        }
    }
}

public record SmtpSettingsBody
{
    [System.Text.Json.Serialization.JsonPropertyName("enabled")] public bool Enabled { get; init; }
    [System.Text.Json.Serialization.JsonPropertyName("host")] public string? Host { get; init; }
    [System.Text.Json.Serialization.JsonPropertyName("port")] public int Port { get; init; }
    [System.Text.Json.Serialization.JsonPropertyName("username")] public string? Username { get; init; }
    [System.Text.Json.Serialization.JsonPropertyName("password")] public string? Password { get; init; }
    [System.Text.Json.Serialization.JsonPropertyName("fromEmail")] public string? FromEmail { get; init; }
    [System.Text.Json.Serialization.JsonPropertyName("fromName")] public string? FromName { get; init; }
    [System.Text.Json.Serialization.JsonPropertyName("useSsl")] public bool UseSsl { get; init; } = true;
}
