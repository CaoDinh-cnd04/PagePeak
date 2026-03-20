namespace LadiPage.Domain.Entities;

public class ToolItem
{
    public long Id { get; set; }
    public long CategoryId { get; set; }
    public string Name { get; set; } = "";
    public string Icon { get; set; } = "";
    public string ElementType { get; set; } = "";
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public bool HasSubTabs { get; set; }
    public string? SubTabsJson { get; set; }
    public ToolCategory Category { get; set; } = null!;
    public ICollection<ElementPreset> Presets { get; set; } = new List<ElementPreset>();
}
