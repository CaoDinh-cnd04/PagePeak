using System.Security.Claims;
using System.Text;
using LadiPage.Api.Models;
using LadiPage.Application.Features.Auth;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using LadiPage.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using FluentValidation;
using MediatR;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IAuthService _authService;
    private readonly ICurrentUser _currentUser;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpFactory;

    public AuthController(
        IMediator mediator,
        IAuthService authService,
        ICurrentUser currentUser,
        AppDbContext db,
        IConfiguration config,
        IHttpClientFactory httpFactory)
    {
        _mediator = mediator;
        _authService = authService;
        _currentUser = currentUser;
        _db = db;
        _config = config;
        _httpFactory = httpFactory;
    }

    [HttpGet("google")]
    [AllowAnonymous]
    public IActionResult Google([FromQuery] string? redirectUrl)
    {
        var frontendBaseUrl = _config["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var redirectUri = string.IsNullOrEmpty(redirectUrl) ? "/api/auth/external-done" : $"/api/auth/external-done?redirectUrl={Uri.EscapeDataString(redirectUrl)}";
        var props = new Microsoft.AspNetCore.Authentication.AuthenticationProperties { RedirectUri = redirectUri };
        return Challenge(props, [GoogleDefaults.AuthenticationScheme]);
    }

    [HttpGet("facebook")]
    [AllowAnonymous]
    public IActionResult Facebook([FromQuery] string? redirectUrl)
    {
        var redirectUri = string.IsNullOrEmpty(redirectUrl) ? "/api/auth/external-done" : $"/api/auth/external-done?redirectUrl={Uri.EscapeDataString(redirectUrl)}";
        var props = new Microsoft.AspNetCore.Authentication.AuthenticationProperties { RedirectUri = redirectUri };
        return Challenge(props, [FacebookDefaults.AuthenticationScheme]);
    }

    [HttpGet("external-done")]
    [AllowAnonymous]
    public async Task<IActionResult> ExternalDone([FromQuery] string? redirectUrl, CancellationToken ct)
    {
        var frontendBaseUrl = _config["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var redirectUri = string.IsNullOrEmpty(redirectUrl) ? "/api/auth/external-done" : $"/api/auth/external-done?redirectUrl={Uri.EscapeDataString(redirectUrl ?? "")}";
        var jwtSecret = _config["JwtSettings:Secret"] ?? throw new InvalidOperationException("JwtSettings:Secret is required.");
        var externalRegIssuer = _config["JwtSettings:Issuer"] ?? "LadiPageApi";
        var externalRegAudience = _config["JwtSettings:Audience"] ?? "LadiPageClient";

        var result = await HttpContext.AuthenticateAsync("ExternalCookie");
        if (!result.Succeeded || result.Principal == null)
            return Redirect($"{frontendBaseUrl}/login?error=external_signin_failed");

        var provider = result.Properties?.Items.TryGetValue(".AuthScheme", out var scheme) == true ? scheme : null;
        var email = result.Principal.FindFirstValue(ClaimTypes.Email)
            ?? result.Principal.FindFirstValue("email")
            ?? result.Principal.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress");
        var name = result.Principal.FindFirstValue(ClaimTypes.Name)
            ?? result.Principal.FindFirstValue("name")
            ?? email?.Split('@')[0] ?? "User";

        if (string.IsNullOrEmpty(email))
            return Redirect($"{frontendBaseUrl}/login?error=no_email");

        var exists = await _db.Users.AsNoTracking().AnyAsync(u => u.Email == email, ct);
        if (exists)
        {
            var tokens = await _authService.LoginOrRegisterExternalAsync(
                email, name,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                HttpContext.Request.Headers.UserAgent);
            if (tokens == null)
                return Redirect($"{frontendBaseUrl}/login?error=account_disabled");

            await HttpContext.SignOutAsync("ExternalCookie");
            var callbackUrl = $"{frontendBaseUrl.TrimEnd('/')}/auth/callback"
                + $"?accessToken={Uri.EscapeDataString(tokens.AccessToken)}"
                + $"&refreshToken={Uri.EscapeDataString(tokens.RefreshToken)}"
                + $"&expiresAt={Uri.EscapeDataString(tokens.ExpiresAt.ToString("O"))}";
            return Redirect(callbackUrl);
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;
        var extRegToken = tokenHandler.WriteToken(new JwtSecurityToken(
            issuer: externalRegIssuer,
            audience: externalRegAudience,
            claims: new[] { new Claim("typ", "external_reg"), new Claim("email", email), new Claim("name", name), new Claim("provider", provider ?? "external") },
            notBefore: now,
            expires: now.AddMinutes(10),
            signingCredentials: creds));

        await HttpContext.SignOutAsync("ExternalCookie");
        var regUrl = $"{frontendBaseUrl.TrimEnd('/')}/auth/external-register?token={Uri.EscapeDataString(extRegToken)}";
        return Redirect(regUrl);
    }

    [HttpPost("external-register")]
    [AllowAnonymous]
    public async Task<IActionResult> ExternalRegister([FromBody] ExternalRegisterRequest req, CancellationToken ct)
    {
        var jwtSecret = _config["JwtSettings:Secret"] ?? throw new InvalidOperationException("JwtSettings:Secret is required.");
        var externalRegIssuer = _config["JwtSettings:Issuer"] ?? "LadiPageApi";
        var externalRegAudience = _config["JwtSettings:Audience"] ?? "LadiPageClient";

        try
        {
            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(req.Token, new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = true,
                ValidIssuer = externalRegIssuer,
                ValidateAudience = true,
                ValidAudience = externalRegAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(10)
            }, out _);

            if (principal.FindFirstValue("typ") != "external_reg")
                return BadRequest(new { error = "Invalid token type." });

            var email = principal.FindFirstValue("email") ?? principal.FindFirstValue(ClaimTypes.Email)
                ?? principal.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress");
            var name = principal.FindFirstValue("name") ?? principal.FindFirstValue(ClaimTypes.Name)
                ?? principal.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")
                ?? email?.Split('@')[0] ?? "User";
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { error = "Missing email." });

            var existing = await _db.Users.AsNoTracking().AnyAsync(u => u.Email == email, ct);
            var tokens = await _authService.LoginOrRegisterExternalAsync(email, name);
            if (tokens == null)
                return BadRequest(new { error = "Account disabled." });

            if (!existing)
            {
                var user = await _db.Users.FirstAsync<User>(u => u.Email == email, ct);
                if (!string.IsNullOrWhiteSpace(req.Phone)) user.Phone = req.Phone.Trim();
                user.UpdatedAt = DateTime.UtcNow;
                var ws = await _db.Workspaces.FirstOrDefaultAsync<Workspace>(w => w.OwnerId == user.Id && w.IsDefault, ct);
                if (ws != null && !string.IsNullOrWhiteSpace(req.WorkspaceName))
                {
                    ws.Name = req.WorkspaceName.Trim();
                    ws.UpdatedAt = DateTime.UtcNow;
                }
                await _db.SaveChangesAsync(ct);
            }
            return Ok(tokens);
        }
        catch (Exception)
        {
            return BadRequest(new { error = "Token hết hạn hoặc không hợp lệ." });
        }
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        try
        {
            var recaptchaSecret = _config["Recaptcha:SecretKey"];
            if (!string.IsNullOrEmpty(recaptchaSecret) && !string.IsNullOrEmpty(req.RecaptchaToken))
            {
                using var client = _httpFactory.CreateClient();
                var verify = await client.PostAsync(
                    "https://www.google.com/recaptcha/api/siteverify",
                    new FormUrlEncodedContent(new[] { new KeyValuePair<string?, string?>("secret", recaptchaSecret), new KeyValuePair<string?, string?>("response", req.RecaptchaToken) }), ct);
                var json = await verify.Content.ReadFromJsonAsync<RecaptchaResponse>(ct);
                if (json?.Success != true)
                    return BadRequest(new { error = "Xác thực reCAPTCHA không thành công." });
            }
            var result = await _mediator.Send(new RegisterCommand(req.Email, req.Password, req.FullName, req.Phone, req.RecaptchaToken), ct);
            return Ok(new { result.UserId, result.EmailVerificationRequired, message = "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản." });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already registered"))
        {
            return Conflict(new { error = ex.Message });
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Errors);
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        try
        {
            var cmd = new LoginCommand(req.Email, req.Password,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                HttpContext.Request.Headers.UserAgent);
            var result = await _mediator.Send(cmd, ct);
            if (result == null) return Unauthorized();
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message == "EMAIL_NOT_VERIFIED")
        {
            return StatusCode(403, new { error = "EMAIL_NOT_VERIFIED", message = "Email chưa được xác thực. Vui lòng kiểm tra hộp thư." });
        }
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest req, CancellationToken ct)
    {
        var result = await _mediator.Send(new RefreshTokenCommand(req.RefreshToken), ct);
        return result == null ? Unauthorized() : Ok(result);
    }

    [HttpPost("revoke")]
    [Authorize]
    public async Task<IActionResult> Revoke([FromBody] RevokeTokenRequest req, CancellationToken ct)
    {
        var ok = await _mediator.Send(new RevokeTokenCommand(req.RefreshToken), ct);
        return ok ? Ok() : NotFound();
    }

    [HttpGet("verify-email")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token, CancellationToken ct)
    {
        var ok = await _authService.VerifyEmailAsync(token);
        return !ok ? BadRequest(new { error = "Token không hợp lệ hoặc đã hết hạn." }) : Ok(new { ok = true, message = "Email đã được xác thực thành công!" });
    }

    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest req, CancellationToken ct)
    {
        var ok = await _authService.ResendVerificationEmailAsync(req.Email);
        return Ok(new { ok, message = ok ? "Email xác thực đã được gửi lại." : "Email không tồn tại hoặc đã được xác thực." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetProfileQuery(), ct);
        return result == null ? Unauthorized() : Ok(result);
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var user = await _db.Users.FindAsync([_currentUser.UserId.Value], ct);
        if (user == null) return Unauthorized();
        if (!string.IsNullOrWhiteSpace(req.FullName)) user.FullName = req.FullName.Trim();
        if (req.Phone != null) user.Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim();
        if (req.AvatarUrl != null) user.AvatarUrl = string.IsNullOrWhiteSpace(req.AvatarUrl) ? null : req.AvatarUrl.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = user.Id, email = user.Email, fullName = user.FullName, phone = user.Phone, avatarUrl = user.AvatarUrl, role = user.Role, currentPlanId = user.CurrentPlanId, planExpiresAt = user.PlanExpiresAt });
    }

    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var user = await _db.Users.FindAsync([_currentUser.UserId.Value], ct);
        if (user == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(req?.CurrentPassword))
            return BadRequest(new { error = "Vui lòng nhập mật khẩu hiện tại." });
        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            return BadRequest(new { error = "Mật khẩu hiện tại không đúng." });
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
            return BadRequest(new { error = "Mật khẩu mới phải có ít nhất 6 ký tự." });
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    [HttpGet("sessions")]
    [Authorize]
    public async Task<IActionResult> GetSessions(CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var sessions = await _db.Sessions
            .Where(s => s.UserId == _currentUser.UserId.Value)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new { id = s.Id, ipAddress = s.IpAddress, userAgent = s.UserAgent, createdAt = s.CreatedAt, expiresAt = s.ExpiresAt, isExpired = s.ExpiresAt < DateTime.UtcNow })
            .ToListAsync(ct);
        return Ok(sessions);
    }

    [HttpDelete("sessions/{id:long}")]
    [Authorize]
    public async Task<IActionResult> RevokeSession(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var session = await _db.Sessions.FirstOrDefaultAsync<Session>(s => s.Id == id && s.UserId == _currentUser.UserId.Value, ct);
        if (session == null) return NotFound();
        _db.Sessions.Remove(session);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
