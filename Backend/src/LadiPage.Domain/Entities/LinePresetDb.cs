namespace LadiPage.Domain.Entities;

/// <summary>
/// Mẫu đường kẻ trong Line Picker Panel của editor.
/// Thay thế LINE_PRESETS hardcode trong lineData.ts.
/// </summary>
public class LinePresetDb
{
    public int Id { get; set; }
    public string PresetId { get; set; } = "";
    public string Name { get; set; } = "";
    /// <summary>solid | dashed | dotted | double</summary>
    public string Style { get; set; } = "solid";
    public string Color { get; set; } = "#000000";
    public int Thickness { get; set; } = 2;
    /// <summary>JSON array e.g. [8,4] — null nếu solid/double</summary>
    public string? DashArrayJson { get; set; }
    /// <summary>line | pen (tab trong Line Picker)</summary>
    public string Tab { get; set; } = "line";
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
}
