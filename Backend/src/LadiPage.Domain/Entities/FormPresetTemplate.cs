namespace LadiPage.Domain.Entities;

/// <summary>
/// Lưu trữ các mẫu form (form presets) trong database thay vì hardcode trong frontend.
/// Tương đương với dữ liệu trong formData.ts (FORM_PRESETS).
/// </summary>
public class FormPresetTemplate
{
    public long Id { get; set; }

    /// <summary>Slug duy nhất, ví dụ: "contact-outlined", "checkout-flash-gradient"</summary>
    public string PresetId { get; set; } = "";

    public string Name { get; set; } = "";

    /// <summary>Loại form: contact, registration, login, otp, checkout</summary>
    public string FormType { get; set; } = "";

    /// <summary>Tên tab hiển thị trong Form Picker</summary>
    public string TabName { get; set; } = "";

    public string Title { get; set; } = "";
    public string ButtonText { get; set; } = "";

    /// <summary>JSON array của FormField[]</summary>
    public string FieldsJson { get; set; } = "[]";

    /// <summary>filled | outlined | underlined</summary>
    public string? InputStyle { get; set; }

    public int Width { get; set; }
    public int Height { get; set; }

    public string? ButtonColor { get; set; }
    public string? ButtonTextColor { get; set; }
    public string? BackgroundColor { get; set; }
    public int? FormBorderRadius { get; set; }
    public string? TitleColor { get; set; }
    public int? InputRadius { get; set; }
    public string? AccentColor { get; set; }

    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
