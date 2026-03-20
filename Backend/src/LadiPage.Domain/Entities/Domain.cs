namespace LadiPage.Domain.Entities;

public class CustomDomain
{
    public long Id { get; set; }
    public long WorkspaceId { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public Workspace Workspace { get; set; } = null!;
}
