using LadiPage.Core.Auth;
using LadiPage.Core.Entities;
using LadiPage.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IAppDbContext _db;
    private readonly JwtService _jwt;
    private readonly IDateTime _dateTime;
    private readonly IEmailService _emailService;
    private readonly string _frontendUrl;

    public AuthService(IAppDbContext db, JwtService jwt, IDateTime dateTime, IEmailService emailService, Microsoft.Extensions.Configuration.IConfiguration config)
    {
        _db = db;
        _jwt = jwt;
        _dateTime = dateTime;
        _emailService = emailService;
        _frontendUrl = config["Frontend:BaseUrl"] ?? "http://localhost:3000";
    }

    private static string NewReferralCode()
        => Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();

    private async Task<string> GenerateUniqueReferralCodeAsync(CancellationToken cancellationToken)
    {
        // DB đang có UNIQUE constraint trên MaGioiThieu và có thể chỉ cho phép 1 NULL (tùy ANSI_NULLS khi tạo index),
        // nên luôn sinh mã giới thiệu để tránh lỗi duplicate (<NULL>).
        for (var i = 0; i < 10; i++)
        {
            var code = NewReferralCode();
            var exists = await _db.Users.AsNoTracking().AnyAsync(u => u.ReferralCode == code, cancellationToken);
            if (!exists) return code;
        }
        // fallback cực hiếm
        return $"{NewReferralCode()}{DateTime.UtcNow.Ticks % 1000}";
    }

    public async Task<AuthTokenResult?> LoginAsync(string email, string password, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user == null || user.Status != "hoatdong")
            return null;
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        var refreshToken = _jwt.GenerateRefreshToken();
        var expiresAt = _jwt.GetRefreshTokenExpiresAt();
        var accessToken = _jwt.GenerateAccessToken(user);
        var session = new Session
        {
            UserId = user.Id,
            Token = accessToken,
            RefreshToken = refreshToken,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            ExpiresAt = expiresAt,
            CreatedAt = _dateTime.UtcNow
        };
        _db.Sessions.Add(session);

        user.LastLoginAt = _dateTime.UtcNow;
        user.UpdatedAt = _dateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return new AuthTokenResult(
            session.Token,
            refreshToken,
            expiresAt
        );
    }

    public async Task<long?> RegisterAsync(string email, string password, string fullName, string? phone = null, CancellationToken cancellationToken = default)
    {
        if (await _db.Users.AsNoTracking().AnyAsync(u => u.Email == email, cancellationToken))
            return null;

        var verificationToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        var freePlan = await _db.Plans.AsNoTracking().FirstOrDefaultAsync(p => p.Code == "free", cancellationToken);
        var user = new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            FullName = fullName,
            Phone = phone,
            Role = "nguoidung",
            Status = "hoatdong",
            EmailConfirmed = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationSentAt = _dateTime.UtcNow,
            PhoneConfirmed = false,
            CurrentPlanId = freePlan?.Id,
            ReferralCode = await GenerateUniqueReferralCodeAsync(cancellationToken),
            CreatedAt = _dateTime.UtcNow,
            UpdatedAt = _dateTime.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        var workspace = new Workspace
        {
            OwnerId = user.Id,
            Name = "Workspace của tôi",
            Slug = $"ws-{user.Id}",
            PlanId = freePlan?.Id,
            IsDefault = true,
            CreatedAt = _dateTime.UtcNow,
            UpdatedAt = _dateTime.UtcNow
        };
        _db.Workspaces.Add(workspace);
        await _db.SaveChangesAsync(cancellationToken);

        _db.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = user.Id,
            Role = "chusohuu",
            InvitedByUserId = null,
            JoinedAt = _dateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);

        var verifyUrl = $"{_frontendUrl}/verify-email?token={verificationToken}";
        _ = Task.Run(async () =>
        {
            try { await _emailService.SendVerificationEmailAsync(email, fullName, verifyUrl, CancellationToken.None); }
            catch { /* logged inside EmailService */ }
        });

        _db.Notifications.Add(new Notification
        {
            UserId = user.Id,
            Title = "Chào mừng đến PagePeak!",
            Message = "Bạn đã đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản và bắt đầu sử dụng.",
            Type = "success",
            IsRead = false,
            CreatedAt = _dateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);

        _ = Task.Run(async () =>
        {
            try { await _emailService.SendNotificationEmailAsync(email, fullName, "Chào mừng đến PagePeak!", "Bạn đã đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản và bắt đầu sử dụng.", CancellationToken.None); }
            catch { /* logged inside EmailService */ }
        });

        return user.Id;
    }

    public async Task<bool> VerifyEmailAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token, cancellationToken);
        if (user == null) return false;

        if (user.EmailConfirmed) return true;

        if (user.EmailVerificationSentAt.HasValue &&
            (_dateTime.UtcNow - user.EmailVerificationSentAt.Value).TotalHours > 24)
            return false;

        user.EmailConfirmed = true;
        user.EmailVerificationToken = null;
        user.UpdatedAt = _dateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ResendVerificationEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user == null || user.EmailConfirmed) return false;

        var newToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        user.EmailVerificationToken = newToken;
        user.EmailVerificationSentAt = _dateTime.UtcNow;
        user.UpdatedAt = _dateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        var verifyUrl = $"{_frontendUrl}/verify-email?token={newToken}";
        _ = Task.Run(async () =>
        {
            try { await _emailService.SendVerificationEmailAsync(email, user.FullName, verifyUrl, CancellationToken.None); }
            catch { /* logged inside EmailService */ }
        });

        return true;
    }

    public async Task<AuthTokenResult?> LoginOrRegisterExternalAsync(string email, string fullName, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user == null)
        {
            var freePlan = await _db.Plans.AsNoTracking().FirstOrDefaultAsync(p => p.Code == "free", cancellationToken);
            user = new User
            {
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                FullName = fullName,
                Role = "nguoidung",
                Status = "hoatdong",
                EmailConfirmed = true,
                PhoneConfirmed = false,
                CurrentPlanId = freePlan?.Id,
                ReferralCode = await GenerateUniqueReferralCodeAsync(cancellationToken),
                CreatedAt = _dateTime.UtcNow,
                UpdatedAt = _dateTime.UtcNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(cancellationToken);

            var workspace = new Workspace
            {
                OwnerId = user.Id,
                Name = "Workspace của tôi",
                Slug = $"ws-{user.Id}",
                PlanId = freePlan?.Id,
                IsDefault = true,
                CreatedAt = _dateTime.UtcNow,
                UpdatedAt = _dateTime.UtcNow
            };
            _db.Workspaces.Add(workspace);
            await _db.SaveChangesAsync(cancellationToken);

            _db.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = workspace.Id,
                UserId = user.Id,
                Role = "chusohuu",
                InvitedByUserId = null,
                JoinedAt = _dateTime.UtcNow
            });
            await _db.SaveChangesAsync(cancellationToken);
        }
        if (user.Status != "hoatdong")
            return null;

        var refreshToken = _jwt.GenerateRefreshToken();
        var expiresAt = _jwt.GetRefreshTokenExpiresAt();
        var accessToken = _jwt.GenerateAccessToken(user);
        var session = new Session
        {
            UserId = user.Id,
            Token = accessToken,
            RefreshToken = refreshToken,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            ExpiresAt = expiresAt,
            CreatedAt = _dateTime.UtcNow
        };
        _db.Sessions.Add(session);
        user.LastLoginAt = _dateTime.UtcNow;
        user.UpdatedAt = _dateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return new AuthTokenResult(accessToken, refreshToken, expiresAt);
    }

    public async Task<AuthTokenResult?> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var session = await _db.Sessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.RefreshToken == refreshToken && s.ExpiresAt > _dateTime.UtcNow, cancellationToken);
        if (session == null)
            return null;
        var user = session.User;
        if (user.Status != "hoatdong")
            return null;

        var newRefreshToken = _jwt.GenerateRefreshToken();
        var expiresAt = _jwt.GetRefreshTokenExpiresAt();
        var newAccessToken = _jwt.GenerateAccessToken(user);

        _db.Sessions.Remove(session);
        _db.Sessions.Add(new Session
        {
            UserId = user.Id,
            Token = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresAt = expiresAt,
            CreatedAt = _dateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);

        return new AuthTokenResult(newAccessToken, newRefreshToken, expiresAt);
    }

    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var session = await _db.Sessions.FirstOrDefaultAsync(s => s.RefreshToken == refreshToken, cancellationToken);
        if (session == null)
            return false;
        _db.Sessions.Remove(session);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
