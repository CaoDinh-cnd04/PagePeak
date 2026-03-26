namespace LadiPage.Domain.Entities;

/// <summary>Liên kết Trang ↔ Nhãn (nhiều-nhiều).</summary>
public class PageTag
{
    public long PageId { get; set; }
    public long TagId { get; set; }

    public Page Page { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
