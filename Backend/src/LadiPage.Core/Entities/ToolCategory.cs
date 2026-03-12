namespace LadiPage.Core.Entities;

public class ToolCategory
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string Icon { get; set; } = "";
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<ToolItem> Items { get; set; } = new List<ToolItem>();
}
