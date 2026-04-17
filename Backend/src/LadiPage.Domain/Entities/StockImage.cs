namespace LadiPage.Domain.Entities;

/// <summary>
/// Ảnh mẫu có sẵn trong Image Picker Panel.
/// Thay thế STOCK_IMAGES hardcode trong ImagePickerPanel.tsx.
/// Ngoài ra frontend còn gọi Pexels API (tìm kiếm real-time) qua backend proxy.
/// </summary>
public class StockImage
{
    public int Id { get; set; }
    public string Url { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public int Width { get; set; } = 800;
    public int Height { get; set; } = 600;
    public string? Author { get; set; }
    public string? AuthorUrl { get; set; }
    /// <summary>unsplash | pexels | pixabay | other</summary>
    public string Source { get; set; } = "unsplash";
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
}
