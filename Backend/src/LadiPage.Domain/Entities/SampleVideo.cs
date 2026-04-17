namespace LadiPage.Domain.Entities;

/// <summary>
/// Video mẫu trong Video Picker Panel của editor.
/// Thay thế SAMPLE_VIDEOS hardcode trong VideoPickerPanel.tsx.
/// </summary>
public class SampleVideo
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string EmbedUrl { get; set; } = "";
    public string ThumbnailUrl { get; set; } = "";
    /// <summary>youtube | vimeo | other</summary>
    public string Source { get; set; } = "youtube";
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
}
