namespace LadiPage.Domain.Entities;

public class FormConfig
{
    public long Id { get; set; }
    public long WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FieldsJson { get; set; } = "[]";
    public string? WebhookUrl { get; set; }
    public bool EmailNotify { get; set; }
    public DateTime CreatedAt { get; set; }

    public Workspace Workspace { get; set; } = null!;
}
