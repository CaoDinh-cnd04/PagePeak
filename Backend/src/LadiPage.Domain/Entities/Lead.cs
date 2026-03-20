namespace LadiPage.Domain.Entities;

public class Lead
{
    public long Id { get; set; }
    public long WorkspaceId { get; set; }
    public long? PageId { get; set; }
    public long? FormId { get; set; }
    public string DataJson { get; set; } = "{}";
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }

    public Workspace Workspace { get; set; } = null!;
    public Page? Page { get; set; }
    public FormConfig? Form { get; set; }
}
