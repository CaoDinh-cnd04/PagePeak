namespace LadiPage.Core.Entities;

public class Session
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
