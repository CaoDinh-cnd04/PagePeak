namespace LadiPage.Core.Entities;

public class Page
{
    public long Id { get; set; }
    public long WorkspaceId { get; set; }
    public long? CreatorId { get; set; }
    public long? TemplateId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string PageType { get; set; } = "trangdich";
    public string Status { get; set; } = "draft";
    public string JsonContent { get; set; } = "{}";
    public string? HtmlContent { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? MetaKeywords { get; set; }
    public string? Favicon { get; set; }
    public string? PagePassword { get; set; }
    public byte? SeoScore { get; set; }
    public bool MobileFriendly { get; set; } = true;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Workspace Workspace { get; set; } = null!;
    public ICollection<PageSection> Sections { get; set; } = new List<PageSection>();
}
