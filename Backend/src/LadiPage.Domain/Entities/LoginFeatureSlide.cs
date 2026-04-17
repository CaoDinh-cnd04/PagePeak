namespace LadiPage.Domain.Entities;

/// <summary>
/// Slide giới thiệu tính năng hiển thị bên trái trang đăng nhập/đăng ký.
/// Thay thế defaultLoginFeatureSlides hardcode trong loginFeatureSlides.ts.
/// </summary>
public class LoginFeatureSlide
{
    public int Id { get; set; }
    public string SlideId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    /// <summary>drag | template | publish | lead | analytics | seo</summary>
    public string? Icon { get; set; }
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
}
