namespace LadiPage.Core.Entities;

public class PageElement
{
    public long Id { get; set; }
    public long SectionId { get; set; }
    public string Type { get; set; } = "text";
    public int Order { get; set; }

    public int X { get; set; }
    public int Y { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int ZIndex { get; set; }
    public double Rotation { get; set; }
    public double Opacity { get; set; } = 1.0;
    public bool IsLocked { get; set; }
    public bool IsHidden { get; set; }

    public string? Content { get; set; }
    public string? Href { get; set; }
    public string? Target { get; set; }
    public string? ImageUrl { get; set; }
    public string? VideoUrl { get; set; }

    public string StylesJson { get; set; } = "{}";

    public PageSection Section { get; set; } = null!;
}
