namespace LadiPage.Domain.Entities;

public class ElementPreset
{
    public long Id { get; set; }
    public long ToolItemId { get; set; }
    public string Name { get; set; } = "";
    public string? TabName { get; set; }
    public string? DefaultContent { get; set; }
    public string StylesJson { get; set; } = "{}";
    public int? DefaultWidth { get; set; }
    public int? DefaultHeight { get; set; }
    public int Order { get; set; }
    public ToolItem ToolItem { get; set; } = null!;
}
