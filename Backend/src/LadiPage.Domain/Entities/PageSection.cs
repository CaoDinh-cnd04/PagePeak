namespace LadiPage.Domain.Entities;

public class PageSection
{
    public long Id { get; set; }
    public long PageId { get; set; }
    public int Order { get; set; }
    public string? Name { get; set; }
    public string? BackgroundColor { get; set; }
    public string? BackgroundImageUrl { get; set; }
    public int? Height { get; set; }
    public bool IsVisible { get; set; } = true;
    public bool IsLocked { get; set; }
    public string? CustomClass { get; set; }

    public Page Page { get; set; } = null!;
    public ICollection<PageElement> Elements { get; set; } = new List<PageElement>();
}
