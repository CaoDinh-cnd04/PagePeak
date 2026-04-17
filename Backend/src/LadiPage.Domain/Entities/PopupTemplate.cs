namespace LadiPage.Domain.Entities;

/// <summary>
/// Lưu trữ các mẫu popup trong database thay vì hardcode trong popupTemplateCatalog.ts.
/// </summary>
public class PopupTemplate
{
    public long Id { get; set; }

    /// <summary>Slug duy nhất, ví dụ: "promo-bar-dark", "lucky-spin"</summary>
    public string TemplateId { get; set; } = "";

    public string Name { get; set; } = "";

    /// <summary>Category: sticky, promotion, lucky, upsell, contact, giveaway, thankyou, floating, content, subscribe</summary>
    public string Category { get; set; } = "";

    public string? ThumbnailUrl { get; set; }

    /// <summary>JSON string nội dung popup (title, body, templateId, category)</summary>
    public string ContentJson { get; set; } = "{}";

    public int Width { get; set; }
    public int Height { get; set; }

    /// <summary>JSON object chứa styles (backgroundColor, color, borderRadius, v.v.)</summary>
    public string StylesJson { get; set; } = "{}";

    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
