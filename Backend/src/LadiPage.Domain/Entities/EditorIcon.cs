namespace LadiPage.Domain.Entities;

/// <summary>
/// Biểu tượng trong editor (social icons, icon ký tự, mũi tên, hoa văn).
/// Thay thế ICON_DATA hardcode trong iconData.ts.
/// </summary>
public class EditorIcon
{
    public int Id { get; set; }
    public string IconId { get; set; } = "";
    public string Name { get; set; } = "";
    /// <summary>socials | icons | arrows | pattern</summary>
    public string Category { get; set; } = "";
    /// <summary>Ký tự Unicode hoặc emoji đại diện</summary>
    public string Char { get; set; } = "";
    public string? Color { get; set; }
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
}
